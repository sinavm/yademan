#!/usr/bin/env python3
"""Audit the current Yademan portrait manifest without downloading or republishing images.

This is intentionally metadata-only: an image URL or archived file is not proof
of identity or reuse rights. The report never marks a portrait as approved.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RECORDS_PATH = ROOT / "data" / "javidnams_data.json"
MANIFEST_PATH = ROOT / "data" / "image_manifest.min.json"


def normalize_name(value: Any) -> str:
    text = str(value or "").lower()
    return (
        text.replace("ي", "ی")
        .replace("ى", "ی")
        .replace("ك", "ک")
        .translate({ord(char): None for char in "\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652\u0653\u0654\u0655\u0670"})
        .replace("\u200c", " ")
        .replace("\u200f", " ")
        .replace("\u200e", " ")
        .replace("ـ", "")
    )
    text = re.sub(r"\\s+", " ", text).strip()
    return text


def valid_archive_path(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    path = value.strip()
    parts = path.split("/")
    return (
        path.startswith("images/")
        and "\\" not in path
        and all(part and part not in {".", ".."} for part in parts)
        and re.fullmatch(r"[A-Za-z0-9._/-]+", path) is not None
    )


def audit(records: list[dict[str, Any]], manifest: list[dict[str, Any]]) -> dict[str, Any]:
    record_counts = Counter(normalize_name(row.get("name")) for row in records)
    manifest_by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    invalid_paths = 0
    for row in manifest:
        name = normalize_name(row.get("n"))
        if name:
            manifest_by_name[name].append(row)
        for key in ("p", "t", "d"):
            value = row.get(key)
            if value and not valid_archive_path(value):
                invalid_paths += 1

    matched = archived = remote_only = missing = ambiguous = 0
    thumb_ready = detail_ready = 0
    duplicate_record_names = sum(1 for count in record_counts.values() if count > 1)
    for person in records:
        name = normalize_name(person.get("name"))
        matches = manifest_by_name.get(name, [])
        source_url = str(person.get("image") or "")
        unique_record = record_counts.get(name) == 1
        selected = matches[0] if len(matches) == 1 and unique_record else next(
            (item for item in matches if item.get("u") and item.get("u") == source_url),
            None,
        )
        if selected is None:
            missing += 1
            if len(matches) > 1 or not unique_record:
                ambiguous += 1
            continue
        matched += 1
        if valid_archive_path(selected.get("p")):
            archived += 1
            if valid_archive_path(selected.get("t")):
                thumb_ready += 1
            if valid_archive_path(selected.get("d")):
                detail_ready += 1
        elif str(selected.get("u") or "").startswith(("https://", "http://")):
            remote_only += 1
        else:
            missing += 1

    return {
        "records": len(records),
        "manifest_rows": len(manifest),
        "unique_manifest_names": len(manifest_by_name),
        "matched_records": matched,
        "archived_records": archived,
        "remote_only_records": remote_only,
        "unmatched_records": missing,
        "ambiguous_unmatched_records": ambiguous,
        "duplicate_record_name_groups": duplicate_record_names,
        "invalid_manifest_paths": invalid_paths,
        "thumbnail_variant_records": thumb_ready,
        "detail_variant_records": detail_ready,
        "rights_status": "NOT_ASSESSED: manifest does not carry item-level rights approval",
    }


def main() -> int:
    try:
        records = json.loads(RECORDS_PATH.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        if not isinstance(records, list) or not isinstance(manifest, list):
            raise ValueError("records and image manifest must both be JSON arrays")
        if any(not isinstance(row, dict) for row in records + manifest):
            raise ValueError("every record and manifest entry must be a JSON object")
        print(json.dumps(audit(records, manifest), ensure_ascii=False, indent=2))
        return 0
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"Image delivery audit failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
