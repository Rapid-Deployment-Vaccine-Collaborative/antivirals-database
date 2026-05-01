import { X, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { AntiviralEntry } from '../types';
import { getClinicalPhase, getPhaseLabel, getApprovalRegions } from '../types';
import { MoleculeViewer } from './MoleculeViewer';
import { parseReferenceIdentifiers } from '../utils/parseReferenceIdentifiers';

function renderRefTokens(raw: string) {
  return parseReferenceIdentifiers(raw).map(({ label, url }, i) => {
    const sep = i > 0 ? '; ' : '';
    return url ? (
      <span key={i}>{sep}<a href={url} target="_blank" rel="noopener noreferrer">{label}</a></span>
    ) : (
      <span key={i}>{sep}{label}</span>
    );
  });
}

interface DrugDetailProps {
  drug: AntiviralEntry;
  onClose: () => void;
}

export function DrugDetail({ drug, onClose }: DrugDetailProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const phase = getClinicalPhase(drug);
  const approvalRegions = getApprovalRegions(drug);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="drug-detail-overlay" onClick={onClose}>
      <div className="drug-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="drug-detail-header">
          <div>
            <h2>{drug.drug}</h2>
            <p className="drug-detail-subtitle">
              vs. <strong>{drug.virusLong}</strong> ({drug.virusShort})
            </p>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="drug-detail-content">
          {/* Status badges */}
          <div className="drug-detail-badges">
            <span className={`phase-badge phase-${phase}`}>
              {getPhaseLabel(phase)}
            </span>
            {approvalRegions.map((region) => (
              <span key={region} className="approval-badge">
                {region}
              </span>
            ))}
          </div>

          {/* Main info grid */}
          <div className="drug-detail-grid">
            {/* Left column - Drug info */}
            <div className="drug-detail-section">
              <h3>Drug Information</h3>

              <div className="detail-row">
                <label>Target:</label>
                <span>{drug.target || 'Not specified'}</span>
              </div>

              <div className="detail-row">
                <label>Mechanism of Action:</label>
                <span>{drug.mechanism || 'Not specified'}</span>
              </div>

              <h4>Clinical Development</h4>
              <div className="clinical-timeline">
                <div className={`timeline-stage ${drug.preclinical ? 'completed' : ''}`}>
                  <div className="stage-dot" />
                  <span>Preclinical</span>
                  {drug.preclinical && <Check size={14} className="stage-check" />}
                </div>
                <div className={`timeline-stage ${drug.phase2Initiated ? 'completed' : ''}`}>
                  <div className="stage-dot" />
                  <span>Phase 2</span>
                  {drug.phase2Result && (
                    <span className={`result-badge result-${drug.phase2Result.toLowerCase()}`}>
                      {drug.phase2Result}
                    </span>
                  )}
                </div>
                <div className={`timeline-stage ${drug.phase3Initiated ? 'completed' : ''}`}>
                  <div className="stage-dot" />
                  <span>Phase 3</span>
                  {drug.phase3Result && (
                    <span className={`result-badge result-${drug.phase3Result.toLowerCase()}`}>
                      {drug.phase3Result}
                    </span>
                  )}
                </div>
                <div className={`timeline-stage ${approvalRegions.length > 0 ? 'completed' : ''}`}>
                  <div className="stage-dot" />
                  <span>Approved</span>
                </div>
              </div>
            </div>

            {/* Right column - Structure */}
            <div className="drug-detail-section">
              <h3>Molecular Structure</h3>
              {drug.smiles ? (
                <MoleculeViewer smiles={drug.smiles} />
              ) : (
                <div className="no-structure">
                  Structure not available
                </div>
              )}
            </div>
          </div>

          {/* Chemical identifiers */}
          <div className="drug-detail-section">
            <h3>Chemical Identifiers</h3>
            <div className="identifier-grid">
              {drug.smiles && (
                <div className="identifier-row">
                  <label>SMILES:</label>
                  <div className="identifier-value">
                    <code>{drug.smiles.length > 60 ? drug.smiles.substring(0, 60) + '...' : drug.smiles}</code>
                    <button
                      onClick={() => copyToClipboard(drug.smiles, 'smiles')}
                      className="copy-btn"
                      title="Copy SMILES"
                    >
                      {copiedField === 'smiles' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
              {drug.inchiKey && (
                <div className="identifier-row">
                  <label>InChI Key:</label>
                  <div className="identifier-value">
                    <code>{drug.inchiKey}</code>
                    <button
                      onClick={() => copyToClipboard(drug.inchiKey, 'inchiKey')}
                      className="copy-btn"
                      title="Copy InChI Key"
                    >
                      {copiedField === 'inchiKey' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* External Links */}
          <div className="drug-detail-section">
            <h3>External Resources</h3>
            <div className="external-links-grid">
              {drug.pubchemCid && (
                <a
                  href={`https://pubchem.ncbi.nlm.nih.gov/compound/${drug.pubchemCid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link-card"
                >
                  <span>PubChem</span>
                  <ExternalLink size={16} />
                </a>
              )}
              {drug.drugbankId && (
                <a
                  href={`https://go.drugbank.com/drugs/${drug.drugbankId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link-card"
                >
                  <span>DrugBank</span>
                  <ExternalLink size={16} />
                </a>
              )}
              <a
                href={`https://clinicaltrials.gov/search?term=${encodeURIComponent(drug.drug)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="external-link-card"
              >
                <span>ClinicalTrials.gov</span>
                <ExternalLink size={16} />
              </a>
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(drug.drug + ' ' + drug.virusShort)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="external-link-card"
              >
                <span>PubMed Search</span>
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          {/* References */}
          {(drug.references.phase2 || drug.references.phase3 || drug.references.approval) && (
            <div className="drug-detail-section">
              <h3>References</h3>
              <div className="references-list">
                {drug.references.phase2 && (
                  <div className="reference-item">
                    <label>Phase 2:</label>
                    <span>{renderRefTokens(drug.references.phase2)}</span>
                  </div>
                )}
                {drug.references.phase3 && (
                  <div className="reference-item">
                    <label>Phase 3:</label>
                    <span>{renderRefTokens(drug.references.phase3)}</span>
                  </div>
                )}
                {drug.references.approval && (
                  <div className="reference-item">
                    <label>Approval:</label>
                    <span>{renderRefTokens(drug.references.approval)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
