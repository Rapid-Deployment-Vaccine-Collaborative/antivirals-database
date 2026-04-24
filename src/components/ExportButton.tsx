import { Download } from 'lucide-react';
import Papa from 'papaparse';
import type { AntiviralEntry } from '../types';
import { getClinicalPhase, getPhaseLabel, getApprovalRegions } from '../types';

interface ExportButtonProps {
  data: AntiviralEntry[];
  filename?: string;
}

export function ExportButton({ data, filename = 'antivirals_export' }: ExportButtonProps) {
  const handleExport = () => {
    // Transform data for CSV export
    const exportData = data.map((drug) => ({
      'Drug Name': drug.drug,
      'Virus (Short)': drug.virusShort,
      'Virus (Full)': drug.virusLong,
      'Target': drug.target,
      'Mechanism of Action': drug.mechanism,
      'Clinical Phase': getPhaseLabel(getClinicalPhase(drug)),
      'Preclinical': drug.preclinical ? 'Yes' : 'No',
      'Phase 2 Initiated': drug.phase2Initiated ? 'Yes' : 'No',
      'Phase 2 Result': drug.phase2Result || '',
      'Phase 3 Initiated': drug.phase3Initiated ? 'Yes' : 'No',
      'Phase 3 Result': drug.phase3Result || '',
      'FDA Approved': drug.approvals.fda ? 'Yes' : 'No',
      'EMA Approved': drug.approvals.europe ? 'Yes' : 'No',
      'Japan Approved': drug.approvals.japan ? 'Yes' : 'No',
      'China Approved': drug.approvals.china ? 'Yes' : 'No',
      'Russia Approved': drug.approvals.russia ? 'Yes' : 'No',
      'South Korea Approved': drug.approvals.southKorea ? 'Yes' : 'No',
      'Approval Regions': getApprovalRegions(drug).join('; '),
      'InChI Key': drug.inchiKey,
      'SMILES': drug.smiles,
      'PubChem CID': drug.pubchemCid || '',
      'DrugBank ID': drug.drugbankId || '',
    }));

    // Convert to CSV
    const csv = Papa.unparse(exportData);

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleExport} className="export-button">
      <Download size={18} />
      Export CSV ({data.length.toLocaleString()} rows)
    </button>
  );
}

interface ExportJsonButtonProps {
  data: AntiviralEntry[];
  filename?: string;
}

export function ExportJsonButton({ data, filename = 'antivirals_export' }: ExportJsonButtonProps) {
  const handleExport = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleExport} className="export-button export-json">
      <Download size={18} />
      Export JSON
    </button>
  );
}
