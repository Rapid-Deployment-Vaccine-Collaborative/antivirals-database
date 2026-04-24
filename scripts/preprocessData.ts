/**
 * Data Preprocessing Script for RaDVaC Antivirals Dashboard
 *
 * Processes the raw CSV/JSON data files and creates optimized JSON for the web dashboard.
 *
 * Run with: npx tsx scripts/preprocessData.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input file paths (relative to project root)
const DATA_DIR = path.join(__dirname, '../../');
const ANTIVIRALS_CSV = path.join(DATA_DIR, 'combined_antivirals_dataset_2025_11_20_with_smiles.csv');
const APPROVED_COMPOUNDS_CSV = path.join(DATA_DIR, 'approved_small_molecule_compounds_FDA_and_drug_central_and_AntiviralDb.csv');
const OUTPUT_DIR = path.join(__dirname, '../public/data');

// Types
interface AntiviralEntry {
  id: string;
  drug: string;
  drugNormalized: string;
  virusShort: string;
  virusLong: string;
  target: string;
  mechanism: string;
  preclinical: boolean;
  phase2Initiated: boolean;
  phase2Result: string;
  phase3Initiated: boolean;
  phase3Result: string;
  approvals: {
    fda: boolean;
    europe: boolean;
    japan: boolean;
    china: boolean;
    russia: boolean;
    southKorea: boolean;
  };
  references: {
    phase2?: string;
    phase3?: string;
    approval?: string;
    drugvirusInfo?: string;
  };
  inchiKey: string;
  smiles: string;
  pubchemCid?: string;
  drugbankId?: string;
}

interface ApprovedCompound {
  id: string;
  name: string;
  nameNormalized: string;
  yearApproved?: number;
  fdaApplicationNumbers: string[];
  deliveryRoutes: string[];
  manufacturers: string[];
  rxnormIds: string[];
  fdaUniis: string[];
  pubchemCid?: string;
  smiles: string;
  inchiKey: string;
  drugbankId?: string;
  synonyms: string[];
  fdaApproved: boolean;
  emaApproved: boolean;
  pmdaApproved: boolean;
  dataSource: string;
}

interface ProcessedData {
  antivirals: {
    drugs: AntiviralEntry[];
    viruses: string[];
    mechanisms: string[];
    targets: string[];
    lastUpdated: string;
    stats: {
      totalDrugs: number;
      totalDrugVirusPairs: number;
      fdaApproved: number;
      phase3: number;
      phase2: number;
      preclinical: number;
    };
  };
  approvedCompounds: {
    compounds: ApprovedCompound[];
    lastUpdated: string;
    stats: {
      total: number;
      fdaApproved: number;
      withSmiles: number;
    };
  };
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.toString().toLowerCase().trim();
  return v === '1' || v === 'true' || v === 'yes';
}

function normalizeString(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function extractPubchemCid(smiles: string, names: string): string | undefined {
  // Try to extract CID from references or names
  const cidMatch = names?.match(/CID:\s*(\d+)/i) || names?.match(/cid_(\d+)/i);
  return cidMatch ? cidMatch[1] : undefined;
}

function extractDrugbankId(names: string): string | undefined {
  const dbMatch = names?.match(/DB\d{5}/);
  return dbMatch ? dbMatch[0] : undefined;
}

async function processAntiviralsData(): Promise<ProcessedData['antivirals']> {
  console.log('Processing antivirals dataset...');

  const csvContent = fs.readFileSync(ANTIVIRALS_CSV, 'utf-8');
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const drugs: AntiviralEntry[] = [];
  const virusSet = new Set<string>();
  const mechanismSet = new Set<string>();
  const targetSet = new Set<string>();
  const drugNameSet = new Set<string>();

  let fdaApproved = 0;
  let phase3 = 0;
  let phase2 = 0;
  let preclinical = 0;

  for (const row of parsed.data as Record<string, string>[]) {
    const drug = row['drug']?.trim();
    const virusShort = row['virus_short_name']?.trim();

    if (!drug || !virusShort) continue;

    const entry: AntiviralEntry = {
      id: `${drug}-${virusShort}`.replace(/[^a-zA-Z0-9-]/g, '_'),
      drug,
      drugNormalized: normalizeString(drug),
      virusShort,
      virusLong: row['virus_long_name']?.trim() || virusShort,
      target: row['target']?.trim() || '',
      mechanism: row['antiviral_mode_of_action']?.trim() || '',
      preclinical: parseBoolean(row['preclinical_evidence']),
      phase2Initiated: parseBoolean(row['phase_2_initiated']),
      phase2Result: row['phase_2_result']?.trim() || '',
      phase3Initiated: parseBoolean(row['phase_3_initiated']),
      phase3Result: row['phase_3_result']?.trim() || '',
      approvals: {
        fda: parseBoolean(row['approved_fda']),
        europe: parseBoolean(row['approved_in_europe']),
        japan: parseBoolean(row['approved_japan']),
        china: parseBoolean(row['approved_china']),
        russia: parseBoolean(row['approved_russia']),
        southKorea: parseBoolean(row['approved_south_korea']),
      },
      references: {
        phase2: row['phase_2_reference']?.trim() || undefined,
        phase3: row['phase_3_reference']?.trim() || undefined,
        approval: row['approval_reference']?.trim() || undefined,
        drugvirusInfo: row['drugvirus.info_references']?.trim() || undefined,
      },
      inchiKey: row['InChIKey']?.trim() || '',
      smiles: row['Connectivity_SMILES']?.trim() || '',
    };

    // Extract external IDs from references if available
    const refs = row['drugvirus.info_references'] || '';
    entry.pubchemCid = extractPubchemCid(entry.smiles, refs);
    entry.drugbankId = extractDrugbankId(refs);

    drugs.push(entry);

    // Collect unique values
    if (virusShort) virusSet.add(virusShort);
    if (entry.mechanism) mechanismSet.add(entry.mechanism);
    if (entry.target) targetSet.add(entry.target);
    drugNameSet.add(drug);

    // Count stats
    if (entry.approvals.fda) fdaApproved++;
    if (entry.phase3Initiated) phase3++;
    else if (entry.phase2Initiated) phase2++;
    else if (entry.preclinical) preclinical++;
  }

  console.log(`  Processed ${drugs.length} drug-virus pairs`);
  console.log(`  ${drugNameSet.size} unique drugs`);
  console.log(`  ${virusSet.size} viruses`);
  console.log(`  ${mechanismSet.size} mechanisms of action`);

  return {
    drugs,
    viruses: Array.from(virusSet).sort(),
    mechanisms: Array.from(mechanismSet).sort(),
    targets: Array.from(targetSet).sort(),
    lastUpdated: '2025-11-20',
    stats: {
      totalDrugs: drugNameSet.size,
      totalDrugVirusPairs: drugs.length,
      fdaApproved,
      phase3,
      phase2,
      preclinical,
    },
  };
}

async function processApprovedCompoundsData(): Promise<ProcessedData['approvedCompounds']> {
  console.log('Processing approved compounds dataset...');

  const csvContent = fs.readFileSync(APPROVED_COMPOUNDS_CSV, 'utf-8');
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const compounds: ApprovedCompound[] = [];
  let withSmiles = 0;
  let fdaApproved = 0;

  for (const row of parsed.data as Record<string, string>[]) {
    const commonName = row['common_drug_name']?.trim();
    const smiles = row['Connectivity_SMILES']?.trim();

    if (!commonName) continue;

    const fdaApprovedBool = parseBoolean(row['FDA_approved']) || parseBoolean(row['approved_fda']);

    const compound: ApprovedCompound = {
      id: (row['Unnamed: 0'] || compounds.length.toString()).toString(),
      name: commonName,
      nameNormalized: normalizeString(commonName),
      yearApproved: row['year_of_first_fda_approval'] ? parseInt(row['year_of_first_fda_approval']) : undefined,
      fdaApplicationNumbers: row['relevant_fda_application_numbers']?.split(';').map(s => s.trim()).filter(Boolean) || [],
      deliveryRoutes: row['fda_approved_delivery_routes']?.split(';').map(s => s.trim()).filter(Boolean) || [],
      manufacturers: row['2025_fda_approved_manufacturers']?.split(';').map(s => s.trim()).filter(Boolean) || [],
      rxnormIds: row['rxnorm_rxconcept_unique_ids']?.split(';').map(s => s.trim()).filter(Boolean) || [],
      fdaUniis: row['fda_uniis']?.split(';').map(s => s.trim()).filter(Boolean) || [],
      pubchemCid: row['PubChem_CID']?.trim() || undefined,
      smiles: smiles || '',
      inchiKey: row['InChI_Key']?.trim() || '',
      drugbankId: row['DrugBank_ID']?.trim() || undefined,
      synonyms: row['names']?.split(';').map(s => s.trim()).filter(Boolean).slice(0, 10) || [], // Limit synonyms
      fdaApproved: fdaApprovedBool,
      emaApproved: parseBoolean(row['approved_ema']),
      pmdaApproved: parseBoolean(row['approved_pmda']),
      dataSource: row['data_source']?.trim() || '',
    };

    compounds.push(compound);

    if (smiles) withSmiles++;
    if (fdaApprovedBool) fdaApproved++;
  }

  console.log(`  Processed ${compounds.length} compounds`);
  console.log(`  ${fdaApproved} FDA approved`);
  console.log(`  ${withSmiles} with SMILES structures`);

  return {
    compounds,
    lastUpdated: '2025-10-15',
    stats: {
      total: compounds.length,
      fdaApproved,
      withSmiles,
    },
  };
}

async function main() {
  console.log('RaDVaC Antivirals Dashboard - Data Preprocessing\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Process datasets
  const antivirals = await processAntiviralsData();
  const approvedCompounds = await processApprovedCompoundsData();

  // Write antivirals data
  const antiviralsPath = path.join(OUTPUT_DIR, 'antivirals.json');
  fs.writeFileSync(antiviralsPath, JSON.stringify(antivirals, null, 2));
  console.log(`\nWrote antivirals data to ${antiviralsPath}`);

  // Write approved compounds data
  const approvedPath = path.join(OUTPUT_DIR, 'approved_compounds.json');
  fs.writeFileSync(approvedPath, JSON.stringify(approvedCompounds, null, 2));
  console.log(`Wrote approved compounds data to ${approvedPath}`);

  // Write metadata
  const metadata = {
    generatedAt: new Date().toISOString(),
    antivirals: antivirals.stats,
    approvedCompounds: approvedCompounds.stats,
    dataSources: [
      'combined_antivirals_dataset_2025_11_20_with_smiles.csv',
      'approved_small_molecule_compounds_FDA_and_drug_central_and_AntiviralDb.csv',
    ],
  };
  const metadataPath = path.join(OUTPUT_DIR, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`Wrote metadata to ${metadataPath}`);

  console.log('\nData preprocessing complete!');
}

main().catch(console.error);
