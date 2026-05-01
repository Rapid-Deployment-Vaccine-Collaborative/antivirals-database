import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { useAntiviralsData } from '../hooks/useAntiviralsData';
import { findDrugBySlug, toVirusSlug } from '../utils/drugSlug';
import { MoleculeViewer } from '../components/MoleculeViewer';
import { Molecule3DViewer } from '../components/Molecule3DViewer';
import { getClinicalPhase, getPhaseLabel, getApprovalRegions } from '../types';
import type { AntiviralEntry } from '../types';
import { parseReferenceIdentifiers } from '../utils/parseReferenceIdentifiers';

export function DrugPage() {
  const { drugSlug } = useParams<{ drugSlug: string }>();
  const { antivirals, loading, error } = useAntiviralsData();

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2 className="spinner" size={48} />
        <p>Loading antiviral data...</p>
      </div>
    );
  }

  if (error || !antivirals) {
    return (
      <div className="error-screen">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
      </div>
    );
  }

  const drugEntries = findDrugBySlug(antivirals.drugs, drugSlug ?? '');

  if (drugEntries.length === 0) {
    return (
      <div className="drug-page-not-found">
        <AlertCircle size={48} />
        <h2>Drug not found</h2>
        <p>No drug found for "{drugSlug}"</p>
        <Link to="/" className="back-btn">← Back to Dashboard</Link>
      </div>
    );
  }

  const rep = drugEntries[0];

  return <DrugPageContent rep={rep} drugEntries={drugEntries} />;
}

