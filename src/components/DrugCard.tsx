import { useNavigate, Link } from 'react-router-dom';
import { ExternalLink, ChevronRight } from 'lucide-react';
import type { AntiviralEntry } from '../types';
import { getClinicalPhase, getPhaseLabel, getApprovalRegions } from '../types';
import { toDrugSlug, toVirusSlug } from '../utils/drugSlug';

interface DrugCardProps {
  drug: AntiviralEntry;
  onClick?: () => void;
}

export function DrugCard({ drug, onClick }: DrugCardProps) {
  const navigate = useNavigate();
  const phase = getClinicalPhase(drug);
  const approvals = getApprovalRegions(drug);

  // Generate a simple description based on the drug's data
  const getDescription = () => {
    const parts: string[] = [];

    if (drug.mechanism) {
      parts.push(drug.mechanism);
    }

    if (drug.target) {
      parts.push(`targeting ${drug.target}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'Mechanism not specified';
  };

  const handleClick = () => {
    navigate(`/drug/${toDrugSlug(drug.drugNormalized)}`);
    onClick?.();
  };

  return (
    <div className="drug-card" onClick={handleClick}>
      <div className="drug-card-header">
        <h3 className="drug-card-name">{drug.drug}</h3>
        <span className={`phase-badge phase-${phase}`}>
          {getPhaseLabel(phase)}
        </span>
      </div>

      <div className="drug-card-virus">
        <span className="virus-label">Target:</span>
        <Link
          to={`/virus/${toVirusSlug(drug.virusShort)}`}
          className="virus-name"
          onClick={(e) => e.stopPropagation()}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          {drug.virusLong || drug.virusShort}
        </Link>
      </div>

      <p className="drug-card-description">{getDescription()}</p>

      {approvals.length > 0 && (
        <div className="drug-card-approvals">
          <span className="approvals-label">Approved in:</span>
          <div className="approval-badges">
            {approvals.map((region) => (
              <span key={region} className="approval-badge-small">
                {region}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="drug-card-footer">
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(drug.drug + ' antiviral')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="card-link"
          onClick={(e) => e.stopPropagation()}
        >
          Learn more <ExternalLink size={14} />
        </a>
        <button className="card-details-btn">
          Details <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

interface DrugCardGridProps {
  drugs: AntiviralEntry[];
  onDrugClick?: (drug: AntiviralEntry) => void;
}

export function DrugCardGrid({ drugs, onDrugClick }: DrugCardGridProps) {
  return (
    <div className="drug-card-grid">
      {drugs.map((drug) => (
        <DrugCard
          key={drug.id}
          drug={drug}
          onClick={() => onDrugClick?.(drug)}
        />
      ))}
    </div>
  );
}
