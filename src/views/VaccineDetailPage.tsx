import { useParams, Link } from 'react-router-dom';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { useAntiviralsData } from '../hooks/useAntiviralsData';
import { findVaccineBySlug, toVirusSlug } from '../utils/drugSlug';
import { getVaccinePhaseLabel } from '../types';
import type { VaccineEntry, VaccinePhase } from '../types';

export function VaccineDetailPage() {
  const { vaccineSlug } = useParams<{ vaccineSlug: string }>();
  const { vaccines, loading, error } = useAntiviralsData();

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2 className="spinner" size={48} />
        <p>Loading vaccine data...</p>
      </div>
    );
  }

  if (error || !vaccines) {
    return (
      <div className="error-screen">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
      </div>
    );
  }

  const entry = findVaccineBySlug(vaccines.vaccines, vaccineSlug ?? '');

  if (!entry) {
    return (
      <div className="drug-page-not-found">
        <AlertCircle size={48} />
        <h2>Vaccine not found</h2>
        <p>No vaccine found for "{vaccineSlug}"</p>
        <Link to="/vaccines" className="back-btn">← Back to Vaccine Database</Link>
      </div>
    );
  }

  return <VaccineDetailContent entry={entry} />;
}

function VaccineDetailContent({ entry }: { entry: VaccineEntry }) {
  const stages: VaccinePhase[] = ['phase1', 'phase2', 'phase3', 'approved'];
  const reachedRank: Record<VaccinePhase | 'na', number> = {
    na: 0,
    phase1: 1,
    phase2: 2,
    phase3: 3,
    approved: 4,
  };
  const maxRank = reachedRank[entry.maxPhase];

  return (
    <div className="drug-page">
      <header className="drug-page-header">
        <Link to="/vaccines" className="back-btn">← Back to Vaccine Database</Link>
        <h1 className="drug-page-title">{entry.vaccine}</h1>
        <p className="drug-page-subtitle">
          {entry.type || 'Unknown type'} · {entry.vddbId}
        </p>
      </header>

      <section className="drug-virus-section">
        <h2>Target & Classification</h2>
        <div className="identifier-grid">
          <div className="identifier-row">
            <label>Virus:</label>
            <div className="identifier-value">
              <Link
                to={`/virus/${toVirusSlug(entry.virusShort)}`}
                className="virus-badge"
                style={{ textDecoration: 'none' }}
              >
                {entry.virusShort}
              </Link>
              <span style={{ marginLeft: '0.5rem' }}>{entry.virusLong}</span>
            </div>
          </div>
          <div className="identifier-row">
            <label>Type:</label>
            <div className="identifier-value">{entry.type || '—'}</div>
          </div>
          <div className="identifier-row">
            <label>Diseases:</label>
            <div className="identifier-value">{entry.diseases.join('; ') || '—'}</div>
          </div>
          <div className="identifier-row">
            <label>Max Phase:</label>
            <div className="identifier-value">
              <span className={`phase-badge phase-${entry.maxPhase}`}>
                {getVaccinePhaseLabel(entry.maxPhase)}
              </span>
              {entry.approved && (
                <span className="approval-badge" style={{ marginLeft: '0.5rem' }}>
                  Phase 4 reached
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="drug-virus-section">
        <h2>Clinical Development</h2>
        <div className="clinical-timeline">
          {stages.map((stage) => (
            <div
              key={stage}
              className={`timeline-stage ${reachedRank[stage] <= maxRank ? 'completed' : ''}`}
            >
              <div className="stage-dot" />
              <span>{getVaccinePhaseLabel(stage)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="drug-virus-section">
        <h2>
          Clinical Trials
          <span className="virus-count-badge">{entry.trials.length}</span>
        </h2>
        {entry.secondaryTrialCount > 0 && (
          <p style={{ color: 'var(--color-text-secondary, #6b7280)', fontSize: '0.875rem', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
            Note: {entry.secondaryTrialCount} additional source trial{entry.secondaryTrialCount === 1 ? '' : 's'} listed this vaccine
            in studies of unrelated viruses (e.g. as a comparator, adjunct, or in coadministration trials with other vaccines).
            Those trials are not shown here.
          </p>
        )}
        <div className="table-wrapper">
          <table className="drug-table">
            <thead>
              <tr>
                <th>NCT ID</th>
                <th>Phase</th>
                <th>Disease / Condition</th>
              </tr>
            </thead>
            <tbody>
              {entry.trials.map((t, i) => (
                <tr key={`${t.nctId}-${i}`}>
                  <td>
                    <a
                      href={`https://clinicaltrials.gov/study/${t.nctId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ref-link"
                    >
                      {t.nctId} <ExternalLink size={11} />
                    </a>
                  </td>
                  <td>
                    <span className={`phase-badge phase-${t.phase}`}>
                      {getVaccinePhaseLabel(t.phase)}
                    </span>
                  </td>
                  <td>{t.disease}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
