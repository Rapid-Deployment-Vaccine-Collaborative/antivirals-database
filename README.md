# Radvac Antiviral Data Dashboard

A research data visualization dashboard for antiviral drug discovery, tracking ~321 drugs across ~1,659 drug–virus pairs. Covers clinical development stages (preclinical → Phase 2/3 → approved) with approval data from FDA, EMA, Japan, China, Russia, and South Korea.

Includes both a researcher view (full sortable/filterable data table) and a public view (card grid).

## Getting Started

**Prerequisites:** Node.js ≥ 18

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev
```

## Other Commands

```bash
npm run build    # Type-check + production build → dist/
npm run preview  # Preview the production build locally
npm run lint     # Run ESLint
```

## Stack

React 19 + TypeScript · Vite · React Router v7 (HashRouter) · TanStack Table v8 · Fuse.js · Recharts · 3DMol.js

## Data

Data lives in `public/data/`:
- `antivirals.json` — primary drug–virus database (1.3 MB)
- `approved_compounds.json` — 3,311 compounds with SMILES/InChI for structure lookup (6.1 MB)
- `metadata.json` — version info and counts
