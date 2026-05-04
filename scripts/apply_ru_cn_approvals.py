"""
One-shot updater for [public/data/antivirals.json](public/data/antivirals.json):

  Scope A — backfill `russia: true` on existing entries whose drugNormalized
            matches an INN found in the GRLS 2017 extract.
  Scope B — set `russia: true` on existing modern Russian-approved drugs
            and add new entries for kagocel + enisamium iodide.
  Scope C — set `china: true` on existing China-approved drugs and add new
            entries for simnotrelvir, azvudine, onradivir, ZX-7101A,
            pradefovir mesylate.

Also recomputes stats and bumps lastUpdated on metadata.json.
"""

import json
from pathlib import Path
from datetime import date

REPO = Path(__file__).resolve().parent.parent
ANTIVIRALS_JSON = REPO / "public" / "data" / "antivirals.json"
METADATA_JSON = REPO / "public" / "data" / "metadata.json"
GRLS_EXTRACT = REPO / "data_backup" / "grls_2017" / "antivirals_extracted.json"

# Scope A — INNs confirmed in 2017 GRLS antiviral set.
# Loaded dynamically from the extract; we set russia=true on any drug whose
# drugNormalized matches one of these case-insensitively.
def load_grls_inns():
    data = json.loads(GRLS_EXTRACT.read_text())
    return {r["inn_en"].lower() for r in data if r.get("inn_en")}


# Scope B — modern Russia approvals (post-2017 GRLS or pre-2017 not captured).
# Keys are drugNormalized values to match; flag will be set on every entry.
SCOPE_B_RUSSIA_FLIPS = {
    "favipiravir",        # Avifavir (May 2020)
    "umifenovir",         # Russia 1993
    "arbidol",            # trade name of umifenovir, separate entry in DB
    "triazavirin",        # riamilovir, Russia 2014
    "ingavirin",          # already in CSV but ensure flag is set
    "remdesivir",         # Russia approved 2020
    "molnupiravir",       # Russia approved 2022
}

# Scope C — China NMPA approvals.
SCOPE_C_CHINA_FLIPS = {
    "favipiravir",        # NMPA influenza
    "umifenovir",         # NMPA
    "remdesivir",         # NMPA conditional 2020
    "oseltamivir",        # NMPA
    "ribavirin",          # NMPA
    "tenofovir",          # NMPA
    "tenofovir alafenamide",
    "tenofovir disoproxil fumarate",
    "tenofovir disoproxil",
    "lamivudine",         # NMPA
    "entecavir",          # NMPA
    "sofosbuvir",         # NMPA
    "acyclovir",          # NMPA
    "valacyclovir",       # NMPA
    "ganciclovir",        # NMPA
    "valganciclovir",     # NMPA
    "molnupiravir",       # NMPA
    "nirmatrelvir",       # paxlovid in China
    "azvudine",           # NMPA 2021/2022
    "deuremidevir",       # vv116 alias
    "vv116",
}


def make_entry(*, drug, drug_norm, virus_short, virus_long, target, mechanism,
               approvals_overrides, references, phase2=True, phase3=True,
               phase2_result="positive", phase3_result="positive",
               pubchem_cid=None, drugbank_id=None, smiles="", inchi_key=""):
    """Build one AntiviralEntry dict matching the existing JSON shape."""
    approvals = {
        "fda": False, "europe": False, "japan": False,
        "china": False, "russia": False, "southKorea": False,
    }
    approvals.update(approvals_overrides)
    entry = {
        "id": f"{drug.replace(' ', '_')}-{virus_short}",
        "drug": drug,
        "drugNormalized": drug_norm,
        "virusShort": virus_short,
        "virusLong": virus_long,
        "target": target,
        "mechanism": mechanism,
        "preclinical": True,
        "phase2Initiated": phase2,
        "phase2Result": phase2_result,
        "phase3Initiated": phase3,
        "phase3Result": phase3_result,
        "approvals": approvals,
        "references": references,
        "inchiKey": inchi_key,
        "smiles": smiles,
    }
    if pubchem_cid:
        entry["pubchemCid"] = pubchem_cid
    if drugbank_id:
        entry["drugbankId"] = drugbank_id
    return entry


