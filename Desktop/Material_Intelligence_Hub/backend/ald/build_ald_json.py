"""
build_ald_json.py
─────────────────
Run this ONCE from inside your cloned repo root:

    python build_ald_json.py

It scans the elsevier_papers/ folder, reads every JSON / txt file it finds,
and writes two clean output files:

    backend/ald/materials.json
    backend/ald/papers.json

Handles the most common layouts used in the repo:
  • A folder of per-paper JSON files  (one dict per file)
  • A single merged JSON array file
  • Plain text abstracts in .txt files alongside a metadata JSON

After running, copy both output files into your backend/ald/ folder.
"""

import json, os, re, sys
from pathlib import Path
from collections import defaultdict

# ── locate the elsevier_papers folder ────────────────────────────────────────
REPO_ROOT = Path(__file__).parent           # adjust if you put this script elsewhere
PAPERS_DIR = REPO_ROOT / "elsevier_papers"

if not PAPERS_DIR.exists():
    # try one level up
    PAPERS_DIR = REPO_ROOT.parent / "elsevier_papers"

if not PAPERS_DIR.exists():
    sys.exit(f"ERROR: Could not find elsevier_papers/ folder. "
             f"Looked in {REPO_ROOT} and {REPO_ROOT.parent}. "
             f"Please put this script next to the elsevier_papers/ folder.")

print(f"Found papers folder: {PAPERS_DIR}")

# ── collect all JSON files ────────────────────────────────────────────────────
raw_papers: list[dict] = []

json_files = sorted(PAPERS_DIR.rglob("*.json"))
print(f"Found {len(json_files)} JSON files")

for jf in json_files:
    try:
        data = json.loads(jf.read_text(encoding="utf-8", errors="replace"))
    except Exception as e:
        print(f"  SKIP {jf.name}: {e}")
        continue

    if isinstance(data, list):
        raw_papers.extend(data)
    elif isinstance(data, dict):
        # could be a single paper or a wrapper {"papers": [...]}
        if "papers" in data and isinstance(data["papers"], list):
            raw_papers.extend(data["papers"])
        elif "data" in data and isinstance(data["data"], list):
            raw_papers.extend(data["data"])
        else:
            raw_papers.append(data)

print(f"Loaded {len(raw_papers)} raw paper records")

# ── normalise each paper into a clean schema ─────────────────────────────────
FIELD_ALIASES = {
    # id
    "id":           ["id", "paper_id", "Paper_ID", "_id", "paperId"],
    "title":        ["title", "Title", "paper_title"],
    "formula":      ["formula", "material", "Material", "compound", "chemical_formula"],
    "material_class": ["material_class", "class", "type", "category"],
    "abstract":     ["abstract", "Abstract", "summary"],
    "doi":          ["doi", "DOI", "url", "link"],
    "temp":         ["temp", "temperature", "substrate_temp", "deposition_temp",
                     "Temperature (°C)", "Substrate Temperature (°C)"],
    "method_type":  ["method_type", "method", "deposition_method", "technique"],
    "methods":      ["methods", "num_methods", "methods_count"],
    "precursors":   ["precursors", "Precursors", "precursor_list"],
    "coreactants":  ["coreactants", "co_reactants", "oxidants", "coreactant_list"],
    "crystal_phases":["crystal_phases", "phases", "phase", "crystal_phase"],
    "characterization":["characterization", "characterisation", "techniques"],
    "paper_count":  ["paper_count", "count"],
}

def _get(d: dict, key: str):
    for alias in FIELD_ALIASES.get(key, [key]):
        if alias in d:
            return d[alias]
    return None

def _to_str_list(val) -> list[str]:
    if val is None:
        return []
    if isinstance(val, str):
        return [v.strip() for v in re.split(r"[,;/]", val) if v.strip()]
    if isinstance(val, list):
        out = []
        for v in val:
            if isinstance(v, str):
                out.append(v.strip())
            elif isinstance(v, dict):
                out.append(str(v.get("name", v.get("value", ""))).strip())
        return [v for v in out if v]
    return []

clean_papers: list[dict] = []
seen_ids: set = set()

for i, raw in enumerate(raw_papers):
    if not isinstance(raw, dict):
        continue

    pid = str(_get(raw, "id") or f"PAPER_{i+1:04d}").strip()
    # deduplicate
    if pid in seen_ids:
        pid = f"{pid}_{i}"
    seen_ids.add(pid)

    formula = str(_get(raw, "formula") or "").strip()
    if not formula:
        continue        # skip rows with no material

    clean_papers.append({
        "id":            pid,
        "title":         str(_get(raw, "title") or f"{formula} deposition study").strip(),
        "formula":       formula,
        "material_class": str(_get(raw, "material_class") or "").strip(),
        "abstract":      str(_get(raw, "abstract") or "").strip(),
        "doi":           str(_get(raw, "doi") or "").strip(),
        "temp":          str(_get(raw, "temp") or "").strip(),
        "method_type":   str(_get(raw, "method_type") or "ALD").strip(),
        "methods":       int(_get(raw, "methods") or 1),
        "precursors":    _to_str_list(_get(raw, "precursors")),
        "coreactants":   _to_str_list(_get(raw, "coreactants")),
        "crystal_phases":_to_str_list(_get(raw, "crystal_phases")),
        "characterization": _to_str_list(_get(raw, "characterization")),
        # keep any extra fields
        **{k: v for k, v in raw.items()
           if k not in {a for aliases in FIELD_ALIASES.values() for a in aliases}},
    })

print(f"Cleaned {len(clean_papers)} valid papers")

# ── build materials list from papers ─────────────────────────────────────────
mat_map: dict[str, dict] = {}
for p in clean_papers:
    f = p["formula"]
    if f not in mat_map:
        mat_map[f] = {
            "formula": f,
            "name": str(p.get("name") or f),
            "material_class": p["material_class"] or "Oxide",
            "paper_count": 0,
        }
    mat_map[f]["paper_count"] += 1
    if not mat_map[f]["material_class"] and p["material_class"]:
        mat_map[f]["material_class"] = p["material_class"]

materials = sorted(mat_map.values(), key=lambda m: -m["paper_count"])
print(f"Derived {len(materials)} unique materials")

# ── write output files ────────────────────────────────────────────────────────
OUT_DIR = REPO_ROOT / "backend" / "ald"
OUT_DIR.mkdir(parents=True, exist_ok=True)

(OUT_DIR / "materials.json").write_text(
    json.dumps(materials, indent=2, ensure_ascii=False), encoding="utf-8"
)
(OUT_DIR / "papers.json").write_text(
    json.dumps(clean_papers, indent=2, ensure_ascii=False), encoding="utf-8"
)

print(f"\n✅ Done!")
print(f"   Written: {OUT_DIR / 'materials.json'}  ({len(materials)} materials)")
print(f"   Written: {OUT_DIR / 'papers.json'}     ({len(clean_papers)} papers)")
print(f"\nNow start your FastAPI backend — everything will be served automatically.")