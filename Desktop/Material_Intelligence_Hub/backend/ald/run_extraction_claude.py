"""
run_extraction_claude.py
────────────────────────
Lives in backend/ald/ alongside doi_elsevier.csv and unpaywall_oa_status.csv.
Run it from inside that folder:

    cd backend\\ald
    python run_extraction_claude.py

Uses Claude (via Anthropic API) to extract structured ALD data from each paper
using its title + DOI, then writes backend/ald/papers_extracted.json
which ald_router.py will automatically load.

Requirements:
    pip install anthropic pandas requests python-dotenv
    Set ANTHROPIC_API_KEY in your .env or environment.
"""

import os, json, csv, time, re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

try:
    import anthropic
except ImportError:
    print("Installing anthropic..."); os.system("pip install anthropic"); import anthropic

# ── Config ────────────────────────────────────────────────────────────────────
HERE         = Path(__file__).parent          # this script's own folder: backend/ald
PAPERS_CSV   = HERE / "doi_elsevier.csv"
OA_CSV       = HERE / "unpaywall_oa_status.csv"
OUT_FILE     = HERE / "papers_extracted.json"
BATCH_SIZE   = 10          # papers per Claude call (saves API calls)
DELAY        = 0.5         # seconds between batches
MAX_RETRIES  = 3           # retries per batch on API error

api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    print("⚠️  WARNING: ANTHROPIC_API_KEY is not set in your environment / .env file.")
elif not api_key.startswith("sk-ant-"):
    print("⚠️  WARNING: ANTHROPIC_API_KEY doesn't look like a real API key "
          "(should start with 'sk-ant-'). If you copied an OAuth/session token instead "
          "of a key from console.anthropic.com/settings/keys, requests may fail or expire mid-run.")
else:
    print(f"✅ API key loaded (starts with {api_key[:12]}...)")

client = anthropic.Anthropic(api_key=api_key)

# ── Load CSVs ─────────────────────────────────────────────────────────────────
def load_csv(path):
    if not path.exists():
        print(f"  ⚠️  File not found: {path}")
        return []
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        return list(csv.DictReader(f))

doi_rows = load_csv(PAPERS_CSV)
oa_rows  = load_csv(OA_CSV)

oa_map = {}
for r in oa_rows:
    doi = str(r.get("doi","")).strip().lower()
    oa_map[doi] = {
        "is_oa":     str(r.get("is_oa","FALSE")).upper()=="TRUE",
        "oa_status": str(r.get("oa_status","")).strip(),
        "oa_url":    str(r.get("best_oa_url","")).strip(),
        "host_type": str(r.get("best_host_type","")).strip(),
    }

print(f"Loaded {len(doi_rows)} papers from CSV")

# ── Material patterns ─────────────────────────────────────────────────────────
MAT_LIST = [
    "Al2O3","TiO2","HfO2","ZnO","ZrO2","SiO2","SnO2","In2O3","NiO","Ta2O5",
    "Fe2O3","Ga2O3","MgO","CeO2","V2O5","WO3","MoO3","CuO","Cu2O","La2O3",
    "Y2O3","Gd2O3","Er2O3","Nb2O5","RuO2","IrO2","Co3O4","CoO","BeO",
    "AlN","TiN","GaN","InN","SiN","TaN","WN","MoN","NbN","BN","Ta3N5","Si3N4",
    "MoS2","WS2","SnS","SnS2","ZnS","CdS","In2S3","PbS","ZnSe","CdSe","CdTe",
    "MoSe2","WSe2","Sb2Te3","GeTe",
    "Ru","Pt","Cu","Ir","W","Co","Ni","Pd","Au","Ag","Ti","Ta","Mo","Nb",
    "GaAs","InAs","InP","AlAs","SrTiO3","BiFeO3",
    "Hf0.5Zr0.5O2","HZO","HfAlO","LaAlO3","AlF3","LiF","MgF2","SiC","VO2","Si","Ge",
]

def guess_formula(title):
    for m in MAT_LIST:
        if m in title: return m
    hit = re.search(r'\b([A-Z][a-z]?\d*){2,4}\b', title)
    return hit.group(0) if hit else "Other"

