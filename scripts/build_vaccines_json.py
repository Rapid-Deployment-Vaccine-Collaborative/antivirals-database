#!/usr/bin/env python3
"""Build public/data/vaccines.json from data_backup/vddb_exports/vaccine_tableExport.json.

Run from project root: python3 scripts/build_vaccines_json.py
"""
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data_backup" / "vddb_exports" / "vaccine_tableExport.json"
OUT = ROOT / "public" / "data" / "vaccines.json"

VACCINE_VIRUS_MAP = {
    "Adenovirus": "HAdV",
    "Coxsackievirus": "CV",
    "Crimean-Congo hemorrhagic fever": "CCHFV",
    "Cytomegalovirus": "CMV",
    "Dengue virus": "DENV",
    "Ebola virus": "EBOV",
    "Enterovirus 71": "EV-A71",
    "Epstein-Barr virus": "EBV",
    "Hantavirus": "HTNV",
    "Hepatitis A virus": "HAV",
    "Hepatitis B virus": "HBV",
    "Hepatitis C virus": "HCV",
    "Hepatitis E virus": "HEV",
    "Herpes simplex virus": "HSV",
    "Human immunodeficiency virus": "HIV",
    "Human papillomavirus": "HPV",
    "Influenza virus": "Influenza",
    "Lassa fever virus": "LASV",
    "Marburg virus": "MARV",
    "Measles virus": "MeV",
    "Middle east respiratory syndrome coronavirus": "MERS-CoV",
    "Mumps virus": "MuV",
    "Nipah virus": "NiV",
    "Norovirus": "NoV",
    "Poliovirus": "PV",
    "Rabies virus": "RABV",
    "Respiratory syncytial virus": "RSV",
    "Rhinovirus": "HRV",
    "SARS-CoV": "SARS-CoV",
    "SARS-CoV-2": "SARS-CoV-2",
    "Varicella-zoster virus": "VZV",
    "Venezuelan equine encephalomyel": "VEEV",
    "West nile virus": "WNV",
    "Yellow fever virus": "YFV",
    "Zika virus": "ZIKV",
}

PHASE_RANK = {"na": 0, "phase1": 1, "phase2": 2, "phase3": 3, "approved": 4}

# Name-based virus overrides. Applied when a vaccine's name contains a clear virus marker
# but the source data tagged it to an unrelated virus (a known VDDB pattern: vaccines studied
# in HIV+ populations get tagged "Human immunodeficiency virus" regardless of actual target).
# Order matters: first matching pattern wins. Patterns are case-insensitive regex.
NAME_OVERRIDES: list[tuple[str, str]] = [
    # SARS-CoV-2 (must come before generic SARS-CoV; some 2020-era source rows tag COVID
    # vaccines as plain "SARS-CoV"). Match canonical COVID-19 markers.
    (r"sars[- ]?cov[- ]?2", "SARS-CoV-2"),
    (r"covid", "SARS-CoV-2"),
    (r"2019[- ]?ncov", "SARS-CoV-2"),
    (r"ncov[- ]?2", "SARS-CoV-2"),
    # Hepatitis viruses
    (r"hepatitis a\b", "HAV"),
    (r"hepatitis b\b", "HBV"),
    (r"hbvax|engerix|recombivax", "HBV"),
    (r"hepatitis c\b", "HCV"),
    (r"hepatitis e\b", "HEV"),
    # HPV
    (r"\bhpv[- ]?\d", "HPV"),
    (r"\bhpv\b", "HPV"),
    (r"human papillom", "HPV"),
    # Common single-virus vaccines
    (r"\brabies\b", "RABV"),
    (r"yellow fever", "YFV"),
    (r"\b(opv|ipv)\b", "PV"),
    (r"\bpolio\b", "PV"),
    (r"\bmeasles\b", "MeV"),
    (r"\bmmr\b", "MeV"),
    (r"\bmumps\b", "MuV"),
    (r"varicella|\bzoster\b|shingles|varivax|zostavax|shingrix", "VZV"),
    (r"\bebola\b", "EBOV"),
    (r"marburg", "MARV"),
    (r"\bzika\b", "ZIKV"),
    (r"\bdengue\b", "DENV"),
    (r"\blassa\b", "LASV"),
    (r"nipah", "NiV"),
    (r"norovirus|norwalk", "NoV"),
    (r"\brsv\b|respiratory syncytial", "RSV"),
    (r"cchf|crimean[- ]congo", "CCHFV"),
    (r"venezuelan equine", "VEEV"),
    (r"west nile", "WNV"),
    # Influenza
    (r"\binfluenza\b", "Influenza"),
    (r"\b(tiv|qiv|liav)\b", "Influenza"),
    (r"\bh\dn\d\d?\b", "Influenza"),  # H1N1, H5N1, H7N9, H9N2 etc.
]


