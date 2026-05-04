"""
Extract antiviral drugs from the Russian GRLS opendata CSV.

Source: https://minzdrav.gov.ru/opendata/7707778246-grls
Caveat: the opendata portal has not refreshed this dataset since
2017-03-01 (last verified 2026-05). It is therefore a historical
snapshot only — modern approvals (Avifavir/favipiravir 2020,
Levilimab 2020, riamilovir COVID indication, etc.) will be missing.
The schema also has no ATC code field, so antiviral identification
relies on the Russian pharmacotherapeutic group string and a
curated INN dictionary.

Inputs:  data_backup/grls_2017/grls_data.csv
Outputs: data_backup/grls_2017/antivirals_extracted.json
         data_backup/grls_2017/unmatched_inns.txt
"""

import csv
import json
import re
import sys
from pathlib import Path
from collections import defaultdict

REPO = Path(__file__).resolve().parent.parent
CSV_PATH = REPO / "data_backup" / "grls_2017" / "grls_data.csv"
OUT_JSON = REPO / "data_backup" / "grls_2017" / "antivirals_extracted.json"
UNMATCHED = REPO / "data_backup" / "grls_2017" / "unmatched_inns.txt"

# Russian INN (lowercase) -> English INN. Add new mappings as needed.
RU_TO_EN = {
    "ацикловир": "acyclovir",
    "валацикловир": "valacyclovir",
    "ганцикловир": "ganciclovir",
    "валганцикловир": "valganciclovir",
    "пенцикловир": "penciclovir",
    "фамцикловир": "famciclovir",
    "идоксуридин": "idoxuridine",
    "трифлуридин": "trifluridine",
    "видарабин": "vidarabine",
    "цидофовир": "cidofovir",
    "фоскарнет": "foscarnet",
    "бривудин": "brivudine",
    "рибавирин": "ribavirin",
    "осельтамивир": "oseltamivir",
    "занамивир": "zanamivir",
    "римантадин": "rimantadine",
    "амантадин": "amantadine",
    "умифеновир": "umifenovir",
    "арбидол": "arbidol",
    "кагоцел": "kagocel",
    "ингавирин": "ingavirin",
    "имидазолилэтанамид пентандиовой кислоты": "ingavirin",
    "тилорон": "tilorone",
    "интерферон альфа": "interferon alfa",
    "интерферон альфа-2a": "interferon alfa-2a",
    "интерферон альфа-2b": "interferon alfa-2b",
    "пэгинтерферон альфа-2a": "peginterferon alfa-2a",
    "пэгинтерферон альфа-2b": "peginterferon alfa-2b",
    "интерферон бета-1a": "interferon beta-1a",
    "интерферон бета-1b": "interferon beta-1b",
    "интерферон гамма": "interferon gamma",
    "ламивудин": "lamivudine",
    "тенофовир": "tenofovir",
    "энтекавир": "entecavir",
    "телбивудин": "telbivudine",
    "адефовир": "adefovir",
    "софосбувир": "sofosbuvir",
    "даклатасвир": "daclatasvir",
    "ледипасвир": "ledipasvir",
    "симепревир": "simeprevir",
    "паритапревир": "paritaprevir",
    "омбитасвир": "ombitasvir",
    "дасабувир": "dasabuvir",
    "боцепревир": "boceprevir",
    "телапревир": "telaprevir",
    "зидовудин": "zidovudine",
    "ставудин": "stavudine",
    "диданозин": "didanosine",
    "абакавир": "abacavir",
    "эмтрицитабин": "emtricitabine",
    "невирапин": "nevirapine",
    "эфавиренз": "efavirenz",
    "этравирин": "etravirine",
    "рилпивирин": "rilpivirine",
    "лопинавир": "lopinavir",
    "ритонавир": "ritonavir",
    "атазанавир": "atazanavir",
    "дарунавир": "darunavir",
    "саквинавир": "saquinavir",
    "индинавир": "indinavir",
    "нелфинавир": "nelfinavir",
    "ралтегравир": "raltegravir",
    "долутегравир": "dolutegravir",
    "элвитегравир": "elvitegravir",
    "энфувиртид": "enfuvirtide",
    "маравирок": "maraviroc",
    "триазавирин": "triazavirin",
    "риамиловир": "riamilovir",
    "паливизумаб": "palivizumab",
    "инозин пранобекс": "inosine pranobex",
    "метисазон": "methisazone",
    "оксолин": "oxolin",
    "теброфен": "tebrofen",
    "флореналь": "florenal",
    "глицирризиновая кислота": "glycyrrhizic acid",
    "панавир": "panavir",
    "пранобекс": "inosine pranobex",
    "энисамия йодид": "enisamium iodide",
    "энисамия": "enisamium iodide",
}

