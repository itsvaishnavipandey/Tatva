from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

import pandas as pd
import chromadb
import google.generativeai as genai
import numpy as np
import json
import os
import base64
from dotenv import load_dotenv

from optical.optical_model import (
    train_optical_model,
    predict_optical,
    predict_optical_all,
    get_model_metrics,
    models_ready,
)
from ald.ald_router import router as ald_router
import threading

# ==========================================
# LOAD ENV
# ==========================================

load_dotenv()

# ==========================================
# FASTAPI APP
# ==========================================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# INCLUDE ALD ROUTER
# ==========================================

app.include_router(ald_router)

# ==========================================
# LOAD SPUTTERING CSV
# ==========================================

df_sputtering = pd.read_csv("sputtering_database_clean_final.csv")

# ==========================================
# LOAD FERROELECTRIC CSV
# ==========================================

try:
    df_ferro = pd.read_csv("ferroelectric/ferroelectric_database.csv")
    numeric_cols = [
        "a","b","c","alpha","beta","gamma","volume","density",
        "band_gap","formation_energy","energy_above_hull",
        "Remnant polarization","Coercive field","Film thickness (nm)"
    ]
    for col in numeric_cols:
        if col in df_ferro.columns:
            df_ferro[col] = pd.to_numeric(df_ferro[col], errors="coerce")
    print(f"✅ Loaded {len(df_ferro)} ferroelectric materials")
except Exception as e:
    print(f"⚠️  Ferroelectric CSV load failed: {e}")
    df_ferro = pd.DataFrame()

# ==========================================
# LOAD VECTOR DATABASE
# ==========================================

DB_PATH = "./vector_database"
chroma_client = chromadb.PersistentClient(path=DB_PATH)
collection = chroma_client.get_collection(name="sputtering_papers")

# ==========================================
# MODEL NAME
# ==========================================

MODEL_NAME = "gemini-2.5-flash"

# ==========================================
# KEYWORD TREND CONFIG
# ==========================================

FILE_MAP = {
    "Fine-grained (0.5 threshold, ~9000)": "labeled_clusters_dt0.5.json",
    "Moderate (1.0 threshold, ~3000)":     "labeled_clusters_dt1.json",
    "Broad (1.5 threshold, ~1600)":        "labeled_clusters_dt1.5.json"
}

DATA_DIR = "./labeled_cluster_results"
cluster_data = {}

for label, file in FILE_MAP.items():
    path = os.path.join(DATA_DIR, file)
    with open(path, "r", encoding="utf-8") as f:
        cluster_data[label] = json.load(f)

# ==========================================
# FERROELECTRIC ML MODEL
# ==========================================

ferro_pipeline = None

def train_ferro_model():
    global ferro_pipeline
    try:
        from sklearn.pipeline import Pipeline
        from sklearn.compose import ColumnTransformer
        from sklearn.preprocessing import StandardScaler, OneHotEncoder, PolynomialFeatures, FunctionTransformer
        from sklearn.impute import SimpleImputer
        from xgboost import XGBRegressor

        num_feats = ["a","b","c","alpha","beta","gamma","volume","density",
                     "band_gap","formation_energy","energy_above_hull"]
        cat_feats = ["crystal_system"]

        train_df = df_ferro.dropna(subset=["Coercive field"])
        X = train_df[num_feats + cat_feats]
        y = np.log1p(train_df["Coercive field"])

        numeric_pipeline = Pipeline([
            ("log",     FunctionTransformer(np.log1p, validate=False)),
            ("imputer", SimpleImputer(strategy="median")),
            ("poly",    PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)),
            ("scale",   StandardScaler()),
        ])

        pre = ColumnTransformer([
            ("num", numeric_pipeline, num_feats),
            ("cat", OneHotEncoder(handle_unknown="ignore", drop="first"), cat_feats),
        ])

        ferro_pipeline = Pipeline([
            ("pre", pre),
            ("xgb", XGBRegressor(
                objective="reg:squarederror",
                n_estimators=300, max_depth=5,
                learning_rate=0.1, subsample=0.8,
                colsample_bytree=0.8, reg_alpha=0.1,
                random_state=42,
            ))
        ])
        ferro_pipeline.fit(X, y)
        print("✅ XGBoost model trained")
    except Exception as e:
        print(f"⚠️  Model training skipped: {e}")