def name_override(vaccine_name: str) -> str | None:
    n = vaccine_name.lower()
    for pat, vshort in NAME_OVERRIDES:
        if re.search(pat, n):
            return vshort
    return None


def normalize_phase(raw: str) -> str:
    s = raw.strip().lower()
    if s in ("not applicable", "", "n/a", "na"):
        return "na"
    if s in ("early phase 1", "phase 1"):
        return "phase1"
    if s in ("phase 1/2", "phase 2"):
        return "phase2"
    if s in ("phase 2/3", "phase 3"):
        return "phase3"
    if s == "phase 4":
        return "approved"
    return "na"


def normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


# Drop pure bacterial vaccines (TB, pneumococcal, meningococcal, cholera, etc.) that
# only appear in this dataset because they were studied in trials enrolling people with
# viral infections (e.g., HIV+ populations). A name matching any of these patterns is
# excluded UNLESS it also contains a viral-component marker (multivalent combos like
# DTaP-IPV, DTPa-HBV-IPV/Hib are kept because they contain polio/HBV).
BACTERIAL_PATTERNS = [
    r"\bbcg\b",
    r"pneumococc",
    r"\bpcv[- ]?\d+\b",
    r"\bppv[- ]?\d+\b",
    r"\bpneumovax\b",
    r"\bprevenar\b|\bprevnar\b",
    r"meningococc|\bbexsero\b",
    r"\bcholera",
    r"group b strep",
    r"tetanus toxoid",
    r"\baeras[- ]?\d+\b",
    r"\bvpm1002\b",
    r"\bdar[- ]?901\b",
    r"\bdtap\b",
    r"\bdpt\b",
    r"\bvaxem\b",
    r"\bhib\b",
]
VIRAL_KEEP_PATTERNS = [
    r"\bipv\b", r"\bopv\b", r"\bpolio", r"\bhbv\b", r"hep[- ]?b\b",
    r"\bhpv\b", r"\bhcv\b", r"\bhav\b", r"hep[- ]?[ace]\b",
    r"measles", r"mumps", r"rubella", r"\bmmr\b",
    r"varicella", r"\bzoster\b", r"\binfluenza\b", r"\bh\dn\d",
    r"\brsv\b", r"respiratory syncytial",
    r"\bhiv\b", r"\bsiv\b", r"\bgp120\b", r"\bgp140\b", r"\bgp145\b", r"\benv\b",
    r"covid", r"sars[- ]?cov", r"\bncov\b",
    r"ebola", r"marburg", r"\bzika\b", r"dengue", r"\blassa\b", r"nipah",
    r"\brabies\b", r"yellow fever", r"\bwest nile\b", r"\bnorovirus\b",
    r"\bcmv\b", r"cytomegalo", r"\bebv\b", r"epstein", r"herpes simplex|\bhsv\b",
    r"\benterovirus\b|\bev[- ]?71\b|\bev[- ]?a71\b",
    r"adenovir(?!ae)", r"\bad[0-9]+\b", r"\bchad\b|chadox", r"\bmva\b",
    r"\brvsv\b|\bvsv\b", r"\bbnt\b", r"\bmrna\b",
]
_BACTERIAL_RE = re.compile("|".join(BACTERIAL_PATTERNS), re.IGNORECASE)
_VIRAL_RE = re.compile("|".join(VIRAL_KEEP_PATTERNS), re.IGNORECASE)


def is_pure_bacterial(name: str) -> bool:
    return bool(_BACTERIAL_RE.search(name)) and not _VIRAL_RE.search(name)