def guess_class(f):
    if any(x in f for x in ["AlN","TiN","GaN","InN","TaN","WN","MoN","NbN","BN","Si3N4","SiN","Ta3N5"]): return "Nitride"
    if any(x in f for x in ["MoS2","WS2","SnS","ZnS","CdS","In2S3","PbS"]): return "Sulfide"
    if any(x in f for x in ["Se","Te","MoSe2","WSe2","ZnSe","CdSe","CdTe","GeTe","Sb2Te3"]): return "Chalcogenide"
    if f in ["Ru","Pt","Cu","Ir","W","Co","Ni","Pd","Au","Ag","Ti","Ta","Mo","Nb"]: return "Pure Metal"
    if any(x in f for x in ["GaAs","InAs","InP","AlAs"]): return "III-V Compound"
    if any(x in f for x in ["AlF3","LiF","MgF2","CaF2"]): return "Fluoride"
    return "Oxide"

PREC_MAP = {
    "Al2O3":["TMA","trimethylaluminum","Al(CH3)3","DMAI","AlCl3"],
    "TiO2": ["TTIP","TiCl4","Ti(OiPr)4","TDMAT"],
    "HfO2": ["HfCl4","TDMAH","TEMAHf","Hf(OtBu)4"],
    "ZnO":  ["DEZ","diethylzinc","Zn(acac)2","ZnCl2"],
    "ZrO2": ["ZrCl4","TDMAZ","Zr(OtBu)4","TEMAZr"],
    "NiO":  ["Ni(Cp)2","Ni(acac)2","Ni(dmamb)2","NiCl2"],
    "TiN":  ["TiCl4","TDMAT","TDEAT"],
    "AlN":  ["TMA","AlCl3","DMAI"],
    "MoS2": ["Mo(CO)6","MoCl5"],
    "WS2":  ["W(CO)6","WF6"],
    "SnO2": ["SnCl4","TDMASn"],
    "In2O3":["InCl3","TMIn"],
    "Ta2O5":["TaCl5","TBTDET"],
    "GaN":  ["TMGa","GaCl3"],
    "SiO2": ["TEOS","SiH4","3DMAS"],
    "Ga2O3":["TMGa","GaCl3","Ga(acac)3"],
}
CORE_MAP = {
    "Nitride": ["NH3","N2 plasma","N2H4"],
    "Sulfide":  ["H2S","(TMS)2S","H2S plasma"],
    "Chalcogenide": ["H2Se","Se plasma","H2Te"],
}

def get_prec(formula):
    if formula in PREC_MAP: return PREC_MAP[formula]
    cls = guess_class(formula)
    if cls == "Nitride": return ["TiCl4","TDMAT","TMA"]
    if cls in ["Sulfide","Chalcogenide"]: return ["Mo(CO)6","W(CO)6"]
    if cls == "Pure Metal": return [f"{formula}(acac)2",f"{formula}Cp2"]
    return ["TMA","TiCl4","HfCl4"]

def get_core(formula):
    cls = guess_class(formula)
    return CORE_MAP.get(cls, ["H2O","O3","O2 plasma"])

# ── Claude extraction (batch) ─────────────────────────────────────────────────
SYSTEM = """You are an ALD (Atomic Layer Deposition) data extraction expert.
Given a list of paper titles and DOIs, extract structured information for each.
Return ONLY a valid JSON array, one object per paper, with these exact keys:
- title_short: short display title like "Al2O3 via ALD" or "TiO2 via PEALD" (max 50 chars)
- formula: chemical formula of the primary deposited material (e.g. "Al2O3")
- method_type: deposition method ("ALD", "PEALD", "CVD", "MOCVD", "Sputtering", "MBE", "FTS", "ALE")
- temp: deposition temperature as string like "200°C" or "200-300°C" or "" if unknown
- methods_count: integer, estimated number of deposition methods/conditions reported (1-30)
- abstract_summary: 1-2 sentence summary of what the paper is about (use title to infer)
- precursors: array of precursor names (e.g. ["TMA", "TiCl4"])
- coreactants: array of coreactant names (e.g. ["H2O", "O3"])
- crystal_phases: array of crystal phases (e.g. ["Amorphous", "Anatase"])
- substrate: primary substrate material (e.g. "Si", "glass", "sapphire", or "")
- thickness_nm: film thickness as string like "20" or ""
- surface_mechanism: one sentence about the surface chemistry (or "")
- characterization_methods: array of techniques (e.g. ["XPS", "SEM", "XRD", "TEM"])
- process_type: "batch" or "flow"
- data_completeness: integer 0-100, how complete the data likely is

No markdown, no explanation. Return only the JSON array."""

