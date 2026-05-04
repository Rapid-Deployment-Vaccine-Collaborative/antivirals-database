import { useMemo } from 'react';
import Fuse from 'fuse.js';
import type { VaccineEntry, VaccineFilterState, VaccinePhase } from '../types';

interface UseVaccineSearchOptions {
  vaccines: VaccineEntry[];
  filters: VaccineFilterState;
}

export function useVaccineSearch({ vaccines, filters }: UseVaccineSearchOptions) {
  const fuse = useMemo(() => {
    return new Fuse(vaccines, {
      keys: [
        { name: 'vaccine', weight: 2 },
        { name: 'vaccineNormalized', weight: 2 },
        { name: 'virusLong', weight: 1.5 },
        { name: 'virusShort', weight: 1.5 },
        { name: 'type', weight: 1 },
        { name: 'diseases', weight: 1 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: true,
    });
  }, [vaccines]);

  const filteredVaccines = useMemo(() => {
    let results = vaccines;

    if (filters.searchQuery.trim()) {
      const searchResults = fuse.search(filters.searchQuery);
      results = searchResults.map((r) => r.item);
    }

    if (filters.viruses.length > 0) {
      results = results.filter((v) => filters.viruses.includes(v.virusShort));
    }

    if (filters.types.length > 0) {
      results = results.filter((v) => filters.types.includes(v.type));
    }

    if (filters.phases.length > 0) {
      results = results.filter((v) => filters.phases.includes(v.maxPhase));
    }

    if (filters.approvedOnly) {
      results = results.filter((v) => v.approved);
    }

    return results;
  }, [vaccines, filters, fuse]);

  const filterOptions = useMemo(() => {
    const viruses = new Set<string>();
    const types = new Set<string>();
    const phases = new Set<VaccinePhase | 'na'>();

    filteredVaccines.forEach((v) => {
      viruses.add(v.virusShort);
      if (v.type) types.add(v.type);
      phases.add(v.maxPhase);
    });

    return {
      viruses: Array.from(viruses).sort(),
      types: Array.from(types).sort(),
      phases: Array.from(phases),
    };
  }, [filteredVaccines]);

  return {
    results: filteredVaccines,
    totalCount: filteredVaccines.length,
    filterOptions,
  };
}
