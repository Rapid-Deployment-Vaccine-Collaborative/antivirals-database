import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Check, Minus } from 'lucide-react';
import { useAntiviralsData } from '../hooks/useAntiviralsData';
import { findEntriesByVirusSlug, toDrugSlug, toVirusSlug } from '../utils/drugSlug';
import { DrugTable } from '../components/DrugTable';
import { VIRUS_REGISTRY, type VirusInfo, type Pandemic } from '../components/ViralFamiliesTable';
import { getClinicalPhase } from '../types';
import type { AntiviralEntry } from '../types';

export function VirusPage() {
  const { virusSlug } = useParams<{ virusSlug: string }>();
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

  const slug = virusSlug ?? '';
  const info = VIRUS_REGISTRY[slug];

  // Try direct slug match first, then fall back to searching by registry codes.
  let entries = findEntriesByVirusSlug(antivirals.drugs, slug);
  if (entries.length === 0 && info) {
    const codeSlugs = new Set(info.codes.map(toVirusSlug));
    entries = antivirals.drugs.filter((d) => codeSlugs.has(toVirusSlug(d.virusShort)));
  }

  if (entries.length === 0) {
    if (info) {
      return <VirusStub info={info} />;
    }
    return (
      <div className="drug-page-not-found">
        <AlertCircle size={48} />
        <h2>Virus not found</h2>
        <p>No data found for "{slug}"</p>
        <Link to="/" className="back-btn">← Back to Dashboard</Link>
      </div>
    );
  }

  return <VirusPageContent entries={entries} info={info} />;
}

function PandemicBadge({ value }: { value: Pandemic }) {
  if (value === 'yes') {
    return (
      <span className="virus-pandemic-badge virus-pandemic-yes">
        <Check size={14} /> Pandemic potential
      </span>
    );
  }
  if (value === 'no') {
    return (
      <span className="virus-pandemic-plain">
        Not considered to have pandemic potential
      </span>
    );
  }
  return (
    <span className="virus-pandemic-badge virus-pandemic-na">
      <Minus size={14} /> Pandemic potential: not classified
    </span>
  );
}

function TaxonomyInfo({ info }: { info: VirusInfo }) {
  return (
    <dl className="virus-taxonomy">
      <div><dt>Section</dt><dd>{info.section}</dd></div>
      <div><dt>Family</dt><dd>{info.family}</dd></div>
      <div><dt>Genus</dt><dd><em>{info.genus}</em></dd></div>
    </dl>
  );
}

function VirusStub({ info }: { info: VirusInfo }) {
  return (
    <div className="drug-page">
      <header className="drug-page-header">
        <Link to="/" className="back-btn">← Back to Dashboard</Link>
        <h1 className="drug-page-title">{info.name}</h1>
        <p className="drug-page-subtitle">{info.family} &middot; <em>{info.genus}</em></p>
        <div className="virus-header-meta">
          <PandemicBadge value={info.pandemic} />
        </div>
      </header>

      <div style={{ padding: '0 1.5rem 2rem' }}>
        <TaxonomyInfo info={info} />
        <div className="virus-empty-state">
          <AlertCircle size={32} />
          <h2>No antiviral compounds listed</h2>
          <p>
            There are currently no approved drugs, clinical candidates, or preclinical
            compounds tracked in AntiviralDB for <strong>{info.name}</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

function VirusPageContent({ entries, info }: { entries: AntiviralEntry[]; info?: VirusInfo }) {
  const navigate = useNavigate();
  const rep = entries[0];

  const approved = entries.filter((e) => getClinicalPhase(e) === 'approved').length;
  const phase3 = entries.filter((e) => getClinicalPhase(e) === 'phase3').length;
  const phase2 = entries.filter((e) => getClinicalPhase(e) === 'phase2').length;
  const preclinical = entries.filter((e) => getClinicalPhase(e) === 'preclinical').length;

  const displayName = info?.name ?? rep.virusShort;
  const subtitle = info
    ? `${info.family} · ${info.genus}`
    : rep.virusLong && rep.virusLong !== rep.virusShort
    ? rep.virusLong
    : null;

  return (
    <div className="drug-page">
      <header className="drug-page-header">
        <Link to="/" className="back-btn">← Back to Dashboard</Link>
        <h1 className="drug-page-title">{displayName}</h1>
        {subtitle && <p className="drug-page-subtitle">{subtitle}</p>}
        {info && (
          <div className="virus-header-meta">
            <PandemicBadge value={info.pandemic} />
          </div>
        )}
      </header>

      <div className="pipeline-stats">
        <div className="stat-card stat-approved">
          <div className="stat-value">{approved}</div>
          <div className="stat-label">Approved Drugs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{phase3}</div>
          <div className="stat-label">Phase 3</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{phase2}</div>
          <div className="stat-label">Phase 2</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{preclinical}</div>
          <div className="stat-label">Preclinical</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{entries.length}</div>
          <div className="stat-label">Total Compounds</div>
        </div>
      </div>

      <div style={{ padding: '0 1.5rem 2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>
          Antiviral Compounds
        </h2>
        <DrugTable
          data={entries}
          onRowClick={(drug) => navigate(`/drug/${toDrugSlug(drug.drugNormalized)}`)}
          showResearcherColumns={true}
        />
      </div>
    </div>
  );
}