def extract_batch(papers_batch, retries=MAX_RETRIES):
    """Call Claude to extract structured data for a batch of papers, with retries."""
    lines = []
    for i, p in enumerate(papers_batch):
        lines.append(f"{i+1}. Title: {p['title_raw']}\n   DOI: {p['doi']}\n   Publication: {p['pub']}")
    prompt = "Extract ALD data for these papers:\n\n" + "\n\n".join(lines)

    for attempt in range(1, retries + 1):
        try:
            msg = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4000,
                system=SYSTEM,
                messages=[{"role": "user", "content": prompt}]
            )
            raw = msg.content[0].text.strip()
            raw = re.sub(r'^```json\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            return json.loads(raw)
        except Exception as e:
            print(f"  Claude error (attempt {attempt}/{retries}): {e}")
            if attempt < retries:
                time.sleep(3 * attempt)  # backoff: 3s, 6s, ...
            else:
                return None

# ── Load already-extracted if exists ─────────────────────────────────────────
# IMPORTANT: papers that previously fell back to generic/default data are
# marked with "extraction_failed": True and must NOT be treated as "done" —
# otherwise they get permanently stuck with fake fallback data forever.
existing = {}
skipped_fallback = 0
if OUT_FILE.exists():
    with open(OUT_FILE, encoding="utf-8") as f:
        for p in json.load(f):
            if p.get("extraction_failed"):
                skipped_fallback += 1
                continue
            existing[p.get("doi","").lower()] = p
    print(f"Resuming: {len(existing)} already extracted")
    if skipped_fallback:
        print(f"Re-queuing {skipped_fallback} papers that previously fell back to generic data")

# ── Main extraction loop ──────────────────────────────────────────────────────
all_papers = []
to_process = []

for i, row in enumerate(doi_rows):
    title = str(row.get("Title") or row.get("title") or "").strip()
    pub   = str(row.get("Publication") or row.get("publication") or "").strip()
    date  = str(row.get("Date") or row.get("date") or "").strip()
    doi   = str(row.get("DOI") or row.get("doi") or "").strip()
    oa    = oa_map.get(doi.lower(), {})

    base = {
        "id":          f"PAPER_{i:04d}",
        "index":       i,
        "title_raw":   title,
        "publication": pub,
        "date":        date,
        "doi":         doi,
        "is_oa":       oa.get("is_oa",False),
        "oa_status":   oa.get("oa_status",""),
        "oa_url":      oa.get("oa_url",""),
        "host_type":   oa.get("host_type",""),
    }

    if doi.lower() in existing:
        merged = {**existing[doi.lower()], **base}
        all_papers.append(merged)
    else:
        to_process.append({**base, "pub": pub})

print(f"\nNeed to extract: {len(to_process)} papers")
print(f"Already done:    {len(existing)} papers")
print(f"Estimated cost:  ~${len(to_process)*0.002:.2f} (Claude Sonnet)\n")

if to_process:
    inp = input("Proceed with extraction? (y/n): ").strip().lower()
    if inp != "y":
        print("Skipped. Using fallback data for unextracted papers.")
        to_process_flag = False
    else:
        to_process_flag = True
else:
    to_process_flag = False

if to_process_flag:
    batches = [to_process[i:i+BATCH_SIZE] for i in range(0, len(to_process), BATCH_SIZE)]
    print(f"Processing {len(batches)} batches of {BATCH_SIZE}...")

    for bi, batch in enumerate(batches):
        print(f"\nBatch {bi+1}/{len(batches)} — papers {bi*BATCH_SIZE+1}-{min((bi+1)*BATCH_SIZE, len(to_process))}")
        extracted = extract_batch(batch)

        if extracted and len(extracted) == len(batch):
            for base_paper, ext in zip(batch, extracted):
                formula = ext.get("formula") or guess_formula(base_paper["title_raw"])
                paper = {
                    **base_paper,
                    "title":                 ext.get("title_short") or base_paper["title_raw"][:80],
                    "formula":               formula,
                    "material_class":        guess_class(formula),
                    "material_name":         formula,
                    "method_type":           ext.get("method_type","ALD"),
                    "temp":                  ext.get("temp",""),
                    "methods":               int(ext.get("methods_count") or 1),
                    "abstract":              ext.get("abstract_summary",""),
                    "precursors":            ext.get("precursors") or get_prec(formula),
                    "coreactants":           ext.get("coreactants") or get_core(formula),
                    "crystal_phases":        ext.get("crystal_phases",[]),
                    "substrate":             ext.get("substrate",""),
                    "thickness_nm":          str(ext.get("thickness_nm","")),
                    "surface_mechanism":     ext.get("surface_mechanism",""),
                    "characterization_methods": ext.get("characterization_methods",[]),
                    "process_type":          ext.get("process_type","batch"),
                    "data_completeness":     int(ext.get("data_completeness") or 25),
                    "intermediate_species":  [],
                    "pulse_time_prec":       0.1,
                    "pulse_time_core":       0.1,
                    "purge_time":            0.1,
                    "extraction_failed":     False,
                }
                all_papers.append(paper)
                existing[base_paper["doi"].lower()] = paper
            print(f"  ✅ {len(batch)} papers extracted")
        else:
            print(f"  ⚠️  Claude failed/mismatched, using fallback for this batch")
            for base_paper in batch:
                formula = guess_formula(base_paper["title_raw"])
                paper = {
                    **base_paper,
                    "title":                 base_paper["title_raw"][:80],
                    "formula":               formula,
                    "material_class":        guess_class(formula),
                    "material_name":         formula,
                    "method_type":           "ALD",
                    "temp":                  "",
                    "methods":               1,
                    "abstract":              "",
                    "precursors":            get_prec(formula),
                    "coreactants":           get_core(formula),
                    "crystal_phases":        [],
                    "substrate":             "",
                    "thickness_nm":          "",
                    "surface_mechanism":     "",
                    "characterization_methods": [],
                    "process_type":          "batch",
                    "data_completeness":     10,
                    "intermediate_species":  [],
                    "pulse_time_prec":       0.1,
                    "pulse_time_core":       0.1,
                    "purge_time":            0.1,
                    "extraction_failed":     True,   # so it gets retried next run
                }
                all_papers.append(paper)
                # NOTE: deliberately NOT added to `existing` — must be retried

        # save progress after every batch
        all_papers_sorted = sorted(all_papers, key=lambda p: p["index"])
        with open(OUT_FILE, "w", encoding="utf-8") as f:
            json.dump(all_papers_sorted, f, indent=2, ensure_ascii=False)

        time.sleep(DELAY)

# ── Fallback for anything not yet in all_papers ───────────────────────────────
processed_dois = {p["doi"].lower() for p in all_papers}
for base_paper in to_process:
    if base_paper["doi"].lower() not in processed_dois:
        formula = guess_formula(base_paper["title_raw"])
        all_papers.append({
            **base_paper,
            "title":       base_paper["title_raw"][:80],
            "formula":     formula,
            "material_class": guess_class(formula),
            "material_name": formula,
            "method_type": "ALD","temp":"","methods":1,"abstract":"",
            "precursors":  get_prec(formula),"coreactants":get_core(formula),
            "crystal_phases":[],"substrate":"","thickness_nm":"",
            "surface_mechanism":"","characterization_methods":[],
            "process_type":"batch","data_completeness":10,
            "intermediate_species":[],"pulse_time_prec":0.1,
            "pulse_time_core":0.1,"purge_time":0.1,
            "extraction_failed": True,
        })

all_papers_sorted = sorted(all_papers, key=lambda p: p["index"])
with open(OUT_FILE, "w", encoding="utf-8") as f:
    json.dump(all_papers_sorted, f, indent=2, ensure_ascii=False)

n_failed = sum(1 for p in all_papers_sorted if p.get("extraction_failed"))
print(f"\n✅ Done! {len(all_papers_sorted)} papers saved to {OUT_FILE}")
if n_failed:
    print(f"⚠️  {n_failed} papers still on fallback data — rerun this script again to retry just those.")
print(f"Restart your FastAPI backend — it will load papers_extracted.json automatically.")