function DrugPageContent({
  rep,
  drugEntries,
}: {
  rep: AntiviralEntry;
  drugEntries: AntiviralEntry[];
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Collect unique mechanisms across all virus entries
  const mechanisms = [...new Set(drugEntries.map((e) => e.mechanism).filter(Boolean))];

  return (
    <div className="drug-page">
      {/* Header */}
      <header className="drug-page-header">
        <Link to="/" className="back-btn">← Back to Dashboard</Link>
        <h1 className="drug-page-title">{rep.drug}</h1>
        {mechanisms.length > 0 && (
          <p className="drug-page-subtitle">{mechanisms.join(' · ')}</p>
        )}
      </header>

      {/* Structures */}
      <section className="drug-structures">
        <div className="structure-panel">
          <h2>2D Structure</h2>
          {rep.smiles ? (
            <MoleculeViewer smiles={rep.smiles} width={380} height={300} />
          ) : (
            <div className="no-structure">Structure not available</div>
          )}
        </div>
        <div className="structure-panel">
          <h2>3D Structure</h2>
          <Molecule3DViewer
            pubchemCid={rep.pubchemCid}
            drugName={rep.drug}
            width={380}
            height={300}
          />
        </div>
      </section>

      {/* Chemical Identifiers */}
      <section className="drug-identifiers">
        <h2>Chemical Identifiers</h2>
        <div className="identifier-grid">
          {rep.smiles && (
            <div className="identifier-row">
              <label>SMILES:</label>
              <div className="identifier-value">
                <code title={rep.smiles}>
                  {rep.smiles.length > 70 ? rep.smiles.substring(0, 70) + '…' : rep.smiles}
                </code>
                <button
                  onClick={() => copyToClipboard(rep.smiles, 'smiles')}
                  className="copy-btn"
                  title="Copy SMILES"
                >
                  {copiedField === 'smiles' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}
          {rep.inchiKey && (
            <div className="identifier-row">
              <label>InChI Key:</label>
              <div className="identifier-value">
                <code>{rep.inchiKey}</code>
                <button
                  onClick={() => copyToClipboard(rep.inchiKey, 'inchiKey')}
                  className="copy-btn"
                  title="Copy InChI Key"
                >
                  {copiedField === 'inchiKey' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="external-links-grid" style={{ marginTop: '1rem' }}>
          {rep.pubchemCid && (
            <a
              href={`https://pubchem.ncbi.nlm.nih.gov/compound/${rep.pubchemCid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link-card"
            >
              <span>PubChem</span>
              <ExternalLink size={16} />
            </a>
          )}
          {rep.drugbankId && (
            <a
              href={`https://go.drugbank.com/drugs/${rep.drugbankId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link-card"
            >
              <span>DrugBank</span>
              <ExternalLink size={16} />
            </a>
          )}
          <a
            href={`https://clinicaltrials.gov/search?term=${encodeURIComponent(rep.drug)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link-card"
          >
            <span>ClinicalTrials.gov</span>
            <ExternalLink size={16} />
          </a>
          <a
            href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(rep.drug + ' antiviral')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link-card"
          >
            <span>PubMed</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </section>

      {/* Per-virus clinical development */}
      <section className="drug-virus-section">
        <h2>
          Clinical Development by Virus
          <span className="virus-count-badge">{drugEntries.length}</span>
        </h2>
        <div className="virus-cards-grid">
          {drugEntries.map((entry) => (
            <VirusClinicalCard key={entry.id} entry={entry} />
          ))}
        </div>
      </section>
    </div>
  );
}

function VirusClinicalCard({ entry }: { entry: AntiviralEntry }) {
  const phase = getClinicalPhase(entry);
  const approvalRegions = getApprovalRegions(entry);

  return (
    <div className="virus-clinical-card">
      <div className="virus-card-header">
        <div>
          <Link
            to={`/virus/${toVirusSlug(entry.virusShort)}`}
            className="virus-card-name"
            onClick={(e) => e.stopPropagation()}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            {entry.virusLong || entry.virusShort}
          </Link>
          {entry.virusLong && (
            <div className="virus-card-short">{entry.virusShort}</div>
          )}
          {entry.target && (
            <div className="virus-card-target">Target: {entry.target}</div>
          )}
        </div>
        <span className={`phase-badge phase-${phase}`}>
          {getPhaseLabel(phase)}
        </span>
      </div>

      {/* Clinical timeline */}
      <div className="clinical-timeline">
        <div className={`timeline-stage ${entry.preclinical ? 'completed' : ''}`}>
          <div className="stage-dot" />
          <span>Preclinical</span>
        </div>
        <div className={`timeline-stage ${entry.phase2Initiated ? 'completed' : ''}`}>
          <div className="stage-dot" />
          <span>Phase 2</span>
          {entry.phase2Result && (
            <span className={`result-badge result-${entry.phase2Result.toLowerCase()}`}>
              {entry.phase2Result}
            </span>
          )}
        </div>
        <div className={`timeline-stage ${entry.phase3Initiated ? 'completed' : ''}`}>
          <div className="stage-dot" />
          <span>Phase 3</span>
          {entry.phase3Result && (
            <span className={`result-badge result-${entry.phase3Result.toLowerCase()}`}>
              {entry.phase3Result}
            </span>
          )}
        </div>
        <div className={`timeline-stage ${approvalRegions.length > 0 ? 'completed' : ''}`}>
          <div className="stage-dot" />
          <span>Approved</span>
        </div>
      </div>

      {/* Approval regions */}
      {approvalRegions.length > 0 && (
        <div className="approval-badges" style={{ marginTop: '0.5rem' }}>
          {approvalRegions.map((region) => (
            <span key={region} className="approval-badge">
              {region}
            </span>
          ))}
        </div>
      )}

      {/* References */}
      {(entry.references.phase2 || entry.references.phase3 || entry.references.approval || entry.references.drugvirusInfo) && (
        <div className="virus-card-refs">
          {entry.references.phase2 &&
            parseReferenceIdentifiers(entry.references.phase2).map(({ label, url }, i) =>
              url ? (
                <a key={`p2-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="ref-link">
                  Phase 2 ref ({label}) <ExternalLink size={11} />
                </a>
              ) : (
                <span key={`p2-${i}`} className="ref-label">Phase 2 ref: {label}</span>
              )
            )}
          {entry.references.phase3 &&
            parseReferenceIdentifiers(entry.references.phase3).map(({ label, url }, i) =>
              url ? (
                <a key={`p3-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="ref-link">
                  Phase 3 ref ({label}) <ExternalLink size={11} />
                </a>
              ) : (
                <span key={`p3-${i}`} className="ref-label">Phase 3 ref: {label}</span>
              )
            )}
          {entry.references.approval &&
            parseReferenceIdentifiers(entry.references.approval).map(({ label, url }, i) =>
              url ? (
                <a key={`ap-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="ref-link">
                  Approval ref ({label}) <ExternalLink size={11} />
                </a>
              ) : (
                <span key={`ap-${i}`} className="ref-label">Approval ref: {label}</span>
              )
            )}
          {entry.references.drugvirusInfo &&
            parseReferenceIdentifiers(entry.references.drugvirusInfo).map(({ label, url }, i) =>
              url ? (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="ref-link">
                  {label} <ExternalLink size={11} />
                </a>
              ) : (
                <span key={i} className="ref-label">{label}</span>
              )
            )}
        </div>
      )}
    </div>
  );
}
