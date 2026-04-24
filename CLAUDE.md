# Antiviral Dashboard — CLAUDE.md

## What This Is

A research data visualization dashboard for antiviral drug discovery. It tracks clinical development stages (preclinical → Phase 2/3 → approved) for ~321 drugs across ~1,659 drug–virus pairs, with approval tracking across FDA, EMA, Japan, China, Russia, South Korea.

The app is used by researchers working on broad-spectrum antivirals. There is both a "researcher" view (full data tables) and a "public" view (card grid, capped results).

---

## Commands

```bash
npm run dev      # dev server (localhost:5173)
npm run build    # tsc -b && vite build → dist/
npm run lint     # eslint
npm run preview  # preview dist/
```

Note: `npm run build` works fine despite the Node 18 warning. The 1.4 MB bundle warning is cosmetic — 3Dmol.js is large; not worth fixing unless load time becomes a real concern.

---

## Stack

| Layer | Library |
|---|---|
| UI | React 19.2 + TypeScript 5.9 |
| Routing | React Router v7, **HashRouter** (`/#/drug/...`) |
| Tables | TanStack React Table v8 |
| Fuzzy search | Fuse.js v7 |
| Charts | Recharts v3.6 |
| 3D molecules | 3DMol.js (loads via PubChem API) |
| Icons | Lucide React |
| Bundler | Vite 7 |
| CSS | Single file: `src/App.css` + `src/index.css` |

---

## Directory Structure

```
src/
  App.tsx                   # Router, navbar, top-level layout
  views/
    DrugPage.tsx            # /#/drug/:drugSlug
    VirusPage.tsx           # /#/virus/:virusSlug
  components/
    DrugTable.tsx           # TanStack sortable/paginated table (25/page)
    DrugCardGrid.tsx        # Public card grid view (max 50)
    FilterPanel.tsx         # Phase, virus, mechanism, approval checkboxes
    SearchBar.tsx           # Fuzzy search input
    PipelineChart.tsx       # Recharts bar chart
    PipelineStats.tsx       # Summary stat cards
    ViralFamiliesTable.tsx  # Virus taxonomy table — see below
    MoleculeViewer.tsx      # 2D structure from SMILES
    Molecule3DViewer.tsx    # 3D structure via PubChem CID
    ExportButton.tsx        # CSV export via PapaParse
  hooks/
    useAntiviralsData.ts    # Fetches all 3 JSON files; caches in module-level var
    useSearch.ts            # Fuse.js fuzzy search + filter memoization
  types/
    index.ts                # AntiviralEntry, FilterState, getClinicalPhase()
  utils/
    drugSlug.ts             # toDrugSlug, toVirusSlug, findDrugBySlug, findEntriesByVirusSlug
    parseReferenceIdentifiers.ts

public/data/
  antivirals.json           # 1.3 MB — primary drug-virus database
  approved_compounds.json   # 6.1 MB — 3,311 compounds with SMILES/InChI (cross-ref)
  metadata.json             # Version info, last-updated, counts
```

---

## Key Types (`src/types/index.ts`)

```ts
interface AntiviralEntry {
  id: string;
  drug: string;
  drugNormalized: string;        // canonical name used for slugs
  virusShort: string;            // e.g. "HSV-2", "CMV", "FLUAV"
  virusLong: string;
  target: string;
  mechanism: string;
  preclinical: boolean;
  phase2Initiated: boolean;
  phase2Result: 'Positive' | 'Negative' | 'Ongoing' | null;
  phase3Initiated: boolean;
  phase3Result: 'Positive' | 'Negative' | 'Ongoing' | null;
  approvals: { fda: boolean; europe: boolean; japan: boolean; china: boolean; russia: boolean; southKorea: boolean };
  references: { phase2?: string; phase3?: string; approval?: string; drugvirusInfo?: string };
  inchiKey: string;
  smiles: string;
  pubchemCid?: number;
  drugbankId?: string;
}

function getClinicalPhase(e: AntiviralEntry): 'approved' | 'phase3' | 'phase2' | 'preclinical'
// Cascade: any of fda/europe/japan → 'approved'; phase3Initiated → 'phase3'; etc.
// Note: china/russia/southKorea approvals do NOT count toward 'approved' phase.
```

---

## Routing

Uses `HashRouter` so the app deploys to any static host without server config. URLs look like `/#/drug/acyclovir`, not `/drug/acyclovir`.

