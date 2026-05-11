import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { useState } from 'react';
import type { FilterState, ClinicalPhase } from '../types';

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableViruses: string[];
  availableMechanisms: string[];
}

type ApprovalKey = 'fda' | 'europe' | 'japan' | 'china' | 'russia' | 'southKorea';

const APPROVAL_OPTIONS: { key: ApprovalKey; label: string }[] = [
  { key: 'fda', label: 'FDA (USA)' },
  { key: 'europe', label: 'EMA (Europe)' },
  { key: 'japan', label: 'PMDA (Japan)' },
  { key: 'china', label: 'NMPA (China)' },
  { key: 'russia', label: 'Russia' },
  { key: 'southKorea', label: 'South Korea' },
];

const PHASE_OPTIONS: { key: ClinicalPhase; label: string }[] = [
  { key: 'approved_fda', label: 'FDA approved' },
  { key: 'approved_other', label: 'Approved (other)' },
  { key: 'phase3', label: 'Phase 3' },
  { key: 'phase2', label: 'Phase 2' },
  { key: 'preclinical', label: 'Preclinical' },
];

export function FilterPanel({
  filters,
  onFilterChange,
  availableViruses,
  availableMechanisms,
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    phase: true,
    virus: false,
    mechanism: false,
    approval: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const hasActiveFilters =
    filters.viruses.length > 0 ||
    filters.mechanisms.length > 0 ||
    filters.phases.length > 0 ||
    filters.approvals.length > 0;

  const clearAllFilters = () => {
    onFilterChange({
      ...filters,
      viruses: [],
      mechanisms: [],
      phases: [],
      approvals: [],
    });
  };

  const toggleVirus = (virus: string) => {
    const newViruses = filters.viruses.includes(virus)
      ? filters.viruses.filter((v) => v !== virus)
      : [...filters.viruses, virus];
    onFilterChange({ ...filters, viruses: newViruses });
  };

  const toggleMechanism = (mechanism: string) => {
    const newMechanisms = filters.mechanisms.includes(mechanism)
      ? filters.mechanisms.filter((m) => m !== mechanism)
      : [...filters.mechanisms, mechanism];
    onFilterChange({ ...filters, mechanisms: newMechanisms });
  };

  const togglePhase = (phase: ClinicalPhase) => {
    const newPhases = filters.phases.includes(phase)
      ? filters.phases.filter((p) => p !== phase)
      : [...filters.phases, phase];
    onFilterChange({ ...filters, phases: newPhases });
  };

  const toggleApproval = (approval: 'fda' | 'europe' | 'japan' | 'china' | 'russia' | 'southKorea') => {
    const newApprovals = filters.approvals.includes(approval)
      ? filters.approvals.filter((a) => a !== approval)
      : [...filters.approvals, approval];
    onFilterChange({ ...filters, approvals: newApprovals });
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

      {/* Clinical Phase Filter */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('phase')}
        >
          <span>Clinical Phase</span>
          {filters.phases.length > 0 && (
            <span className="filter-count">{filters.phases.length}</span>
          )}
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
                <span className={`phase-badge phase-${option.key}`}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Virus Filter */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('virus')}
        >
          <span>Target Virus</span>
          {filters.viruses.length > 0 && (
            <span className="filter-count">{filters.viruses.length}</span>
          )}
          {expandedSections.virus ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expandedSections.virus && (
          <div className="filter-options filter-options-scroll">
            {availableViruses.slice(0, 50).map((virus) => (
              <label key={virus} className="filter-option">
                <input
                  type="checkbox"
                  checked={filters.viruses.includes(virus)}
                  onChange={() => toggleVirus(virus)}
                />
                <span>{virus}</span>
              </label>
            ))}
            {availableViruses.length > 50 && (
              <div className="filter-more">
                +{availableViruses.length - 50} more viruses
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mechanism Filter */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('mechanism')}
        >
          <span>Mechanism of Action</span>
          {filters.mechanisms.length > 0 && (
            <span className="filter-count">{filters.mechanisms.length}</span>
          )}
          {expandedSections.mechanism ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expandedSections.mechanism && (
          <div className="filter-options filter-options-scroll">
            {availableMechanisms.slice(0, 50).map((mechanism) => (
              <label key={mechanism} className="filter-option">
                <input
                  type="checkbox"
                  checked={filters.mechanisms.includes(mechanism)}
                  onChange={() => toggleMechanism(mechanism)}
                />
                <span>{mechanism}</span>
              </label>
            ))}
            {availableMechanisms.length > 50 && (
              <div className="filter-more">
                +{availableMechanisms.length - 50} more mechanisms
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approval Region Filter */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('approval')}
        >
          <span>Regulatory Approval</span>
          {filters.approvals.length > 0 && (
            <span className="filter-count">{filters.approvals.length}</span>
          )}
          {expandedSections.approval ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expandedSections.approval && (
          <div className="filter-options">
            {APPROVAL_OPTIONS.map((option) => (
              <label key={option.key} className="filter-option">
                <input
                  type="checkbox"
                  checked={filters.approvals.includes(option.key)}
                  onChange={() => toggleApproval(option.key)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
