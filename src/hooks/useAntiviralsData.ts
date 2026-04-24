import { useState, useEffect } from 'react';
import type { AntiviralsData, ApprovedCompoundsData, Metadata } from '../types';

interface DataState {
  antivirals: AntiviralsData | null;
  approvedCompounds: ApprovedCompoundsData | null;
  metadata: Metadata | null;
  loading: boolean;
  error: string | null;
}

export function useAntiviralsData() {
  const [state, setState] = useState<DataState>({
    antivirals: null,
    approvedCompounds: null,
    metadata: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [antiviralsRes, compoundsRes, metadataRes] = await Promise.all([
          fetch('/data/antivirals.json'),
          fetch('/data/approved_compounds.json'),
          fetch('/data/metadata.json'),
        ]);

        if (!antiviralsRes.ok || !compoundsRes.ok || !metadataRes.ok) {
          throw new Error('Failed to load data files');
        }

        const [antivirals, approvedCompounds, metadata] = await Promise.all([
          antiviralsRes.json() as Promise<AntiviralsData>,
          compoundsRes.json() as Promise<ApprovedCompoundsData>,
          metadataRes.json() as Promise<Metadata>,
        ]);

        setState({
          antivirals,
          approvedCompounds,
          metadata,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error occurred',
        }));
      }
    }

    loadData();
  }, []);

  return state;
}