if not df_ferro.empty:
    train_ferro_model()

# ==========================================
# OPTICAL ML MODEL
# ==========================================

def _train_optical_background():
    try:
        train_optical_model()
    except Exception as e:
        print(f"⚠️  Optical model training failed: {e}")

threading.Thread(target=_train_optical_background, daemon=True).start()
print("🚀 Optical models training in background — other endpoints are available immediately.")

# ==========================================
# CRYSTAL SYSTEM ENCODING (fallback)
# ==========================================

CRYSTAL_SYSTEM_MAP = {
    "Triclinic":0,"Monoclinic":1,"Tetragonal":2,
    "Orthorhombic":3,"Rhombohedral":4,"Hexagonal":5,"Cubic":6
}

# ==========================================
# REQUEST MODELS
# ==========================================

class Question(BaseModel):
    question: str
    apiKey: str

class KeywordRequest(BaseModel):
    keyword: str
    granularity: str

class FemPredictRequest(BaseModel):
    a: float = 5.0
    b: float = 5.0
    c: float = 5.0
    alpha: float = 90.0
    beta: float = 90.0
    gamma: float = 90.0
    volume: float = 125.0
    density: float = 6.0
    band_gap: float = 3.0
    formation_energy: float = -3.5
    energy_above_hull: float = 0.05
    crystal_system: str = "Tetragonal"

class FemExtractRequest(BaseModel):
    abstract: str
    api_key: str = ""

class RCSimRequest(BaseModel):
    sequence: list
    thicknesses: list

class RCRequest(BaseModel):
    sequence: list
    pop: int = 30
    generations: int = 40
    api_key: str = ""

class OpticalPredictRequest(BaseModel):
    features: dict
    model: str = "neural_net"   # "xgboost" | "histgb" | "neural_net" | "random_forest" | "all"

# ==========================================
# COLUMN CANDIDATE LISTS
# ==========================================

POWER_COLS       = ["Power (W)", "Power(W)", "power_W", "Power", "Sputtering Power (W)",
                    "RF Power (W)", "DC Power (W)", "Power_W", "Target Power (W)",
                    "Applied Power (W)", "Discharge Power (W)"]
TEMP_COLS        = ["Substrate Temperature (°C)", "Temperature (°C)", "Temp (°C)", "temperature_C",
                    "Substrate Temp (°C)", "Deposition Temperature (°C)", "Temperature",
                    "Temperature_C", "Sub. Temp (°C)", "Ts (°C)", "T_sub (°C)"]
PRESSURE_COLS    = ["Working Pressure (Pa)", "Pressure (Pa)", "pressure_Pa", "Working Pressure",
                    "Deposition Pressure (Pa)", "Base Pressure (Pa)", "Pressure",
                    "Working_Pressure_Pa", "Chamber Pressure (Pa)", "Total Pressure (Pa)",
                    "Ar Pressure (Pa)"]
RATE_COLS        = ["Deposition Rate (nm/min)", "Rate (nm/min)", "deposition_rate",
                    "Growth Rate (nm/min)", "Dep. Rate (nm/min)", "Deposition Rate",
                    "Deposition_Rate_nm_min", "Film Growth Rate (nm/min)", "Rate(nm/min)"]
SUBSTRATE_COLS   = ["Substrate", "substrate", "Substrate Material", "Substrate Type",
                    "Sub.", "Substrate_Type"]
GAS_COLS         = ["Gas", "gas", "Gas Atmosphere", "Sputtering Gas", "Working Gas",
                    "Atmosphere", "Gas_Atmosphere", "Ar Flow", "Gas Composition"]
MATERIAL_COLS    = ["Material", "material", "Target Material", "Film Material", "Compound",
                    "Material_Name", "Film", "Target", "Chemical Formula"]

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def _find_col(df: pd.DataFrame, candidates: list) -> str | None:
    for c in candidates:
        if c in df.columns:
            return c
    lower_map = {col.lower(): col for col in df.columns}
    for c in candidates:
        if c.lower() in lower_map:
            return lower_map[c.lower()]
    return None


