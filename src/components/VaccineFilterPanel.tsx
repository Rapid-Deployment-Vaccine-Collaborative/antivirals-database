import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { useState } from 'react';
import type { VaccineFilterState, VaccinePhase } from '../types';

interface VaccineFilterPanelProps {
  filters: VaccineFilterState;
  onFilterChange: (filters: VaccineFilterState) => void;
  availableViruses: string[];
  availableTypes: string[];
}

const PHASE_OPTIONS: { key: VaccinePhase; label: string }[] = [
  { key: 'approved', label: 'Approved (P4)' },
  { key: 'phase3', label: 'Phase 3' },
  { key: 'phase2', label: 'Phase 2' },
  { key: 'phase1', label: 'Phase 1' },
];

export function VaccineFilterPanel({
  filters,
  onFilterChange,
  availableViruses,
  availableTypes,
}: VaccineFilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    phase: true,
    virus: false,
    type: false,
  });

  const toggleSection = (section: string) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const hasActiveFilters =
    filters.viruses.length > 0 ||
    filters.types.length > 0 ||
    filters.phases.length > 0 ||
    filters.approvedOnly;

  const clearAllFilters = () =>
    onFilterChange({ ...filters, viruses: [], types: [], phases: [], approvedOnly: false });

  const toggleVirus = (virus: string) => {
    const next = filters.viruses.includes(virus)
      ? filters.viruses.filter((v) => v !== virus)
      : [...filters.viruses, virus];
    onFilterChange({ ...filters, viruses: next });
  };

  const toggleType = (type: string) => {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFilterChange({ ...filters, types: next });
  };

  const togglePhase = (phase: VaccinePhase) => {
    const next = filters.phases.includes(phase)
      ? filters.phases.filter((p) => p !== phase)
      : [...filters.phases, phase];
    onFilterChange({ ...filters, phases: next });
  };

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h3>
          <Filter size={18} />
          Filters
        </h3>
        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="clear-filters-btn">
            <X size={14} />
            Clear all
          </button>
        )}
      </div>

      <div className="filter-section">
        <button className="filter-section-header" onClick={() => toggleSection('phase')}>
          <span>Max Clinical Phase</span>
          {filters.phases.length > 0 && <span className="filter-count">{filters.phases.length}</span>}
          {expandedSections.phase ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expandedSections.phase && (
          <div className="filter-options">
            {PHASE_OPTIONS.map((option) => (
              <label key={option.key} className="filter-option">
                <input
                  type="checkbox"
                  checked={filters.phases.includes(option.key)}
                  onChange={() => togglePhase(option.key)}
                />
                <span className={`phase-badge phase-${option.key}`}>{option.label}</span>
              </label>
            ))}
            <label className="filter-option">
              <input
                type="checkbox"
                checked={filters.approvedOnly}
                onChange={() => onFilterChange({ ...filters, approvedOnly: !filters.approvedOnly })}
              />
              <span>Approved only (Phase 4 reached)</span>
            </label>
          </div>
        )}
      </div>

      <div className="filter-section">
        <button className="filter-section-header" onClick={() => toggleSection('virus')}>
          <span>Target Virus</span>
          {filters.viruses.length > 0 && <span className="filter-count">{filters.viruses.length}</span>}
          {expandedSections.virus ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expandedSections.virus && (
          <div className="filter-options filter-options-scroll">
            {availableViruses.map((virus) => (
              <label key={virus} className="filter-option">
                <input
                  type="checkbox"
                  checked={filters.viruses.includes(virus)}
                  onChange={() => toggleVirus(virus)}
                />
                <span>{virus}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="filter-section">
        <button className="filter-section-header" onClick={() => toggleSection('type')}>
          <span>Vaccine Type</span>
          {filters.types.length > 0 && <span className="filter-count">{filters.types.length}</span>}
          {expandedSections.type ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expandedSections.type && (
          <div className="filter-options filter-options-scroll">
            {availableTypes.map((t) => (
              <label key={t} className="filter-option">
                <input
                  type="checkbox"
                  checked={filters.types.includes(t)}
                  onChange={() => toggleType(t)}
                />
                <span>{t}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
