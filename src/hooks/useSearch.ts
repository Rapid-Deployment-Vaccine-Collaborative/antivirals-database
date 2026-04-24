import { useMemo } from 'react';
import Fuse from 'fuse.js';
import type { AntiviralEntry, FilterState, ClinicalPhase } from '../types';
import { getClinicalPhase } from '../types';

interface UseSearchOptions {
  drugs: AntiviralEntry[];
  filters: FilterState;
}

export function useSearch({ drugs, filters }: UseSearchOptions) {
  // Create Fuse instance for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(drugs, {
      keys: [
        { name: 'drug', weight: 2 },
        { name: 'drugNormalized', weight: 2 },
        { name: 'virusShort', weight: 1.5 },
        { name: 'virusLong', weight: 1.5 },
        { name: 'mechanism', weight: 1 },
        { name: 'target', weight: 1 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: true,
    });
  }, [drugs]);

  // Apply all filters
  const filteredDrugs = useMemo(() => {
    let results = drugs;

    // Apply text search
    if (filters.searchQuery.trim()) {
      const searchResults = fuse.search(filters.searchQuery);
      results = searchResults.map((r) => r.item);
    }

    // Filter by virus
    if (filters.viruses.length > 0) {
      results = results.filter((drug) =>
        filters.viruses.includes(drug.virusShort)
      );
    }

    // Filter by mechanism
    if (filters.mechanisms.length > 0) {
      results = results.filter((drug) =>
        filters.mechanisms.includes(drug.mechanism)
      );
    }

    // Filter by clinical phase
    if (filters.phases.length > 0) {
      results = results.filter((drug) => {
        const phase = getClinicalPhase(drug);
        return filters.phases.includes(phase);
      });
    }

    // Filter by approval region
    if (filters.approvals.length > 0) {
      results = results.filter((drug) =>
        filters.approvals.some((region) => drug.approvals[region])
      );
    }

    return results;
  }, [drugs, filters, fuse]);

  // Get unique values for filter options based on current results
  const filterOptions = useMemo(() => {
    const viruses = new Set<string>();
    const mechanisms = new Set<string>();
    const phases = new Set<ClinicalPhase>();

    filteredDrugs.forEach((drug) => {
      viruses.add(drug.virusShort);
      if (drug.mechanism) mechanisms.add(drug.mechanism);
      phases.add(getClinicalPhase(drug));
    });

    return {
      viruses: Array.from(viruses).sort(),
      mechanisms: Array.from(mechanisms).sort(),
      phases: Array.from(phases),
    };
  }, [filteredDrugs]);

  return {
    results: filteredDrugs,
    totalCount: filteredDrugs.length,
    filterOptions,
  };
}