ANTIVIRAL_GROUP_RE = re.compile(r"противовирус", re.IGNORECASE)


def load_rows():
    # csv module handles multi-line quoted fields correctly
    with CSV_PATH.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            yield row


def main():
    if not CSV_PATH.exists():
        sys.exit(f"missing input: {CSV_PATH}")

    # The 2017 snapshot has many antiviral rows with empty `internationalname`
    # and `tradename` fields — drug identity is often only present in
    # `normativedocumentation`, `formrelease`, or `stages`. So we scan the
    # concatenation of all fields for known Russian INN substrings.
    # Sort by length descending so e.g. "валганцикловир" matches before "ганцикловир".
    inn_terms = sorted(RU_TO_EN.keys(), key=len, reverse=True)

    by_en = defaultdict(lambda: {
        "inn_en": "",
        "ru_terms_seen": set(),
        "registration_count": 0,
        "antiviral_group_count": 0,
        "earliest_regdate": None,
        "tradenames": set(),
    })

    total = 0
    antiviral_rows = 0
    matched_rows = 0
    for row in load_rows():
        total += 1
        group = row.get("pharmacotherapeuticgroup") or ""
        is_antiviral_group = bool(ANTIVIRAL_GROUP_RE.search(group))
        if is_antiviral_group:
            antiviral_rows += 1

        # Concatenate all text fields, lowercased, for INN substring search
        haystack = " ".join((row.get(k) or "") for k in row).lower()

        # Pick the first (longest) matching INN term
        matched_term = None
        for term in inn_terms:
            if term in haystack:
                matched_term = term
                break

        # Skip if not antiviral by either signal
        if not (is_antiviral_group or matched_term):
            continue
        if not matched_term:
            continue  # antiviral group but unknown INN — skip silently
        matched_rows += 1

        en = RU_TO_EN[matched_term]
        bucket = by_en[en]
        bucket["inn_en"] = en
        bucket["ru_terms_seen"].add(matched_term)
        bucket["registration_count"] += 1
        if is_antiviral_group:
            bucket["antiviral_group_count"] += 1
        rd = (row.get("regdate") or "").strip()
        if rd:
            cur = bucket["earliest_regdate"]
            if cur is None or rd < cur:
                bucket["earliest_regdate"] = rd
        tn = (row.get("tradename") or "").strip()
        if tn:
            bucket["tradenames"].add(tn)

    out = []
    for en, b in sorted(by_en.items()):
        out.append({
            "inn_en": en,
            "ru_terms_seen": sorted(b["ru_terms_seen"]),
            "registration_count": b["registration_count"],
            "antiviral_group_count": b["antiviral_group_count"],
            "earliest_regdate": b["earliest_regdate"],
            "tradenames": sorted(b["tradenames"])[:10],
        })

    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2))

    print(f"rows scanned:           {total}")
    print(f"antiviral-group rows:   {antiviral_rows}")
    print(f"rows matched to INN:    {matched_rows}")
    print(f"distinct English INNs:  {len(out)}")
    print(f"output: {OUT_JSON}")


if __name__ == "__main__":
    main()
