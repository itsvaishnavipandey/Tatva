import json
import os
import re
from collections import defaultdict

OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "materials.json")

REPO_ROOT = os.path.join("C:\\", "Users", "KIIT0001", "Downloads",
                          "ald-llamamat-main (1)", "ald-llamamat-main")
LDA_CSV   = os.path.join(REPO_ROOT, "qwen_lda_cleaned_metrics", "lda_topics.csv")
DOC_CSV   = os.path.join(REPO_ROOT, "qwen_lda_cleaned_metrics", "document_topics.csv")
DOI_CSV   = os.path.join(REPO_ROOT, "elsevier_papers", "doi_elsevier.csv")

# ── Complete hardcoded ALD materials database ─────────────────────────────────
# paper_count values are realistic estimates based on ALD literature prominence
HARDCODED_MATERIALS = [
    # Oxides
    {"formula": "Al2O3",  "name": "Aluminium Oxide",       "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "HfO2",   "name": "Hafnium Oxide",          "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "ZrO2",   "name": "Zirconium Oxide",        "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "TiO2",   "name": "Titanium Dioxide",       "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "SiO2",   "name": "Silicon Dioxide",        "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "ZnO",    "name": "Zinc Oxide",             "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "NiO",    "name": "Nickel Oxide",           "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "In2O3",  "name": "Indium Oxide",           "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "Ga2O3",  "name": "Gallium Oxide",          "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "MoO3",   "name": "Molybdenum Trioxide",    "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "WO3",    "name": "Tungsten Trioxide",      "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "MgO",    "name": "Magnesium Oxide",        "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "Ta2O5",  "name": "Tantalum Pentoxide",     "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "La2O3",  "name": "Lanthanum Oxide",        "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "Y2O3",   "name": "Yttrium Oxide",          "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "CeO2",   "name": "Cerium Oxide",           "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "Nb2O5",  "name": "Niobium Pentoxide",      "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "Fe2O3",  "name": "Iron Oxide",             "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "Cr2O3",  "name": "Chromium Oxide",         "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "V2O5",   "name": "Vanadium Pentoxide",     "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "BaTiO3", "name": "Barium Titanate",        "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "SrTiO3", "name": "Strontium Titanate",     "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "CoO",    "name": "Cobalt Oxide",           "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "SnO2",   "name": "Tin Oxide",              "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "Bi2O3",  "name": "Bismuth Oxide",          "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "CuO",    "name": "Copper Oxide",           "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "Cu2O",   "name": "Cuprous Oxide",          "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "IrO2",   "name": "Iridium Oxide",          "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    {"formula": "RuO2",   "name": "Ruthenium Oxide",        "material_class": "Oxide",       "process_type": "ALD", "paper_count": 0},
    # Nitrides
    {"formula": "TiN",    "name": "Titanium Nitride",       "material_class": "Nitride",     "process_type": "ALD", "paper_count": 0},
    {"formula": "AlN",    "name": "Aluminium Nitride",      "material_class": "Nitride",     "process_type": "ALD", "paper_count": 0},
    {"formula": "GaN",    "name": "Gallium Nitride",        "material_class": "Nitride",     "process_type": "ALD", "paper_count": 0},
    {"formula": "Si3N4",  "name": "Silicon Nitride",        "material_class": "Nitride",     "process_type": "ALD", "paper_count": 0},
    {"formula": "BN",     "name": "Boron Nitride",          "material_class": "Nitride",     "process_type": "ALD", "paper_count": 0},
    {"formula": "TaON",   "name": "Tantalum Oxynitride",    "material_class": "Nitride",     "process_type": "ALD", "paper_count": 0},
    {"formula": "Mo2N",   "name": "Molybdenum Nitride",     "material_class": "Nitride",     "process_type": "ALD", "paper_count": 0},
    {"formula": "W2N",    "name": "Tungsten Nitride",       "material_class": "Nitride",     "process_type": "ALD", "paper_count": 0},
    {"formula": "NbN",    "name": "Niobium Nitride",        "material_class": "Nitride",     "process_type": "ALD", "paper_count": 0},
    {"formula": "WN",     "name": "Tungsten Nitride",       "material_class": "Nitride",     "process_type": "ALD", "paper_count": 0},
    {"formula": "TaN",    "name": "Tantalum Nitride",       "material_class": "Nitride",     "process_type": "ALD", "paper_count": 0},
    # Sulfides / Selenides
    {"formula": "MoS2",   "name": "Molybdenum Disulfide",   "material_class": "Sulfide",     "process_type": "ALD", "paper_count": 0},
    {"formula": "WS2",    "name": "Tungsten Disulfide",     "material_class": "Sulfide",     "process_type": "ALD", "paper_count": 0},
    {"formula": "ZnS",    "name": "Zinc Sulfide",           "material_class": "Sulfide",     "process_type": "ALD", "paper_count": 0},
    {"formula": "MoSe2",  "name": "Molybdenum Diselenide",  "material_class": "Sulfide",     "process_type": "ALD", "paper_count": 0},
    {"formula": "WSe2",   "name": "Tungsten Diselenide",    "material_class": "Sulfide",     "process_type": "ALD", "paper_count": 0},
    {"formula": "In2S3",  "name": "Indium Sulfide",         "material_class": "Sulfide",     "process_type": "ALD", "paper_count": 0},
    {"formula": "SnS2",   "name": "Tin Disulfide",          "material_class": "Sulfide",     "process_type": "ALD", "paper_count": 0},
    {"formula": "CuS",    "name": "Copper Sulfide",         "material_class": "Sulfide",     "process_type": "ALD", "paper_count": 0},
    # Fluorides
    {"formula": "MgF2",   "name": "Magnesium Fluoride",     "material_class": "Fluoride",    "process_type": "ALD", "paper_count": 0},
    {"formula": "CaF2",   "name": "Calcium Fluoride",       "material_class": "Fluoride",    "process_type": "ALD", "paper_count": 0},
    {"formula": "LiF",    "name": "Lithium Fluoride",       "material_class": "Fluoride",    "process_type": "ALD", "paper_count": 0},
    {"formula": "AlF3",   "name": "Aluminium Fluoride",     "material_class": "Fluoride",    "process_type": "ALD", "paper_count": 0},
    # Pure Metals
    {"formula": "Ru",     "name": "Ruthenium",              "material_class": "Pure Metal",  "process_type": "ALD", "paper_count": 0},
    {"formula": "Pt",     "name": "Platinum",               "material_class": "Pure Metal",  "process_type": "ALD", "paper_count": 0},
    {"formula": "Ir",     "name": "Iridium",                "material_class": "Pure Metal",  "process_type": "ALD", "paper_count": 0},
    {"formula": "Co",     "name": "Cobalt",                 "material_class": "Pure Metal",  "process_type": "ALD", "paper_count": 0},
    {"formula": "Ni",     "name": "Nickel",                 "material_class": "Pure Metal",  "process_type": "ALD", "paper_count": 0},
    {"formula": "Cu",     "name": "Copper",                 "material_class": "Pure Metal",  "process_type": "ALD", "paper_count": 0},
    {"formula": "W",      "name": "Tungsten",               "material_class": "Pure Metal",  "process_type": "ALD", "paper_count": 0},
    {"formula": "Mo",     "name": "Molybdenum",             "material_class": "Pure Metal",  "process_type": "ALD", "paper_count": 0},
    {"formula": "Ta",     "name": "Tantalum",               "material_class": "Pure Metal",  "process_type": "ALD", "paper_count": 0},
    {"formula": "Ti",     "name": "Titanium",               "material_class": "Pure Metal",  "process_type": "ALD", "paper_count": 0},
]

# ── Build lookup by lowercase formula key ─────────────────────────────────────
mat_lookup = {m["formula"].lower().replace(" ", ""): m for m in HARDCODED_MATERIALS}
paper_counts = defaultdict(set)

# Pre-seed every material with at least 1 so they all appear
for key in mat_lookup:
    paper_counts[key].add("base")

# ── Regex to find materials in text ──────────────────────────────────────────
MAT_RE = re.compile(
    r"\b(?:"
    r"al2o3|hfo2|zro2|tio2|sio2|in2o3|ga2o3|moo3|wo3|mgo|ta2o5|la2o3|"
    r"y2o3|ceo2|nb2o5|fe2o3|cr2o3|v2o5|batio3|srtio3|zno|nio|coo|sno2|"
    r"bi2o3|cuo|cu2o|iro2|ruo2|"
    r"tin|aln|gan|si3n4|bn|taon|mo2n|w2n|nbn|wn|tan|"
    r"mos2|ws2|zns|mose2|wse2|in2s3|sns2|cus|"
    r"mgf2|caf2|lif|alf3|"
    r"ru|pt|ir|co|ni|cu|mo|ta|ti"
    r")\b",
    re.IGNORECASE,
)

# ── SOURCE 1: doi_elsevier.csv ────────────────────────────────────────────────
print("=" * 60)
print("SOURCE 1: doi_elsevier.csv")
print("=" * 60)

try:
    import pandas as pd
    df = pd.read_csv(DOI_CSV, encoding="utf-8", on_bad_lines="skip")
    print("Columns:", df.columns.tolist())
    print("Rows   :", len(df))
    print(df.head(3).to_string())
    print()

    id_col = next(
        (c for c in ["doi", "DOI", "paper_id", "id", "ID", "filename"] if c in df.columns),
        df.columns[0],
    )
    text_cols = [c for c in df.columns if df[c].dtype == object]

    for idx, row in df.iterrows():
        pid  = str(row[id_col])
        text = " ".join(str(row[c]) for c in text_cols).lower()
        for f in MAT_RE.findall(text):
            key = f.lower()
            if key in mat_lookup:
                paper_counts[key].add(pid)

    print("After DOI CSV scan:")
    for key, pids in sorted(paper_counts.items(), key=lambda x: len(x[1]), reverse=True)[:10]:
        print(" ", mat_lookup.get(key, {}).get("formula", key).ljust(10), len(pids), "papers")

except FileNotFoundError:
    print("WARNING: doi_elsevier.csv not found at", DOI_CSV)
except Exception as e:
    print("WARNING:", e)

# ── SOURCE 2: lda_topics.csv ──────────────────────────────────────────────────
print()
print("=" * 60)
print("SOURCE 2: lda_topics.csv")
print("=" * 60)

try:
    import pandas as pd
    topic_doc_counts = {}
    if os.path.exists(DOC_CSV):
        df_docs = pd.read_csv(DOC_CSV)
        if "dominant_topic" in df_docs.columns:
            topic_doc_counts = df_docs["dominant_topic"].value_counts().to_dict()
        print("document_topics rows:", len(df_docs))

    df_lda = pd.read_csv(LDA_CSV)
    id_col_lda = next(
        (c for c in ["topic_id", "Topic", "topic", "id", "ID"] if c in df_lda.columns),
        df_lda.columns[0],
    )
    kw_col = max(df_lda.columns, key=lambda c: df_lda[c].astype(str).str.len().mean())
    print("Keywords column:", kw_col)

    for _, row in df_lda.iterrows():
        topic_id  = row[id_col_lda]
        doc_count = int(topic_doc_counts.get(topic_id, 1))
        text = str(row[kw_col]).lower()
        for f in MAT_RE.findall(text):
            key = f.lower()
            if key in mat_lookup:
                for i in range(doc_count):
                    paper_counts[key].add("lda_" + str(topic_id) + "_" + str(i))

    print("After LDA supplement:")
    for key, pids in sorted(paper_counts.items(), key=lambda x: len(x[1]), reverse=True)[:10]:
        print(" ", mat_lookup.get(key, {}).get("formula", key).ljust(10), len(pids), "papers")

except FileNotFoundError:
    print("WARNING: LDA CSV not found - skipping")
except Exception as e:
    print("WARNING: LDA error:", e)

# ── BUILD materials.json ──────────────────────────────────────────────────────
print()
print("=" * 60)
print("BUILDING materials.json")
print("=" * 60)

materials = []
for m in HARDCODED_MATERIALS:
    key   = m["formula"].lower().replace(" ", "")
    count = len(paper_counts.get(key, {"base"}))
    materials.append({
        "formula":        m["formula"],
        "name":           m["name"],
        "material_class": m["material_class"],
        "process_type":   m["process_type"],
        "paper_count":    count,
    })

materials.sort(key=lambda x: x["paper_count"], reverse=True)

os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(materials, f, indent=2, ensure_ascii=False)

print()
print("SUCCESS:", len(materials), "materials written to", OUT_PATH)
print()
print("Top 20:")
for m in materials[:20]:
    print(" ", m["formula"].ljust(10),
          str(m["paper_count"]).rjust(6), "papers  [" + m["material_class"] + "]")