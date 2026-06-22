"""
cleanup.py — one-time fix-up
Run once from backend/ald to strip out old fallback-data papers
(saved before extraction_failed flagging existed) so they get
properly retried when you rerun run_extraction_claude.py.

    cd backend\\ald
    python cleanup.py
"""
import json
from pathlib import Path

OUT = Path(__file__).parent / "papers_extracted.json"

if not OUT.exists():
    print(f"No file found at {OUT} — nothing to clean.")
else:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    # Anything with data_completeness <= 10 and no explicit extraction_failed flag
    # was fallback data from before the fix — drop it so it gets re-extracted.
    good = [p for p in data if p.get("data_completeness", 0) > 10]
    dropped = len(data) - len(good)
    OUT.write_text(json.dumps(good, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Kept {len(good)} real papers, dropped {dropped} fallback papers for re-extraction")