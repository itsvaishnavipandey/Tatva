"""
ald_router.py — backend/ald/ald_router.py

Reads paper data directly from MongoDB Atlas (db: ALD_Data, collection: Papers)
— the same database that powers the ald-llamamat Vercel/Next.js app — and maps
it onto the flat schema this FastAPI/React app already expects. No Claude API,
no local extraction, no third-party LLM calls needed.

Falls back to papers_extracted.json / doi_elsevier.csv if MONGODB_URI isn't set.

Requires: pip install pymongo python-dotenv
Set MONGODB_URI in your .env
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import os, json, re, csv
from collections import defaultdict
from dotenv import load_dotenv, find_dotenv

# find .env anywhere up the directory tree from this file
_dotenv_path = find_dotenv(usecwd=False)
if not _dotenv_path:
    # fallback: check script folder and two levels up
    _here_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    _root_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env")
    for _candidate in [_here_env, _root_env]:
        if os.path.exists(_candidate):
            _dotenv_path = _candidate
            break
load_dotenv(_dotenv_path)

router = APIRouter(prefix="/api/ald")
_HERE = os.path.dirname(os.path.abspath(__file__))

MONGODB_URI     = os.getenv("MONGODB_URI")
MONGO_DB_NAME   = os.getenv("MONGO_DB_NAME", "ALD_Data")
MONGO_COLLECTION= os.getenv("MONGO_COLLECTION", "Papers")

# ── loaders (CSV/JSON fallback only) ──────────────────────────────────────────
def _csv(fname):
    path = os.path.join(_HERE, fname)
    if not os.path.exists(path):
        print(f"[ALD] WARNING: {fname} not found"); return []
    rows = []
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        for r in csv.DictReader(f): rows.append(dict(r))
    print(f"[ALD] {fname}: {len(rows)} rows"); return rows

def _jload(fname):
    path = os.path.join(_HERE, fname)
    if not os.path.exists(path): return None
    with open(path, encoding="utf-8") as f: return json.load(f)

# ── material helpers ───────────────────────────────────────────────────────────
_MAT_LIST = [
    "Al2O3","TiO2","HfO2","ZnO","ZrO2","SiO2","SnO2","In2O3","NiO","Ta2O5",
    "Fe2O3","Ga2O3","MgO","CeO2","V2O5","WO3","MoO3","CuO","Cu2O","La2O3",
    "Y2O3","Gd2O3","Er2O3","Nb2O5","RuO2","IrO2","Co3O4","CoO",
    "AlN","TiN","GaN","InN","SiN","TaN","WN","MoN","NbN","BN","Ta3N5","Si3N4",
    "MoS2","WS2","SnS","SnS2","ZnS","CdS","In2S3","PbS","ZnSe","CdSe","CdTe",
    "MoSe2","WSe2","Sb2Te3","GeTe",
    "Ru","Pt","Cu","Ir","W","Co","Ni","Pd","Au","Ag","Ti","Ta","Mo","Nb",
    "GaAs","InAs","InP","AlAs","SrTiO3","BiFeO3",
    "Hf0.5Zr0.5O2","HZO","HfAlO","LaAlO3","AlF3","LiF","MgF2","SiC","VO2","Si","Ge",
]
_CLASS_RULES = [
    ("Nitride",       ["AlN","TiN","GaN","InN","TaN","WN","MoN","NbN","BN","Si3N4","SiN","Ta3N5"]),
    ("Sulfide",       ["MoS2","WS2","SnS","ZnS","CdS","In2S3","PbS","SnS2"]),
    ("Chalcogenide",  ["MoSe2","WSe2","ZnSe","CdSe","CdTe","GeTe","Sb2Te3"]),
    ("Pure Metal",    ["Ru","Pt","Cu","Ir","W","Co","Ni","Pd","Au","Ag","Ti","Ta","Mo","Nb"]),
    ("III-V Compound",["GaAs","InAs","InP","AlAs","GaP"]),
    ("Fluoride",      ["AlF3","LiF","MgF2","CaF2"]),
]

def _gf(title):
    for m in _MAT_LIST:
        if m in (title or ""): return m
    h = re.search(r'\b([A-Z][a-z]?\d*){2,4}\b', title or "")
    return h.group(0) if h else "Other"

def _gc(f):
    for cls, lst in _CLASS_RULES:
        if any(p in f for p in lst): return cls
    return "Oxide"

# ── MongoDB → flat schema mapping ─────────────────────────────────────────────
def _chem_names(lst):
    out = []
    for item in lst or []:
        if isinstance(item, dict):
            name = item.get("abbreviation") or item.get("full_name")
            if name: out.append(name)
        elif isinstance(item, str):
            out.append(item)
    return out

def _map_mongo_doc(doc, i):
    summary   = doc.get("summary", {}) or {}
    tmat      = (doc.get("target_material", {}) or {}).get("target_material", {}) or {}
    substrate = doc.get("substrate_info", {}) or {}
    depo      = doc.get("deposition_conditions", {}) or {}
    prec_co   = doc.get("precursor_coreactant", {}) or {}
    reaction  = doc.get("reaction_conditions", {}) or {}
    film      = doc.get("film_properties", {}) or {}
    char      = doc.get("characterization", {}) or {}

    formula = (
        tmat.get("chemical_formula")
        or tmat.get("material_name")
        or summary.get("target_material")
        or _gf(doc.get("label", ""))
        or "Other"
    )
    temp_c   = depo.get("deposition_temperature_C")
    temp_str = f"{temp_c}°C" if temp_c not in (None, "") else (summary.get("temperature_range") or "")

    crystal_phase  = film.get("crystal_phase")
    crystal_phases = [crystal_phase] if crystal_phase else []

    return {
        "id":            doc.get("id") or f"PAPER_{i:04d}",
        "index":         i,
        "title":         doc.get("label") or formula,
        "title_raw":     doc.get("label") or formula,
        "publication":   "",
        "date":          "",
        "doi":           "",
        "formula":       formula,
        "material_class":tmat.get("material_class") or _gc(formula),
        "material_name": tmat.get("material_name") or formula,
        "method_type":   summary.get("process_type") or "ALD",
        "temp":          temp_str,
        "methods":       1,
        "abstract":      summary.get("summary") or "",
        "precursors":    _chem_names(prec_co.get("precursors")),
        "coreactants":   _chem_names(prec_co.get("coreactants")),
        "crystal_phases":crystal_phases,
        "substrate":     substrate.get("substrate_material") or "",
        "thickness_nm":  str(film.get("film_thickness_nm") or ""),
        "surface_mechanism": reaction.get("surface_mechanism_description") or "",
        "characterization_methods": char.get("characterization_methods") or [],
        "process_type":  "batch",
        "data_completeness": 75,
        "intermediate_species": reaction.get("intermediate_species") or [],
        "pulse_time_prec": depo.get("precursor_pulse_time_s") or 0.1,
        "pulse_time_core": depo.get("coreactant_pulse_time_s") or 0.1,
        "purge_time":    depo.get("purge_time_s") or 0.1,
        "is_oa":         False,
        "oa_status":     "",
        "oa_url":        doc.get("pdf_url") or "",
        "host_type":     "",
    }

# ── load papers ────────────────────────────────────────────────────────────────
_PAPERS: list = []
_source = "none"

if MONGODB_URI:
    print(f"[ALD] Connecting to MongoDB... (URI starts with: {MONGODB_URI[:30]}...)")
    try:
        from pymongo import MongoClient
        _client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
            tls=True,
            retryWrites=True,
        )
        _client.admin.command("ping")
        _db   = _client[MONGO_DB_NAME]
        _coll = _db[MONGO_COLLECTION]
        _docs = list(_coll.find({}))
        _PAPERS = [_map_mongo_doc(d, i) for i, d in enumerate(_docs)]
        _source = "mongodb"
        print(f"[ALD] ✅ Loaded {len(_PAPERS)} papers from MongoDB ({MONGO_DB_NAME}.{MONGO_COLLECTION})")
    except Exception as e:
        print(f"[ALD] ⚠️  MongoDB connection failed ({e}). Falling back to local files.")
else:
    print("[ALD] MONGODB_URI not set — skipping MongoDB, using local files.")

if not _PAPERS:
    extracted = _jload("papers_extracted.json")
    if extracted:
        print(f"[ALD] Loaded papers_extracted.json ({len(extracted)} papers — local fallback mode)")
        _source = "json"
        for i, p in enumerate(extracted):
            formula = p.get("formula") or _gf(p.get("title_raw") or p.get("title",""))
            _PAPERS.append({
                **p,
                "formula":        formula,
                "material_class": p.get("material_class") or _gc(formula),
            })
    else:
        print("[ALD] ⚠️  No MongoDB URI and no papers_extracted.json — no papers loaded.")

print(f"[ALD] Total papers: {len(_PAPERS)} (source: {_source})")

# ── indexes ───────────────────────────────────────────────────────────────────
_MAT_MAP: dict = {}
for p in _PAPERS:
    f = p["formula"]
    if f not in _MAT_MAP:
        _MAT_MAP[f] = {"formula":f,"name":p["material_name"],"material_class":p["material_class"],"paper_count":0}
    _MAT_MAP[f]["paper_count"] += 1

_MATERIALS = sorted(_MAT_MAP.values(), key=lambda m: -m["paper_count"])

_BY_F: dict = defaultdict(list)
for p in _PAPERS:
    _BY_F[p["formula"]].append(p)

# ── archive builder ───────────────────────────────────────────────────────────
def _archive(formula, papers):
    temps,prec_all,core_all,phase_all,char_all,methods_total = [],[],[],[],[],0
    for p in papers:
        methods_total += int(p.get("methods") or 1)
        t = re.findall(r"\d+", str(p.get("temp","")))
        if t: temps.append(int(t[0]))
        prec_all  += [x for x in p.get("precursors",[])               if x]
        core_all  += [x for x in p.get("coreactants",[])              if x]
        phase_all += [x for x in p.get("crystal_phases",[])           if x]
        char_all  += [x for x in p.get("characterization_methods",[]) if x]
    avg_t = int(sum(temps)/len(temps)) if temps else 0
    def _cnt(lst):
        d = defaultdict(int)
        for v in lst: d[v] += 1
        return [{"name":k,"count":v} for k,v in sorted(d.items(), key=lambda x:-x[1])]
    bins = [(50,99),(100,149),(150,199),(200,249),(250,299),(300,349),(350,399),(400,449),(450,499),(500,999)]
    return {
        "formula": formula,
        "stats": {
            "papers":           len(papers),
            "avg_temp":         avg_t,
            "reported_temps":   len(temps),
            "methods":          methods_total or len(papers),
            "precursors_count": len(prec_all),
            "coreactants_count":len(core_all),
        },
        "precursors":        _cnt(prec_all)[:8],
        "coreactants":       _cnt(core_all)[:6],
        "crystal_phases":    _cnt(phase_all)[:6],
        "characterization":  _cnt(char_all)[:10],
        "temp_dist":  [sum(1 for t in temps if a<=t<=b) for a,b in bins],
        "temp_labels":[f"{a}-{b}" for a,b in bins],
        "precursor_per_paper":[
            {"name":"0 precursors", "count":sum(1 for p in papers if not p.get("precursors"))},
            {"name":"1 precursor",  "count":sum(1 for p in papers if len(p.get("precursors",[]))==1)},
            {"name":"2 precursors", "count":sum(1 for p in papers if len(p.get("precursors",[]))==2)},
            {"name":"3+ precursors","count":sum(1 for p in papers if len(p.get("precursors",[]))>=3)},
        ],
        "coreactant_per_paper":[
            {"name":"0 coreactants", "count":sum(1 for p in papers if not p.get("coreactants"))},
            {"name":"1 coreactant",  "count":sum(1 for p in papers if len(p.get("coreactants",[]))==1)},
            {"name":"2 coreactants", "count":sum(1 for p in papers if len(p.get("coreactants",[]))==2)},
            {"name":"3+ coreactants","count":sum(1 for p in papers if len(p.get("coreactants",[]))>=3)},
        ],
        "papers": papers,
    }

# ── routes ────────────────────────────────────────────────────────────────────
@router.get("/stats")
def stats():
    return {
        "total_materials": len(_MATERIALS),
        "total_papers":    len(_PAPERS),
        "oa_papers":       sum(1 for p in _PAPERS if p["is_oa"]),
        "source":          _source,
    }

@router.get("/materials")
def list_materials(
    search: Optional[str] = Query(None),
    page:   int           = Query(1,  ge=1),
    limit:  int           = Query(50, ge=1, le=200),
):
    data = _MATERIALS
    if search:
        q = search.lower()
        data = [m for m in data if q in m["formula"].lower()
                                or q in m["name"].lower()
                                or q in m["material_class"].lower()]
    total = len(data); start = (page-1)*limit
    return {"total":total,"page":page,"limit":limit,"materials":data[start:start+limit]}

@router.get("/materials/{formula}")
def material_archive(formula: str):
    papers = _BY_F.get(formula, [])
    if not papers:
        fl = formula.lower()
        papers = [p for p in _PAPERS if p["formula"].lower() == fl]
    if not papers:
        raise HTTPException(404, f"No papers for '{formula}'")
    return _archive(formula, papers)

@router.get("/papers")
def list_papers(
    formula: Optional[str] = Query(None),
    search:  Optional[str] = Query(None),
    page:    int           = Query(1,  ge=1),
    limit:   int           = Query(20, ge=1, le=100),
):
    data = _PAPERS
    if formula:
        data = _BY_F.get(formula, []) or [p for p in _PAPERS if p["formula"].lower()==formula.lower()]
    if search:
        q = search.lower()
        data = [p for p in data if q in p["title"].lower()]
    total = len(data); start = (page-1)*limit
    return {"total":total,"page":page,"limit":limit,"papers":data[start:start+limit]}

@router.get("/papers/{paper_id}")
def get_paper(paper_id: str):
    p = next((p for p in _PAPERS if p["id"] == paper_id), None)
    if not p:
        raise HTTPException(404, f"Paper '{paper_id}' not found")
    return p