"""Read-only audit of the Alma stock-take workbook against the item seed.

This deliberately does not write to Supabase or mutate the workbook. It reports
stable-code matches, name/category differences, and rows that need an explicit
mapping before an item-code replacement is safe.
"""

from __future__ import annotations

import re
import sys
import difflib
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path


WORKBOOK = Path(r"C:\Users\WilsonZX\Downloads\AUGUST (2).xlsx")
SEED = Path("supabase/seed_stock_listing.sql")


def read_workbook(path: Path) -> list[dict[str, str]]:
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    columns = ["No", "Item Code", "Item Group", "Description", "autocount UOM", "UOM", "Qty", "Stock Received", "Date"]
    with zipfile.ZipFile(path) as archive:
        strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("m:si", ns):
                strings.append("".join(text.text or "" for text in item.findall(".//m:t", ns)))
        root = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
    rows: list[dict[str, str]] = []
    for row in root.findall(".//m:sheetData/m:row", ns)[1:]:
        values: dict[str, str] = {"row": row.attrib["r"]}
        for cell in row.findall("m:c", ns):
            column = re.sub(r"\d", "", cell.attrib["r"])
            if column not in "ABCDEFGHI":
                continue
            value = cell.find("m:v", ns)
            text = "" if value is None else value.text or ""
            if cell.attrib.get("t") == "s" and text:
                text = strings[int(text)]
            values[columns[ord(column) - ord("A")]] = text.strip()
        if values.get("Item Code") or values.get("Description"):
            rows.append(values)
    return rows


def sql_fields(line: str) -> list[str]:
    """Split a single SQL VALUES tuple, preserving doubled apostrophes."""
    start = line.find("(")
    end = line.rfind(")")
    if start < 0 or end <= start:
        return []
    body = line[start + 1 : end]
    fields: list[str] = []
    current: list[str] = []
    quoted = False
    index = 0
    while index < len(body):
        char = body[index]
        if char == "'":
            if quoted and index + 1 < len(body) and body[index + 1] == "'":
                current.append("'")
                index += 2
                continue
            quoted = not quoted
            index += 1
            continue
        if char == "," and not quoted:
            fields.append("".join(current).strip())
            current = []
        else:
            current.append(char)
        index += 1
    fields.append("".join(current).strip())
    return fields


def read_seed(path: Path) -> dict[str, dict[str, str]]:
    items: dict[str, dict[str, str]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.lstrip().startswith("('"):
            continue
        fields = sql_fields(line)
        if len(fields) < 6:
            continue
        code, autocount, name, category, purchase_uom, base_uom = fields[:6]
        if code and code.upper() != "ITEM_CODE":
            items[code.strip().upper()] = {
                "item_code": code.strip(),
                "item_name": name.strip(),
                "category": category.strip(),
                "purchase_uom": purchase_uom.strip(),
                "base_uom": base_uom.strip(),
            }
    return items


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    workbook_rows = read_workbook(WORKBOOK)
    seed_items = read_seed(SEED)
    by_code: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in workbook_rows:
        if row.get("Item Code"):
            by_code[row["Item Code"].upper()].append(row)

    duplicates = {code: rows for code, rows in by_code.items() if len(rows) > 1}
    missing_seed = sorted(code for code in by_code if code not in seed_items)
    missing_workbook = sorted(code for code in seed_items if code not in by_code)
    name_changes: list[tuple[str, str, str]] = []
    category_changes: list[tuple[str, str, str]] = []
    uom_changes: list[tuple[str, str, str]] = []
    for code, rows in by_code.items():
        if code not in seed_items:
            continue
        workbook = rows[0]
        seed = seed_items[code]
        if workbook.get("Description", "").strip() != seed["item_name"]:
            name_changes.append((code, seed["item_name"], workbook.get("Description", "")))
        if workbook.get("Item Group", "").strip() != seed["category"]:
            category_changes.append((code, seed["category"], workbook.get("Item Group", "")))
        if workbook.get("UOM", "").strip() and workbook.get("UOM", "").strip().upper() != seed["base_uom"].upper():
            uom_changes.append((code, seed["base_uom"], workbook["UOM"]))

    print(f"workbook_rows={len(workbook_rows)} coded_rows={len(by_code)} seed_items={len(seed_items)}")
    print(f"duplicate_codes={len(duplicates)} missing_seed={len(missing_seed)} missing_workbook={len(missing_workbook)}")
    print(f"name_changes={len(name_changes)} category_changes={len(category_changes)} uom_changes={len(uom_changes)}")
    for code, old, new in name_changes:
        print(f"NAME|{code}|{old}|{new}")
    for code, old, new in category_changes:
        print(f"CATEGORY|{code}|{old}|{new}")
    if duplicates:
        for code, rows in duplicates.items():
            print(f"DUPLICATE|{code}|rows={','.join(row['row'] for row in rows)}")
    if missing_seed:
        print("MISSING_SEED|" + "|".join(missing_seed))
    if missing_workbook:
        print("MISSING_WORKBOOK|" + "|".join(missing_workbook))

    def normalize(value: str) -> str:
        return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()

    def similarity(left: str, right: str) -> float:
        a, b = normalize(left), normalize(right)
        if not a or not b:
            return 0.0
        left_tokens, right_tokens = set(a.split()), set(b.split())
        token_score = len(left_tokens & right_tokens) / max(1, len(left_tokens | right_tokens))
        return max(difflib.SequenceMatcher(None, a, b).ratio(), token_score)

    print("CANDIDATE_CODE_REVIEW|score>=0.68; review manually before any rename")
    for row in workbook_rows:
        code = row.get("Item Code", "")
        description = row.get("Description", "")
        if not code or not description:
            continue
        current = seed_items.get(code.upper(), {}).get("item_name", "")
        if current and normalize(current) == normalize(description):
            continue
        candidates = sorted(
            ((similarity(description, item["item_name"]), item) for item in seed_items.values()),
            key=lambda pair: pair[0],
            reverse=True,
        )
        if candidates and candidates[0][0] >= 0.68 and candidates[0][1]["item_code"].upper() != code.upper():
            candidate = candidates[0][1]
            print(f"CANDIDATE|{code}|{description}|{candidate['item_code']}|{candidate['item_name']}|{candidates[0][0]:.2f}")


def print_sql_values() -> None:
    def quote(value: str) -> str:
        return "'" + str(value or "").replace("'", "''") + "'"

    for row in read_workbook(WORKBOOK):
        if not row.get("Item Code"):
            continue
        category = row.get("Item Group") or "Stock Take"
        uom = row.get("UOM") or "KG"
        print(f"  ({quote(row['Item Code'])}, {quote(row.get('Description'))}, {quote(category)}, {quote(uom)}),")


if __name__ == "__main__":
    if "--sql-values" in sys.argv:
        sys.stdout.reconfigure(encoding="utf-8")
        print_sql_values()
    else:
        main()