def safe_stats(series: pd.Series) -> dict | None:
    s = pd.to_numeric(series, errors="coerce").dropna()
    if s.empty:
        return None
    return {
        "mean":   float(s.mean()),
        "median": float(s.median()),
        "std":    float(s.std()),
        "min":    float(s.min()),
        "max":    float(s.max()),
        "count":  int(s.count()),
    }


def distribution(series: pd.Series, bins: int = 20) -> dict | None:
    """Return histogram counts + edges plus summary stats."""
    s = pd.to_numeric(series, errors="coerce").dropna()
    if s.empty:
        return None
    counts, edges = np.histogram(s, bins=bins)
    mode_val = float(s.mode().iloc[0]) if not s.mode().empty else None
    return {
        "counts": counts.tolist(),
        "edges":  [round(float(e), 4) for e in edges.tolist()],
        "mean":   round(float(s.mean()), 4),
        "median": round(float(s.median()), 4),
        "mode":   round(mode_val, 4) if mode_val is not None else None,
        "min":    round(float(s.min()), 4),
        "max":    round(float(s.max()), 4),
        "std":    round(float(s.std()), 4),
        "count":  int(s.count()),
        # Box-plot whiskers (IQR)
        "q1":     round(float(s.quantile(0.25)), 4),
        "q3":     round(float(s.quantile(0.75)), 4),
    }


def top_values(series: pd.Series, n: int = 6) -> list:
    s = series.dropna().astype(str).str.strip()
    s = s[s != ""]
    if s.empty:
        return []
    return s.value_counts().head(n).index.tolist()


def substrate_counts(series: pd.Series, n: int = 10) -> list:
    """Return [{name, count}] for bar chart."""
    s = series.dropna().astype(str).str.strip()
    s = s[s != ""]
    if s.empty:
        return []
    vc = s.value_counts().head(n)
    return [{"name": k, "count": int(v)} for k, v in vc.items()]

# ==========================================
# TEST ROUTE (GET)
# ==========================================

@app.get("/")
async def home():
    return {"message": "Material Intelligence Backend Running"}


# ==========================================
# DEBUG: LIST ALL COLUMNS
# ==========================================

@app.get("/api/sputtering/columns")
async def get_columns():
    """Debug endpoint — returns exact column names from the CSV."""
    return {
        "columns": df_sputtering.columns.tolist(),
        "shape":   list(df_sputtering.shape),
        "sample_materials": df_sputtering[
            _find_col(df_sputtering, MATERIAL_COLS) or df_sputtering.columns[0]
        ].dropna().unique()[:30].tolist()
    }

# ==========================================
# ROOT PHENOTYPING ENDPOINT (POST /)
# ==========================================

