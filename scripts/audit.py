import json
import collections
from pathlib import Path

source = Path("/root/dey/victims_1404.json")
records = json.loads(source.read_text(encoding="utf-8"))
keys = list(records[0]) if records else []
normalized = []
for item in records:
    row = {}
    for key in keys:
        if key.startswith("Unnamed:"):
            continue
        clean = key.replace("\u200c", " ").strip()
        row[clean] = str(item.get(key, "")).strip()
    normalized.append(row)

name_pairs = [
    (row.get("نام", ""), row.get("نام خانوادگی", ""))
    for row in normalized
]
counts = collections.Counter(name_pairs)
nonempty = {
    key: sum(bool(str(item.get(key, "")).strip()) for item in records)
    for key in keys if not key.startswith("Unnamed:")
}
duplicate_groups = sum(value > 1 for value in counts.values())
duplicate_excess = sum(value - 1 for value in counts.values())
unnamed_columns = [key for key in keys if key.startswith("Unnamed:")]
report = [
    "YADMAN SOURCE DATA AUDIT",
    f"Input rows: {len(records)}",
    f"Distinct name pairs: {len(counts)}",
    f"Duplicate groups requiring manual review: {duplicate_groups}",
    f"Rows in excess of unique name pairs: {duplicate_excess}",
    f"Empty full-name pairs: {sum(not first and not last for first, last in name_pairs)}",
    f"Unnamed extraction columns: {len(unnamed_columns)}",
    "",
    "Non-empty values by source field"
]
report.extend(f"{key}: {value} of {len(records)}" for key, value in nonempty.items())
report.extend([
    "",
    "Policy: no record is approved automatically",
    "Policy: duplicate candidates are not merged automatically",
    "Policy: source rows remain unchanged",
    "Policy: only reviewed records may enter the public dataset"
])
target = Path(__file__).resolve().parents[1] / "docs" / "data-audit.txt"
target.write_text("\n".join(report) + "\n", encoding="utf-8")
print("\n".join(report))