# New entries added by Scopes B & C.
# Sources noted in references.drugvirusInfo for traceability.
NEW_ENTRIES = [
    # --- Scope B: Russia-only ---
    make_entry(
        drug="Kagocel",
        drug_norm="kagocel",
        virus_short="FLUAV",
        virus_long="Influenza A virus",
        target="Host immune response",
        mechanism="Interferon inducer",
        approvals_overrides={"russia": True},
        references={"approval": "https://grls.rosminzdrav.ru",
                    "drugvirusInfo": "Russia LP-(005941); approved 2003 in Russia for influenza/ARVI prophylaxis and treatment"},
        phase3_result="uncertain",
        pubchem_cid="11618368",
    ),
    make_entry(
        drug="Enisamium iodide",
        drug_norm="enisamium iodide",
        virus_short="FLUAV",
        virus_long="Influenza A virus",
        target="Viral RNA pol",
        mechanism="RNA-dependent RNA polymerase inhibitor",
        approvals_overrides={"russia": True},
        references={"phase3": "https://pubmed.ncbi.nlm.nih.gov/35149144/",
                    "approval": "https://grls.rosminzdrav.ru",
                    "drugvirusInfo": "Approved Russia and Ukraine; trade name Amizon/Amizonchik"},
        pubchem_cid="2733",
    ),
    # --- Scope C: China-first / China-only ---
    make_entry(
        drug="Simnotrelvir",
        drug_norm="simnotrelvir",
        virus_short="SARS-CoV-2",
        virus_long="Severe acute respiratory syndrome-related coronavirus",
        target="Viral protease",
        mechanism="3CL protease inhibitor",
        approvals_overrides={"china": True},
        references={"phase3": "https://www.nejm.org/doi/full/10.1056/NEJMoa2301425",
                    "approval": "https://english.nmpa.gov.cn",
                    "drugvirusInfo": "Simcere Pharmaceutical; brand Xiannuoxin (先诺欣); NMPA conditional approval Jan 2023; co-administered with ritonavir"},
    ),
    make_entry(
        drug="Azvudine",
        drug_norm="azvudine",
        virus_short="HIV-1",
        virus_long="Human immunodeficiency virus 1",
        target="Viral RT",
        mechanism="Nucleoside reverse transcriptase inhibitor",
        approvals_overrides={"china": True},
        references={"approval": "https://english.nmpa.gov.cn",
                    "drugvirusInfo": "HenanGenuine Biotech; NMPA approved July 2021 for HIV; INN FNC; PubChem CID 135398735"},
        pubchem_cid="135398735",
    ),
    make_entry(
        drug="Azvudine",
        drug_norm="azvudine",
        virus_short="SARS-CoV-2",
        virus_long="Severe acute respiratory syndrome-related coronavirus",
        target="Viral RNA pol",
        mechanism="RNA-dependent RNA polymerase inhibitor",
        approvals_overrides={"china": True},
        references={"approval": "https://english.nmpa.gov.cn",
                    "drugvirusInfo": "NMPA conditional approval July 2022 for COVID-19; same compound as HIV INN FNC"},
        pubchem_cid="135398735",
    ),
    make_entry(
        drug="Onradivir",
        drug_norm="onradivir",
        virus_short="FLUAV",
        virus_long="Influenza A virus",
        target="Viral RNA pol",
        mechanism="PB2 cap-binding inhibitor",
        approvals_overrides={"china": True},
        references={"approval": "https://english.nmpa.gov.cn",
                    "drugvirusInfo": "NMPA approved 2024 for uncomplicated influenza A in adults"},
    ),
    make_entry(
        drug="ZX-7101A",
        drug_norm="zx-7101a",
        virus_short="FLUAV",
        virus_long="Influenza A virus",
        target="Viral endonuclease",
        mechanism="Cap-dependent endonuclease inhibitor",
        approvals_overrides={"china": True},
        references={"approval": "https://english.nmpa.gov.cn",
                    "drugvirusInfo": "Brand Zaitongwei (再通卫); NMPA approved 2024 for influenza; baloxavir-class"},
    ),
    make_entry(
        drug="Pradefovir mesylate",
        drug_norm="pradefovir mesylate",
        virus_short="HBV",
        virus_long="Hepatitis B virus",
        target="Viral DNA pol",
        mechanism="Nucleotide reverse transcriptase inhibitor",
        approvals_overrides={"china": True},
        references={"approval": "https://english.nmpa.gov.cn/2025-02/19/c_1073651.htm",
                    "drugvirusInfo": "Xi'an Gelan Xintong Pharmaceutical; brand 新舒沐 (Xinshumu); NMPA Class 1 innovative drug, approved Feb 2025; liver-targeted PMEA prodrug"},
        pubchem_cid="9869929",
    ),
]


