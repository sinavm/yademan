#!/usr/bin/env python3
"""Synchronize the configured GitHub JSON source into the site's data file.

The source URL is supplied only through JAVIDNAM_SOURCE_URL (GitHub Actions
secret or repository variable). No upstream repository is hard-coded here.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "data" / "javidnams_data.json"
IMAGE_MAP = ROOT / "data" / "image-map.json"
MAX_BYTES = 20 * 1024 * 1024
MIN_RECORDS = 100
MIN_NAME_RATIO = 0.99
MAX_SHRINK_RATIO = 0.05
ALLOWED_FIELDS = {"name", "age", "image", "place", "date"}


def source_download_url(configured_url: str) -> str:
    parsed = urlsplit(configured_url.strip())
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("JAVIDNAM_SOURCE_URL must be an HTTPS GitHub file URL")

    host = parsed.hostname.lower()
    if host == "raw.githubusercontent.com":
        return configured_url.strip()

    if host == "github.com":
        parts = [part for part in unquote(parsed.path).split("/") if part]
        if len(parts) >= 5 and parts[2] == "blob":
            owner, repository, _, ref = parts[:4]
            file_path = "/".join(parts[4:])
            if not owner or not repository or not file_path:
                raise ValueError("The configured GitHub blob URL is incomplete")
            return f"https://raw.githubusercontent.com/{owner}/{repository}/{ref}/{file_path}"

    raise ValueError("JAVIDNAM_SOURCE_URL must point to a GitHub blob or raw file")


def fetch_source(url: str) -> bytes:
    request = Request(
        url,
        headers={
            "User-Agent": "Yademan-Source-Sync/1.0",
            "Accept": "application/json, text/plain;q=0.9, */*;q=0.8",
            "Cache-Control": "no-cache",
        },
    )
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urlopen(request, timeout=30) as response:
                payload = response.read(MAX_BYTES + 1)
            if len(payload) > MAX_BYTES:
                raise ValueError("The source JSON exceeds the 20 MiB safety limit")
            return payload
        except (HTTPError, URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(2 ** attempt)
    if isinstance(last_error, HTTPError):
        raise RuntimeError(f"Source request failed with HTTP {last_error.code}") from None
    raise RuntimeError("Could not reach the configured source (network or timeout)") from None


def validate_records(records: object, previous_count: int | None = None) -> list[dict]:
    if not isinstance(records, list):
        raise ValueError("The source JSON root must be an array")
    if len(records) < MIN_RECORDS:
        raise ValueError(f"Only {len(records)} records were received; refusing a suspiciously small dataset")
    if len(records) > 100_000:
        raise ValueError("The source contains more than 100,000 records; refusing the update")

    if previous_count and len(records) < previous_count * (1 - MAX_SHRINK_RATIO):
        raise ValueError(
            f"Record count fell from {previous_count} to {len(records)} "
            "(more than 5%); manual review is required"
        )

    valid_names = 0
    for index, row in enumerate(records):
        if not isinstance(row, dict):
            raise ValueError(f"Record {index} is not a JSON object")
        unknown = set(row) - ALLOWED_FIELDS
        if unknown:
            raise ValueError(f"Record {index} contains unexpected fields: {', '.join(sorted(unknown))}")
        name = row.get("name")
        if isinstance(name, str) and name.strip():
            valid_names += 1
        for field in ("name", "age", "image", "place", "date"):
            value = row.get(field)
            if value is not None and not isinstance(value, str):
                raise ValueError(f"Record {index}: field '{field}' must be a string")
        image = row.get("image", "")
        if image:
            image_url = urlsplit(image)
            if image_url.scheme in {"http", "https"} and image_url.netloc:
                pass
            elif (
                image_url.scheme
                or image_url.netloc
                or not image.startswith("./images/")
                or not image.lower().endswith(".webp")
            ):
                raise ValueError(f"Record {index} has an invalid image URL or local WebP path")
            else:
                local_image = (ROOT / image.removeprefix("./")).resolve()
                if ROOT not in local_image.parents or not local_image.is_file():
                    raise ValueError(f"Record {index} references a missing local image")

    ratio = valid_names / len(records)
    if ratio < MIN_NAME_RATIO:
        raise ValueError(
            f"Only {valid_names}/{len(records)} records have a non-empty name; "
            "refusing the update"
        )
    return records


def localize_images(records: list[dict]) -> list[dict]:
    """Replace known source image URLs with checked-in WebP assets."""
    if not IMAGE_MAP.exists():
        return records
    mapping = json.loads(IMAGE_MAP.read_text(encoding="utf-8"))
    if not isinstance(mapping, dict):
        raise ValueError("data/image-map.json must contain a JSON object")
    for index, row in enumerate(records):
        image = row.get("image", "")
        local_path = mapping.get(image) if image else None
        if local_path:
            if not isinstance(local_path, str) or not local_path.startswith("./images/"):
                raise ValueError(f"Image map entry for record {index} is invalid")
            row["image"] = local_path
    return records


def canonical_json(records: list[dict]) -> str:
    return json.dumps(records, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def main() -> int:
    configured_url = os.environ.get("JAVIDNAM_SOURCE_URL", "").strip()
    if not configured_url:
        print("::notice::JAVIDNAM_SOURCE_URL is not configured; source sync skipped.")
        return 0

    download_url = source_download_url(configured_url)
    payload = fetch_source(download_url)
    try:
        incoming = json.loads(payload.decode("utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Source response is not valid UTF-8 JSON: {exc}") from None

    current = json.loads(TARGET.read_text(encoding="utf-8")) if TARGET.exists() else []
    current_count = len(current) if isinstance(current, list) else None
    incoming = localize_images(incoming)
    records = validate_records(incoming, current_count)

    if isinstance(current, list) and canonical_json(records) == canonical_json(current):
        print(f"No source changes detected ({len(records)} records). Database left untouched.")
        return 0

    formatted = json.dumps(records, ensure_ascii=False, indent=2) + "\n"
    temporary = TARGET.with_suffix(TARGET.suffix + ".tmp")
    temporary.write_text(formatted, encoding="utf-8")
    # Validate the exact bytes that will replace the live dataset.
    check = json.loads(temporary.read_text(encoding="utf-8"))
    validate_records(check, current_count)
    temporary.replace(TARGET)
    print(f"Source update validated: {len(records)} records. Database file updated.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"::error::{error}", file=sys.stderr)
        raise SystemExit(1)
