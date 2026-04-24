import type { AntiviralEntry } from '../types';

export function toDrugSlug(drugNormalized: string): string {
  return drugNormalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function findDrugBySlug(drugs: AntiviralEntry[], slug: string): AntiviralEntry[] {
  return drugs.filter((d) => toDrugSlug(d.drugNormalized) === slug);
}

export function toVirusSlug(virusShort: string): string {
  return virusShort
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function findEntriesByVirusSlug(drugs: AntiviralEntry[], slug: string): AntiviralEntry[] {
  return drugs.filter((d) => toVirusSlug(d.virusShort) === slug);
}