def recompute_stats(drugs):
    """Match logic used elsewhere in the app."""
    def phase(e):
        a = e["approvals"]
        if a["fda"] or a["europe"] or a["japan"] or a["china"] or a["russia"] or a["southKorea"]:
            return "approved"
        if e["phase3Initiated"]:
            return "phase3"
        if e["phase2Initiated"]:
            return "phase2"
        return "preclinical"

    unique_drugs = {e["drugNormalized"].lower() for e in drugs}
    counts = {"approved": 0, "phase3": 0, "phase2": 0, "preclinical": 0}
    for e in drugs:
        counts[phase(e)] += 1

    return {
        "totalDrugs": len(unique_drugs),
        "totalDrugVirusPairs": len(drugs),
        "fdaApproved": counts["approved"],
        "phase3": counts["phase3"],
        "phase2": counts["phase2"],
        "preclinical": counts["preclinical"],
    }


def main():
    av = json.loads(ANTIVIRALS_JSON.read_text())
    drugs = av["drugs"]

    grls_inns = load_grls_inns()
    russia_targets = grls_inns | {n.lower() for n in SCOPE_B_RUSSIA_FLIPS}
    china_targets = {n.lower() for n in SCOPE_C_CHINA_FLIPS}

    flips = {"russia": 0, "china": 0}
    for e in drugs:
        n = e["drugNormalized"].lower()
        if n in russia_targets and not e["approvals"]["russia"]:
            e["approvals"]["russia"] = True
            flips["russia"] += 1
        if n in china_targets and not e["approvals"]["china"]:
            e["approvals"]["china"] = True
            flips["china"] += 1

    # Append new entries (avoid id collisions)
    existing_ids = {e["id"] for e in drugs}
    added = 0
    for ne in NEW_ENTRIES:
        if ne["id"] in existing_ids:
            print(f"  skip duplicate id: {ne['id']}")
            continue
        drugs.append(ne)
        existing_ids.add(ne["id"])
        added += 1

    # Recompute stats
    stats = recompute_stats(drugs)
    av["stats"] = stats
    today = date.today().isoformat()
    av["lastUpdated"] = today

    ANTIVIRALS_JSON.write_text(json.dumps(av, indent=2, ensure_ascii=False))

    md = json.loads(METADATA_JSON.read_text())
    md["antivirals"] = stats
    md["generatedAt"] = today + "T00:00:00.000Z"
    METADATA_JSON.write_text(json.dumps(md, indent=2))

    print(f"russia flag flipped: {flips['russia']} entries")
    print(f"china  flag flipped: {flips['china']} entries")
    print(f"new entries added:   {added}")
    print(f"new stats: {stats}")


if __name__ == "__main__":
    main()