def main() -> None:
    with SRC.open() as f:
        raw = json.load(f)

    rows = raw["data"]
    # First pass: collect all rows per VDDB ID so we can pick the modal virus.
    by_vid: dict[str, list[dict]] = defaultdict(list)
    unmapped_viruses: set[str] = set()
    for r in rows:
        by_vid[r["VDDB ID"]].append(r)

    vaccines: list[dict] = []
    name_override_count = 0
    dropped_bacterial: list[tuple[str, str]] = []
    for vid, group in by_vid.items():
        # Drop pure bacterial vaccines (no viral component in name). Apply the filter to
        # the most-frequent name (ties → shortest), not the longest variant — combo-trial
        # rows often append unrelated coadministered products (e.g. "Priorix + Prevnar 13"
        # in a single row of a Priorix study) which would falsely trigger the filter.
        _name_counts = Counter(r["Vaccine"] for r in group)
        modal_name = min(_name_counts.keys(), key=lambda n: (-_name_counts[n], len(n)))
        if is_pure_bacterial(modal_name):
            dropped_bacterial.append((vid, modal_name))
            continue
        # Modal virus = most-common virus tag across this VDDB ID's trials.
        virus_counts: dict[str, int] = defaultdict(int)
        first_seen: dict[str, int] = {}
        for i, r in enumerate(group):
            v = r["Virus"]
            virus_counts[v] += 1
            first_seen.setdefault(v, i)
        modal_virus_long = max(
            virus_counts.keys(),
            key=lambda v: (virus_counts[v], -first_seen[v]),
        )
        modal_virus_short = VACCINE_VIRUS_MAP.get(modal_virus_long)
        if modal_virus_short is None:
            unmapped_viruses.add(modal_virus_long)
            modal_virus_short = modal_virus_long

        # Pick the most representative vaccine name: most-frequent across rows, ties broken
        # by shortest (avoids picking combo variants like "VARIVAX + M-M-R II" over "Varivax").
        name_counts = Counter(r["Vaccine"] for r in group)
        rep_name = min(name_counts.keys(), key=lambda n: (-name_counts[n], len(n)))
        rep_type = next((r["Type of Vaccine"].strip() for r in group if r["Type of Vaccine"]), "")

        # Apply name-based override when the vaccine name clearly indicates a virus that
        # disagrees with the source's modal tag. Common VDDB issue: vaccines studied in
        # HIV+ populations get tagged "HIV" regardless of actual target.
        override_short = name_override(rep_name)
        # Disease-based fallback for SARS-CoV / SARS-CoV-2 disambiguation: many 2020-era
        # source entries tag COVID-19 vaccines as plain "SARS-CoV". If the disease text
        # mentions "covid" / "sars-cov-2", treat as SARS-CoV-2.
        if not override_short and modal_virus_short == "SARS-CoV":
            disease_blob = " ".join(r["Disease"].lower() for r in group)
            if "covid" in disease_blob or "sars-cov-2" in disease_blob or "ncov-2" in disease_blob:
                override_short = "SARS-CoV-2"
        if override_short and override_short != modal_virus_short:
            primary_virus_short = override_short
            # Find a long name for the override target by reversing VACCINE_VIRUS_MAP
            primary_virus_long = next(
                (k for k, v in VACCINE_VIRUS_MAP.items() if v == override_short),
                override_short,
            )
            name_override_count += 1
            # When override fires, all source rows for this VDDB are about this vaccine
            # (just possibly studied in unrelated populations). Keep all trials as primary;
            # the source virus tag is the off-target population, not the target.
            override_used = True
        else:
            primary_virus_short = modal_virus_short
            primary_virus_long = modal_virus_long
            override_used = False

        primary_trials = []
        secondary_trial_count = 0
        diseases: list[str] = []
        max_phase = "na"
        approved = False

        for r in group:
            phase = normalize_phase(r["Phases"])
            is_primary = override_used or (r["Virus"] == modal_virus_long)
            if is_primary:
                primary_trials.append({
                    "nctId": r["NCT ID"],
                    "phase": phase,
                    "disease": r["Disease"],
                })
                if r["Disease"] and r["Disease"] not in diseases:
                    diseases.append(r["Disease"])
                if PHASE_RANK[phase] > PHASE_RANK[max_phase]:
                    max_phase = phase
                if phase == "approved":
                    approved = True
            else:
                secondary_trial_count += 1

        vaccines.append({
            "vddbId": vid,
            "vaccine": rep_name,
            "vaccineNormalized": normalize_name(rep_name),
            "virusLong": primary_virus_long,
            "virusShort": primary_virus_short,
            "type": rep_type,
            "diseases": diseases,
            "trials": primary_trials,
            "secondaryTrialCount": secondary_trial_count,
            "maxPhase": max_phase,
            "approved": approved,
        })

    vaccines.sort(key=lambda v: v["vddbId"])
    viruses = sorted({v["virusShort"] for v in vaccines})
    types = sorted({v["type"] for v in vaccines if v["type"]})

    out = {
        "vaccines": vaccines,
        "viruses": viruses,
        "vaccineTypes": types,
        "lastUpdated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "stats": {
            "totalVaccines": len(vaccines),
            "totalTrials": sum(len(v["trials"]) for v in vaccines),
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w") as f:
        json.dump(out, f, separators=(",", ":"))

    print(f"Wrote {OUT}")
    print(f"  vaccines: {out['stats']['totalVaccines']}")
    print(f"  trials:   {out['stats']['totalTrials']}")
    print(f"  viruses:  {len(viruses)}")
    print(f"  name overrides applied: {name_override_count}")
    print(f"  dropped (bacterial-only): {len(dropped_bacterial)}")
    for vid, name in dropped_bacterial:
        print(f"    {vid}  {name[:70]}")
    if unmapped_viruses:
        print(f"  WARNING: unmapped source viruses: {sorted(unmapped_viruses)}")


if __name__ == "__main__":
    main()