```
/                  Dashboard (search + filter + table/grid)
/drug/:drugSlug    DrugPage — all virus entries for one drug
/virus/:virusSlug  VirusPage — all drugs for one virus
/viral-families    ViralFamiliesTable taxonomy view
```

---

## Slug System (`src/utils/drugSlug.ts`)

```ts
toDrugSlug(drugNormalized)  // lowercase, [a-z0-9] only, hyphens for separators
toVirusSlug(virusShort)     // same transform

findDrugBySlug(drugs, slug)         // matches on toDrugSlug(d.drugNormalized)
findEntriesByVirusSlug(drugs, slug) // matches on toVirusSlug(d.virusShort)
```

**Important:** `DrugPage` can have multiple entries (one per virus target). `VirusPage` also uses a fallback via `VIRUS_REGISTRY` for viruses not in antivirals.json.

---

## ViralFamiliesTable — Key Exports (`src/components/ViralFamiliesTable.tsx`)

This component is the source of truth for virus taxonomy. It exports:

| Export | Purpose |
|---|---|
| `SECTIONS` | ICTV taxonomy tree (Section → Family → Genus → Virus) |
| `VIRUS_CODE_MAP` | Display name → list of virusShort codes in antivirals.json |
| `VIRUS_REGISTRY` | Slug → `VirusInfo` (name, family, genus, section, pandemic, codes) |
| `VirusInfo` type | Used by VirusPage for stub pages |
| `Pandemic` type | `'yes' \| 'no' \| 'na'` |

`VIRUS_REGISTRY` is built at module load time from `SECTIONS` × `VIRUS_CODE_MAP`. It is used by `VirusPage` to:
1. Resolve aliases (e.g., display name `HCMV` → code `CMV` in antivirals.json)
2. Render a stub page with taxonomy metadata for viruses with no tracked compounds

`APPROVAL_DB` (not exported) maps virus display names to `{ antiviral: boolean, vaccine: boolean }` — sourced from antivirals.json + AntiviralDB Table 2.

Pandemic potential data comes from Jochmans 2023. Flaviviridae is split at genus level (Orthoflavivirus = yes, Hepacivirus = no, Pegivirus = na). All other families are family-level.

---

## Data Loading (`src/hooks/useAntiviralsData.ts`)

Fetches all three JSON files in parallel on first call. Result is cached in a module-level variable — subsequent component mounts get the cached data instantly without re-fetching.

---

## Search (`src/hooks/useSearch.ts`)

Fuse.js with threshold 0.3 and weighted keys:
- `drug` / `drugNormalized`: weight 2
- `virusShort` / `virusLong`: weight 1.5
- `mechanism` / `target`: weight 1

Filtering (phase, virus, mechanism, approval region) happens after fuzzy search, fully memoized.

---

## Visual Conventions

- **Approved antiviral in taxonomy table**: ✓ / ✗ icons (green/red) per virus
- **Pandemic potential (PP)**: ✓ / ✗ / — icon; PP=yes rows tinted light red
- **Virus cell shaded darker red**: virus has PP=yes AND is missing either antiviral or vaccine
- **Phase badges**: color-coded by phase on drug cards/tables
- **Clinical timeline**: horizontal stage dots on DrugPage (Preclinical → Phase 2 → Phase 3 → Approved)

---

## Data Quirks & Gotchas

- **One drug, many entries**: acyclovir has entries for HSV-1, HSV-2, VZV, CMV, EBV, etc. DrugPage aggregates them.
- **virusShort codes differ from display names**: `HCMV` in the table = `CMV` in antivirals.json. Always route through `VIRUS_REGISTRY.codes` when looking up by display name.
- **HEV genotypes 1–4** all map to code `HEV` — they share a single antivirals.json entry pool.
- **Influenza strains** (H1N1, H3N2, H5N1) all map to `FLUAV`; compound counts are shared.
- **RSV-A and RSV-B** both map to `RSV`.
- **Encoding**: antivirals.json had garbled UTF-8 characters (U+FFFD) in some `mechanism` fields — these were fixed in April 2025.
- **3D structures** require a PubChem CID and fetch from the PubChem API at runtime; not all drugs have one.
- **Approved compounds JSON** is large (6.1 MB) but is a separate dataset from antivirals.json — it stores SMILES/InChI for cross-referencing structures, not clinical data.
