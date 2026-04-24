import { useState, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Loader2, LayoutGrid, Table, BarChart3, Info } from 'lucide-react';
import {
  SearchBar,
  FilterPanel,
  DrugTable,
  DrugCardGrid,
  PipelineChart,
  PipelineStats,
  ExportButton,
  ViralFamiliesTable,
} from './components';
import { useAntiviralsData } from './hooks/useAntiviralsData';
import { useSearch } from './hooks/useSearch';
import type { FilterState, AntiviralEntry, ViewMode } from './types';
import { toDrugSlug } from './utils/drugSlug';
import { DrugPage } from './views/DrugPage';
import { VirusPage } from './views/VirusPage';
import './App.css';

const initialFilters: FilterState = {
  searchQuery: '',
  viruses: [],
  mechanisms: [],
  phases: [],
  approvals: [],
};

function Navbar() {
  return (
    <nav className="app-navbar">
      <div className="navbar-content">
        <div className="navbar-brand">
          <span className="navbar-title">RaDVaC Antivirals</span>
        </div>
        <div className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
            Antiviral database
          </NavLink>
          <NavLink to="/viral-families" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
            Virus Taxonomy
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

function ViralFamiliesPage() {
  return (
    <div className="app">
      <main className="vfp-main">
        <ViralFamiliesTable />
      </main>
    </div>
  );
}

function Dashboard() {
  const { antivirals, metadata, loading, error } = useAntiviralsData();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [viewMode, setViewMode] = useState<ViewMode>('researcher');
  const [showCharts, setShowCharts] = useState(false);
  const navigate = useNavigate();

  const { results, totalCount } = useSearch({
    drugs: antivirals?.drugs || [],
    filters,
  });

  const handleSearchChange = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const handleDrugClick = useCallback((drug: AntiviralEntry) => {
    navigate(`/drug/${toDrugSlug(drug.drugNormalized)}`);
  }, [navigate]);

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2 className="spinner" size={48} />
        <p>Loading antiviral data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
        <p>Make sure the data files are present in /public/data/</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Antivirals Dashboard</h1>
            <p className="header-subtitle">
              Explore antiviral compounds and drug repurposing candidates
            </p>
          </div>
          <div className="header-meta">
            {metadata && (
              <span className="last-updated">
                Data updated: {new Date(metadata.generatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      {antivirals && <PipelineStats drugs={results} />}

      {/* Main Content */}
      <main className="app-main">
        {/* Sidebar with filters */}
        <aside className="app-sidebar">
          <FilterPanel
            filters={filters}
            onFilterChange={setFilters}
            availableViruses={antivirals?.viruses || []}
            availableMechanisms={antivirals?.mechanisms || []}
          />
        </aside>

        {/* Main content area */}
        <div className="app-content">
          {/* Toolbar */}
          <div className="content-toolbar">
            <SearchBar
              value={filters.searchQuery}
              onChange={handleSearchChange}
              resultCount={totalCount}
            />

            <div className="toolbar-actions">
              {/* View Mode Toggle */}
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'public' ? 'active' : ''}`}
                  onClick={() => setViewMode('public')}
                  title="Card View (Public)"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  className={`view-btn ${viewMode === 'researcher' ? 'active' : ''}`}
                  onClick={() => setViewMode('researcher')}
                  title="Table View (Researcher)"
                >
                  <Table size={18} />
                </button>
                <button
                  className={`view-btn ${showCharts ? 'active' : ''}`}
                  onClick={() => setShowCharts(!showCharts)}
                  title="Show Charts"
                >
                  <BarChart3 size={18} />
                </button>
              </div>

              <ExportButton data={results} />
            </div>
          </div>

          {/* Charts Section */}
          {showCharts && antivirals && (
            <div className="charts-section">
              <PipelineChart drugs={results} />
            </div>
          )}

          {/* Results */}
          <div className="results-section">
            {results.length === 0 ? (
              <div className="no-results">
                <Info size={48} />
                <h3>No results found</h3>
                <p>Try adjusting your search or filters</p>
              </div>
            ) : viewMode === 'public' ? (
              <DrugCardGrid
                drugs={results.slice(0, 50)}
                onDrugClick={handleDrugClick}
              />
            ) : (
              <DrugTable
                data={results}
                onRowClick={handleDrugClick}
                showResearcherColumns={true}
              />
            )}

            {viewMode === 'public' && results.length > 50 && (
              <div className="load-more-hint">
                Showing 50 of {results.length.toLocaleString()} results.
                Switch to table view to see all results.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          RaDVaC Antivirals Dashboard | Data sources: drugvirus.info, FDA, DrugCentral, AntiviralDb
        </p>
        <p>
          <a href="https://radvac.org" target="_blank" rel="noopener noreferrer">
            radvac.org
          </a>
          {' | '}
          <a
            href="https://github.com/radvac"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/viral-families" element={<ViralFamiliesPage />} />
        <Route path="/drug/:drugSlug" element={<DrugPage />} />
        <Route path="/virus/:virusSlug" element={<VirusPage />} />
      </Routes>
    </>
  );
}

export default App;
