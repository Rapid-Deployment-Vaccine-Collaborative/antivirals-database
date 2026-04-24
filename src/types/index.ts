// Types for the RaDVaC Antivirals Dashboard

export interface AntiviralEntry {
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

export interface ApprovedCompound {
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

export interface AntiviralsData {
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
}

export interface ApprovedCompoundsData {
  compounds: ApprovedCompound[];
  lastUpdated: string;
  stats: {
    total: number;
    fdaApproved: number;
    withSmiles: number;
  };
}

export interface Metadata {
  generatedAt: string;
  antivirals: AntiviralsData['stats'];
  approvedCompounds: ApprovedCompoundsData['stats'];
  dataSources: string[];
}

export type ViewMode = 'public' | 'researcher';

export type ClinicalPhase = 'preclinical' | 'phase2' | 'phase3' | 'approved';

export interface FilterState {
  searchQuery: string;
  viruses: string[];
  mechanisms: string[];
  phases: ClinicalPhase[];
  approvals: ('fda' | 'europe' | 'japan' | 'china' | 'russia' | 'southKorea')[];
}

export function getClinicalPhase(entry: AntiviralEntry): ClinicalPhase {
  if (entry.approvals.fda || entry.approvals.europe || entry.approvals.japan) {
    return 'approved';
  }
  if (entry.phase3Initiated) {
    return 'phase3';
  }
  if (entry.phase2Initiated) {
    return 'phase2';
  }
  return 'preclinical';
}

export function getPhaseLabel(phase: ClinicalPhase): string {
  switch (phase) {
    case 'preclinical':
      return 'Preclinical';
    case 'phase2':
      return 'Phase 2';
    case 'phase3':
      return 'Phase 3';
    case 'approved':
      return 'Approved';
  }
}

export function getApprovalRegions(entry: AntiviralEntry): string[] {
  const regions: string[] = [];
  if (entry.approvals.fda) regions.push('FDA');
  if (entry.approvals.europe) regions.push('EMA');
  if (entry.approvals.japan) regions.push('Japan');
  if (entry.approvals.china) regions.push('China');
  if (entry.approvals.russia) regions.push('Russia');
  if (entry.approvals.southKorea) regions.push('South Korea');
  return regions;
}
