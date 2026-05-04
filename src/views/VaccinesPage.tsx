import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Info } from 'lucide-react';
import { SearchBar, VaccineTable, VaccineFilterPanel } from '../components';
import { useAntiviralsData } from '../hooks/useAntiviralsData';
import { useVaccineSearch } from '../hooks/useVaccineSearch';
import type { VaccineEntry, VaccineFilterState, VaccinePhase } from '../types';
import { toVaccineSlug } from '../utils/drugSlug';

const initialFilters: VaccineFilterState = {
  searchQuery: '',
  viruses: [],
  types: [],
  phases: [],
  approvedOnly: false,
};

export function VaccinesPage() {
  const { vaccines, loading, error } = useAntiviralsData();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<VaccineFilterState>(() => {
    const viruses = searchParams.get('viruses')?.split(',').filter(Boolean) ?? [];
    const phases = (searchParams.get('phases')?.split(',').filter(Boolean) ?? []) as VaccinePhase[];
    const approvedOnly = searchParams.get('approved') === '1';
    if (viruses.length === 0 && phases.length === 0 && !approvedOnly) return initialFilters;
    return { ...initialFilters, viruses, phases, approvedOnly };
  });
  const navigate = useNavigate();

  const { results, totalCount } = useVaccineSearch({
    vaccines: vaccines?.vaccines || [],
    filters,
  });

  const handleSearchChange = useCallback((q: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: q }));
  }, []);

  const handleRowClick = useCallback(
    (v: VaccineEntry) => navigate(`/vaccine/${toVaccineSlug(v.vddbId)}`),
    [navigate]
  );

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2 className="spinner" size={48} />
        <p>Loading vaccine data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Vaccine Database</h1>
            <p className="header-subtitle">
              {vaccines?.stats.totalVaccines.toLocaleString()} vaccines across{' '}
              {vaccines?.stats.totalTrials.toLocaleString()} clinical trials
            </p>
          </div>
          <div className="header-meta">
            {vaccines && (
              <span className="last-updated">Data updated: {vaccines.lastUpdated}</span>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <aside className="app-sidebar">
          <VaccineFilterPanel
            filters={filters}
            onFilterChange={setFilters}
            availableViruses={vaccines?.viruses || []}
            availableTypes={vaccines?.vaccineTypes || []}
          />
        </aside>

        <div className="app-content">
          <div className="content-toolbar">
            <SearchBar
              value={filters.searchQuery}
              onChange={handleSearchChange}
              placeholder="Search vaccines, viruses, types, diseases..."
              resultCount={totalCount}
            />
          </div>

          <div className="results-section">
            {results.length === 0 ? (
              <div className="no-results">
                <Info size={48} />
                <h3>No vaccines found</h3>
                <p>Try adjusting your search or filters</p>
              </div>
            ) : (
              <VaccineTable data={results} onRowClick={handleRowClick} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