@app.post("/", response_class=HTMLResponse)
async def analyze_root(
    image: UploadFile = File(...),
    scale_factor: float = Form(0.066)
):
    try:
        import cv2
        from skimage.morphology import skeletonize

        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image. Use PNG or JPG.")

        _, binary = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        skel = skeletonize(binary // 255).astype(np.uint8) * 255
        trl_px  = int(np.sum(skel > 0))
        trl_mm  = round(trl_px * scale_factor, 2)

        coords = np.argwhere(binary > 0)
        if len(coords):
            y_min, y_max = int(coords[:, 0].min()), int(coords[:, 0].max())
            depth_px = y_max - y_min
            depth_mm = round(depth_px * scale_factor, 2)
        else:
            depth_px = 1
            depth_mm = 0.0

        tortuosity = round(trl_px / max(depth_px, 1) * scale_factor, 4)

        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        hull_mm2 = 0.0
        if contours:
            all_pts = np.concatenate(contours)
            hull    = cv2.convexHull(all_pts)
            hull_mm2 = round(cv2.contourArea(hull) * (scale_factor ** 2), 2)

        _, buf    = cv2.imencode(".png", binary)
        mask_b64  = base64.b64encode(buf).decode("utf-8")
        mask_src  = f"data:image/png;base64,{mask_b64}"

        html = f"""<html><body>
<p>Total Root Length: {trl_mm} mm</p>
<p>Root Depth: {depth_mm} mm</p>
<p>Tortuosity: {tortuosity}</p>
<p>Convex Hull: {hull_mm2} mm²</p>
<img src="{mask_src}" />
</body></html>"""

        return HTMLResponse(content=html)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# SPUTTERING AI ENDPOINT
# ==========================================

@app.post("/ask")
async def ask_ai(data: Question):
    try:
        genai.configure(api_key=data.apiKey)
        llm = genai.GenerativeModel(MODEL_NAME)

        results = collection.query(query_texts=[data.question], n_results=5)
        context = "\n\n".join(results['documents'][0])

        prompt = f"""You are an expert materials science AI assistant.
Use ONLY the provided database context.
Context: {context}
User Question: {data.question}"""

        response = llm.generate_content(prompt)
        sources = "\n\n📚 Sources:\n" + "".join(
            f"- {m['Paper_ID']} ({m['Material']})\n"
            for m in results['metadatas'][0]
        )
        return {"answer": response.text + sources}
    except Exception as e:
        return {"answer": f"Error: {str(e)}"}

# ==========================================
# KEYWORD TREND ENDPOINT
# ==========================================

@app.post("/keyword-trend")
async def keyword_trend(data: KeywordRequest):
    try:
        selected_data = cluster_data[data.granularity]
        matched = [kw for kw in selected_data if data.keyword.lower() in kw.lower()]

        if not matched:
            return {"answer": "Keyword not found."}

        selected_keyword = matched[0]
        year_counts = {y: c for y, c in selected_data[selected_keyword].items() if y != "2019"}
        latest_year = max(year_counts.keys())

        top_keywords = sorted(
            [{"keyword": kw, "count": int(selected_data[kw].get(latest_year, 0))}
             for kw in selected_data],
            key=lambda x: x["count"], reverse=True
        )[:10]

        return {
            "keyword": selected_keyword,
            "yearCounts": year_counts,
            "topKeywords": top_keywords,
            "matchedKeywords": matched[:20]
        }
    except Exception as e:
        return {"answer": f"Error: {str(e)}"}

# ==========================================
# AI MATERIAL FAMILY GROUPING
# ==========================================

@app.get("/api/sputtering/group")
async def group_material(material: str, api_key: str = ""):
    """
    Use Gemini to identify all variants of a material family in the dataset,
    then filter the CSV to rows that belong to that family.
    Falls back to simple substring match if no API key.
    """
    mat_col = _find_col(df_sputtering, MATERIAL_COLS)
    if mat_col is None:
        raise HTTPException(500, "Could not find a material column in the dataset.")

    all_materials = df_sputtering[mat_col].dropna().astype(str).str.strip().unique().tolist()

    if api_key:
        try:
            genai.configure(api_key=api_key)
            llm = genai.GenerativeModel(MODEL_NAME)
            prompt = f"""You are a materials science expert.
Given the material family "{material}", identify ALL matching variants from the list below.
Include doped versions, compound names, formula variants, and alternate spellings.
Return ONLY a valid JSON array of matching strings — no explanation, no markdown.

Material list:
{json.dumps(all_materials[:600])}"""
            resp = llm.generate_content(prompt)
            raw = resp.text.strip().replace("```json", "").replace("```", "").strip()
            grouped = json.loads(raw)
            grouped = [g for g in grouped if isinstance(g, str)]
            return {"grouped_materials": grouped, "count": len(grouped)}
        except Exception as e:
            print(f"Gemini grouping failed: {e}, falling back to substring match")

    # Fallback: simple substring match
    matched = [m for m in all_materials if material.lower() in m.lower()]
    return {"grouped_materials": matched, "count": len(matched)}


# ==========================================
# SPUTTERING DATASET ANALYTICS ENDPOINT
# ==========================================

@app.get("/api/sputtering/analytics")
async def sputtering_analytics(material: str, grouped_materials: str = ""):
    """
    Returns full distribution data (histogram counts + stats) for all parameters.
    Accepts an optional comma-separated list of grouped_materials for AI-grouped search.
    """
    if not material.strip():
        raise HTTPException(400, "material query cannot be empty")

    mat_col = _find_col(df_sputtering, MATERIAL_COLS)
    if mat_col is None:
        raise HTTPException(500, "Could not find a material column in the dataset.")

    # Use grouped materials list if provided, otherwise substring match
    if grouped_materials:
        variants = [v.strip() for v in grouped_materials.split("|||") if v.strip()]
        mask = df_sputtering[mat_col].astype(str).isin(variants)
    else:
        mask = df_sputtering[mat_col].astype(str).str.contains(
            material.strip(), case=False, na=False
        )

    df_mat = df_sputtering[mask].copy()

    if df_mat.empty:
        raise HTTPException(404, f"No records found for material '{material}'.")

    power_col     = _find_col(df_mat, POWER_COLS)
    temp_col      = _find_col(df_mat, TEMP_COLS)
    pressure_col  = _find_col(df_mat, PRESSURE_COLS)
    rate_col      = _find_col(df_mat, RATE_COLS)
    substrate_col = _find_col(df_mat, SUBSTRATE_COLS)
    gas_col       = _find_col(df_mat, GAS_COLS)

    return {
        "material":               material.strip(),
        "record_count":           int(len(df_mat)),
        # Full distribution objects with histogram + box-plot data
        "power_W":                distribution(df_mat[power_col])    if power_col    else None,
        "temperature_C":          distribution(df_mat[temp_col])     if temp_col     else None,
        "pressure_Pa":            distribution(df_mat[pressure_col]) if pressure_col else None,
        "deposition_rate_nm_min": distribution(df_mat[rate_col])     if rate_col     else None,
        # Substrate bar chart data
        "substrate_counts":       substrate_counts(df_mat[substrate_col]) if substrate_col else [],
        "top_substrates":         top_values(df_mat[substrate_col])       if substrate_col else [],
        "top_gases":              top_values(df_mat[gas_col])             if gas_col       else [],
        # Which columns were actually found (for debugging)
        "_found_cols": {
            "power": power_col, "temp": temp_col,
            "pressure": pressure_col, "rate": rate_col,
            "substrate": substrate_col, "gas": gas_col,
        }
    }

# ==========================================
# FERROELECTRIC ENDPOINTS
# ==========================================

@app.post("/api/fem/predict")
async def fem_predict(data: FemPredictRequest):
    try:
        if ferro_pipeline is not None:
            input_df = pd.DataFrame([data.dict()])
            log_pred = ferro_pipeline.predict(input_df)[0]
            prediction = float(np.expm1(log_pred))
        else:
            cs = CRYSTAL_SYSTEM_MAP.get(data.crystal_system, 0)
            prediction = round(abs(
                data.band_gap * 180 + data.formation_energy * -40 +
                data.a * 12 + cs * 85
            ), 1)
        return {"predicted_coercive_field_kVcm": round(prediction, 2)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/fem/extract")
async def fem_extract(data: FemExtractRequest):
    try:
        if not data.api_key:
            raise HTTPException(400, "API key is required.")
        if not data.abstract.strip():
            raise HTTPException(400, "Abstract cannot be empty.")

        genai.configure(api_key=data.api_key)
        llm = genai.GenerativeModel(MODEL_NAME)

        prompt = f"""You are a materials science data extraction expert.
Extract the following fields from the abstract below.
Return ONLY a valid JSON object with exactly these keys:
material, substrate, remnant_polarization_uC_cm2, coercive_field_kV_cm,
film_thickness_nm, crystal_system, space_group, doi, notes
Set missing values to null. No markdown, no explanation.

Abstract:
{data.abstract}"""

        response = llm.generate_content(prompt)
        raw = response.text.strip().replace("```json","").replace("```","").strip()
        return {"extracted": json.loads(raw)}

    except json.JSONDecodeError:
        raise HTTPException(500, "LLM returned invalid JSON. Try again.")
    except Exception as e:
        raise HTTPException(500, str(e))

# ==========================================
# OPTICAL PREDICT ENDPOINTS
# ==========================================

@app.get("/api/optical/status")
async def optical_status():
    """Frontend polls this to know when the background-trained models are ready."""
    return {"ready": models_ready()}


@app.post("/api/optical/predict")
async def optical_predict(data: OpticalPredictRequest):
    if not models_ready():
        raise HTTPException(status_code=503, detail="Optical models are still training. Try again shortly.")
    try:
        if data.model == "all":
            predictions = predict_optical_all(data.features)
            return {
                "predictions": predictions,           # {model_key: predicted_y}
                "metrics": get_model_metrics(),        # {model_key: {label, mae, rmse, r2, mape, ...}}
            }
        result = predict_optical(data.features, data.model)
        return {"predicted_y": result, "model": data.model}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/optical/models")
async def optical_models():
    """Returns CV metrics for all 4 models — used to populate the comparison
    chart on page load, before the user even hits Predict."""
    if not models_ready():
        return {"metrics": {}, "ready": False}
    try:
        return {"metrics": get_model_metrics(), "ready": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# RADIATIVE COOLING TMM OPTIMIZER
# ==========================================

def n_TiO2(wl):
    wl2 = wl**2
    return np.sqrt(np.abs(1 + 5.913*wl2/(wl2 - 0.2441**2)))

def n_SiO2(wl):
    wl2 = wl**2
    val = 1 + 0.6962*wl2/(wl2-0.0684**2) + 0.4079*wl2/(wl2-0.1162**2) + 0.8975*wl2/(wl2-9.896**2)
    return np.sqrt(np.abs(val))

def n_Al2O3(wl):
    wl2 = wl**2
    val = 1 + 1.4313*wl2/(wl2-0.0726**2) + 0.6505*wl2/(wl2-0.1193**2) + 5.3414*wl2/(wl2-18.028**2)
    return np.sqrt(np.abs(val))

def n_HfO2(wl):  return 1.93 + 0.065/wl**2
def n_ZrO2(wl):  return 2.10 + 0.042/wl**2
def n_Ta2O5(wl): return 2.09 + 0.044/wl**2
def n_MgF2(wl):  return 1.38 + 0.008/wl**2
def n_SiC(wl):   return 2.55 + 0.10/wl**2
def n_Ag(wl):
    eps = -120 + 3.2j*wl
    return np.sqrt(np.abs(eps.real)) * (1 + 0j)

MATERIAL_N = {
    "TiO2":n_TiO2,"SiO2":n_SiO2,"Al2O3":n_Al2O3,
    "HfO2":n_HfO2,"ZrO2":n_ZrO2,"Ta2O5":n_Ta2O5,
    "MgF2":n_MgF2,"SiC":n_SiC,
}
ALLOWED_MATERIALS = list(MATERIAL_N.keys())

def tmm_reflectance(stack, wl_um):
    R = np.zeros(len(wl_um))
    for wi, wl in enumerate(wl_um):
        try:
            ns = [float(np.real(MATERIAL_N[l["material"]](wl))) for l in stack]
            ds = [l["thickness_nm"] * 1e-9 for l in stack]
            n_sub = float(np.real(n_Ag(wl))) if np.real(n_Ag(wl)) > 0 else 10.0

            M = np.eye(2, dtype=complex)
            for n_i, d_i in zip(ns, ds):
                if n_i <= 0: continue
                phi = 2 * np.pi * n_i * d_i / (wl * 1e-6)
                m = np.array([
                    [np.cos(phi), -1j/n_i * np.sin(phi)],
                    [-1j*n_i * np.sin(phi), np.cos(phi)]
                ])
                M = M @ m

            m11,m12,m21,m22 = M[0,0],M[0,1],M[1,0],M[1,1]
            num = (m11 + m12*n_sub)*1.0 - (m21 + m22*n_sub)
            den = (m11 + m12*n_sub)*1.0 + (m21 + m22*n_sub)
            if abs(den) < 1e-12: continue
            r = num / den
            R[wi] = min(abs(r)**2, 1.0)
        except Exception:
            continue
    return np.clip(np.nan_to_num(R, nan=0.0), 0, 1)

def compute_metrics(A, wl_um):
    A = np.nan_to_num(A, nan=0.0)
    solar_mask = (wl_um >= 0.3) & (wl_um <= 2.5)
    ir_mask    = (wl_um >= 8)   & (wl_um <= 13)
    sky_avg   = float(np.mean(A[ir_mask]))    if ir_mask.any()    else 0.0
    solar_avg = float(np.mean(A[solar_mask])) if solar_mask.any() else 0.0
    return sky_avg, solar_avg, sky_avg - 5.0 * solar_avg

def ga_optimize(sequence, pop=30, generations=40):
    import random as pyrandom
    n_layers = len(sequence)
    wl_um = np.linspace(0.3, 15.0, 400)

    def evaluate(thicknesses):
        stack = [{"material":m,"thickness_nm":t*1e9} for m,t in zip(sequence,thicknesses)]
        R = tmm_reflectance(stack, wl_um)
        _,_,fitness = compute_metrics(1-R, wl_um)
        return fitness

    population = [np.random.uniform(50e-9, 500e-9, n_layers) for _ in range(pop)]
    best_t = population[0].copy()
    best_f = evaluate(best_t)
    history = []

    for gen in range(generations):
        scores = [evaluate(ind) for ind in population]
        idx = int(np.argmax(scores))
        if scores[idx] > best_f:
            best_f = scores[idx]
            best_t = population[idx].copy()
        history.append(float(best_f))

        new_pop = [best_t.copy()]
        while len(new_pop) < pop:
            i,j = pyrandom.sample(range(pop), 2)
            p1 = population[i] if scores[i]>scores[j] else population[j]
            i,j = pyrandom.sample(range(pop), 2)
            p2 = population[i] if scores[i]>scores[j] else population[j]
            cp = pyrandom.randint(1, n_layers-1)
            child = np.concatenate([p1[:cp], p2[cp:]])
            for k in range(n_layers):
                if pyrandom.random() < 0.15:
                    child[k] += np.random.normal(0, 60e-9)
            new_pop.append(np.clip(child, 50e-9, 500e-9))
        population = new_pop

    return best_t, best_f, history


@app.post("/api/rc/simulate")
async def rc_simulate(data: RCSimRequest):
    try:
        for m in data.sequence:
            if m not in ALLOWED_MATERIALS:
                raise HTTPException(400, f"Unknown material: {m}")

        wl_um = np.linspace(0.3, 15.0, 600)
        stack = [{"material":m,"thickness_nm":t} for m,t in zip(data.sequence, data.thicknesses)]
        R = tmm_reflectance(stack, wl_um)
        A = np.nan_to_num(1 - R, nan=0.0)
        A = np.clip(A, 0, 1)
        sky, solar, fitness = compute_metrics(A, wl_um)

        return {
            "wl":       [round(x,4) for x in wl_um.tolist()],
            "A":        [round(x,4) for x in A.tolist()],
            "sky_avg":  round(sky,   4),
            "solar_avg":round(solar, 4),
            "fitness":  round(fitness,4),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/rc/optimize")
async def rc_optimize(data: RCRequest):
    try:
        for m in data.sequence:
            if m not in ALLOWED_MATERIALS:
                raise HTTPException(400, f"Unknown material: {m}")

        best_t, best_f, history = ga_optimize(data.sequence, data.pop, data.generations)

        wl_um = np.linspace(0.3, 15.0, 600)
        stack = [{"material":m,"thickness_nm":t*1e9} for m,t in zip(data.sequence, best_t)]
        R = tmm_reflectance(stack, wl_um)
        A = np.nan_to_num(1 - R, nan=0.0)
        A = np.clip(A, 0, 1)
        sky, solar, fitness = compute_metrics(A, wl_um)

        suggestion = None
        if data.api_key:
            try:
                genai.configure(api_key=data.api_key)
                llm = genai.GenerativeModel(MODEL_NAME)
                prompt = f"""You are an expert in radiative cooling multilayer optical design.
Current stack: {data.sequence}
Sky emissivity (8-13µm): {sky:.4f}
Solar absorption (0.3-2.5µm): {solar:.4f}
Suggest ONE improved layer sequence using only: TiO2, SiO2, Al2O3, HfO2, ZrO2, Ta2O5, MgF2, SiC
Output ONLY a comma-separated list. No explanation. Example: TiO2,SiO2,TiO2,SiO2"""
                resp = llm.generate_content(prompt)
                parsed = [x.strip() for x in resp.text.strip().split(",") if x.strip() in ALLOWED_MATERIALS]
                if len(parsed) >= 3:
                    suggestion = parsed
            except Exception:
                pass

        return {
            "optimized_sequence": data.sequence,
            "thicknesses_nm":     [round(t*1e9, 2) for t in best_t],
            "wl":                 [round(x,4) for x in wl_um.tolist()],
            "A":                  [round(x,4) for x in A.tolist()],
            "sky_avg":            round(sky,    4),
            "solar_avg":          round(solar,  4),
            "fitness":            round(fitness,4),
            "history":            [round(h,4) for h in history],
            "gemini_suggestion":  suggestion,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))