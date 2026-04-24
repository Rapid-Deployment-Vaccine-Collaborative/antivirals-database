import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Minus } from 'lucide-react';
import { useAntiviralsData } from '../hooks/useAntiviralsData';
import { getClinicalPhase } from '../types';
import { toVirusSlug } from '../utils/drugSlug';

export type Pandemic = 'yes' | 'no' | 'na';

interface GenusRow {
  genus: string;
  viruses: string[];
  pandemic?: Pandemic; // overrides family-level when set
}

interface FamilyEntry {
  family: string;
  pandemic: Pandemic;
  genera: GenusRow[];
}

interface Section {
  label: string;
  families: FamilyEntry[];
}

export interface VirusInfo {
  name: string;
  family: string;
  genus: string;
  section: string;
  pandemic: Pandemic;
  codes: string[]; // virusShort codes in antivirals.json that belong to this virus
}

// Approved antiviral and vaccine data
// Antiviral: derived from antivirals.json (fda || europe || japan approval)
// Vaccine: from AntiviralDB Table 2 + public health sources
const APPROVAL_DB: Record<string, { antiviral: boolean; vaccine: boolean }> = {
  // DNA viruses — Anelloviridae
  'TTV':                          { antiviral: false, vaccine: false },
  'TTMV':                         { antiviral: false, vaccine: false },
  'TTMDV':                        { antiviral: false, vaccine: false },
  // DNA viruses — Parvoviridae
  'Parvovirus B19':               { antiviral: false, vaccine: false },
  'Human bocavirus':              { antiviral: false, vaccine: false },
  // DNA viruses — Polyomaviridae
  'MCPyV':                        { antiviral: false, vaccine: false },
  'JC virus':                     { antiviral: false, vaccine: false },
  'BK virus':                     { antiviral: false, vaccine: false },
  // DNA viruses — Papillomaviridae
  'HPV-16':                       { antiviral: true,  vaccine: true  },
  'HPV-18':                       { antiviral: true,  vaccine: true  },
  'HPV-6':                        { antiviral: true,  vaccine: true  },
  'HPV-11':                       { antiviral: true,  vaccine: true  },
  'HPV-5':                        { antiviral: true,  vaccine: false },
  'HPV-8':                        { antiviral: true,  vaccine: false },
  'Cutaneous HPVs':               { antiviral: false, vaccine: false },
  'HPV-1':                        { antiviral: false, vaccine: false },
  'HPV-41':                       { antiviral: false, vaccine: false },
  // DNA viruses — Adenoviridae
  'HAdV-A':                       { antiviral: false, vaccine: false },
  'HAdV-B':                       { antiviral: false, vaccine: false },
  'HAdV-C':                       { antiviral: false, vaccine: false },
  'HAdV-D':                       { antiviral: false, vaccine: false },
  'HAdV-E':                       { antiviral: false, vaccine: true  },
  'HAdV-F':                       { antiviral: false, vaccine: false },
  'HAdV-G':                       { antiviral: false, vaccine: false },
  // DNA viruses — Hepadnaviridae
  'HBV':                          { antiviral: true,  vaccine: true  },
  // DNA viruses — Orthoherpesviridae
  'HSV-1':                        { antiviral: true,  vaccine: false },
  'HSV-2':                        { antiviral: true,  vaccine: false },
  'VZV':                          { antiviral: true,  vaccine: true  },
  'HCMV':                         { antiviral: true,  vaccine: false },
  'HHV-6A':                       { antiviral: false, vaccine: false },
  'HHV-6B':                       { antiviral: false, vaccine: false },
  'HHV-7':                        { antiviral: false, vaccine: false },
  'EBV':                          { antiviral: true,  vaccine: false },
  'KSHV (HHV-8)':                 { antiviral: false, vaccine: false },
  // DNA viruses — Poxviridae
  'Variola virus':                { antiviral: true,  vaccine: true  },
  'Mpox virus':                   { antiviral: false, vaccine: true  },
  'Vaccinia virus':               { antiviral: true,  vaccine: false },
  'Molluscum contagiosum virus':  { antiviral: true,  vaccine: false },
  'Orf virus':                    { antiviral: false, vaccine: false },
  'Tanapox virus':                { antiviral: false, vaccine: false },
  // (+)ssRNA — Astroviridae
  'HAstV-1':                      { antiviral: false, vaccine: false },
  'HAstV-2':                      { antiviral: false, vaccine: false },
  'HAstV-3':                      { antiviral: false, vaccine: false },
  'HAstV-4':                      { antiviral: false, vaccine: false },
  'HAstV-5':                      { antiviral: false, vaccine: false },
  'HAstV-6':                      { antiviral: false, vaccine: false },
  'HAstV-7':                      { antiviral: false, vaccine: false },
  'HAstV-8':                      { antiviral: false, vaccine: false },
  // (+)ssRNA — Picornaviridae
  'Poliovirus':                   { antiviral: false, vaccine: true  },
  'Rhinovirus A':                 { antiviral: false, vaccine: false },
  'Rhinovirus B':                 { antiviral: false, vaccine: false },
  'Rhinovirus C':                 { antiviral: false, vaccine: false },
  'EV-A71':                       { antiviral: false, vaccine: true  },
  'EV-D68':                       { antiviral: false, vaccine: false },
  'HAV':                          { antiviral: true,  vaccine: true  },
  'HPeV-1':                       { antiviral: false, vaccine: false },
  'HPeV-3':                       { antiviral: false, vaccine: false },
  'Aichi virus':                  { antiviral: false, vaccine: false },
  // (+)ssRNA — Hepeviridae
  'HEV genotype 1':               { antiviral: true,  vaccine: false },
  'HEV genotype 2':               { antiviral: true,  vaccine: false },
  'HEV genotype 3':               { antiviral: true,  vaccine: false },
  'HEV genotype 4':               { antiviral: true,  vaccine: false },
  // (+)ssRNA — Caliciviridae
  'Norovirus GI':                 { antiviral: false, vaccine: false },
  'Norovirus GII':                { antiviral: false, vaccine: false },
  'Human sapovirus':              { antiviral: false, vaccine: false },
  // (+)ssRNA — Matonaviridae
  'Rubella virus':                { antiviral: false, vaccine: true  },
  // (+)ssRNA — Togaviridae
  'CHIKV':                        { antiviral: true,  vaccine: true  },
  'EEEV':                         { antiviral: false, vaccine: false },
  'WEEV':                         { antiviral: false, vaccine: false },
  'VEEV':                         { antiviral: false, vaccine: false },
  'Mayaro virus':                 { antiviral: false, vaccine: false },
  // (+)ssRNA — Flaviviridae
  'Dengue virus':                 { antiviral: false, vaccine: true  },
  'Zika virus':                   { antiviral: false, vaccine: false },
  'Yellow fever virus':           { antiviral: false, vaccine: true  },
  'West Nile virus':              { antiviral: true,  vaccine: false },
  'JEV':                          { antiviral: false, vaccine: true  },
  'TBEV':                         { antiviral: false, vaccine: true  },
  'HCV':                          { antiviral: true,  vaccine: false },
  'HPgV (non-pathogenic)':        { antiviral: false, vaccine: false },
  // (+)ssRNA — Coronaviridae
  'HCoV-229E':                    { antiviral: false, vaccine: false },
  'HCoV-NL63':                    { antiviral: false, vaccine: false },
  'SARS-CoV-2':                   { antiviral: true,  vaccine: true  },
  'MERS-CoV':                     { antiviral: true,  vaccine: false },
  'HCoV-OC43':                    { antiviral: false, vaccine: false },
  'HCoV-HKU1':                    { antiviral: false, vaccine: false },
  // (−)ssRNA — Bornaviridae
  'BoDV-1':                       { antiviral: false, vaccine: false },
  // (−)ssRNA — Orthomyxoviridae
  'Influenza A (H1N1)':           { antiviral: true,  vaccine: true  },
  'Influenza A (H3N2)':           { antiviral: true,  vaccine: true  },
  'Influenza A (H5N1)':           { antiviral: true,  vaccine: true  },
  'Influenza B (Victoria)':       { antiviral: true,  vaccine: true  },
  'Influenza B (Yamagata)':       { antiviral: true,  vaccine: true  },
  'Influenza C':                  { antiviral: true,  vaccine: false },
  // (−)ssRNA — Paramyxoviridae
  'Measles virus':                { antiviral: false, vaccine: true  },
  'Mumps virus':                  { antiviral: false, vaccine: true  },
  'HPIV-2':                       { antiviral: false, vaccine: false },
  'HPIV-4':                       { antiviral: false, vaccine: false },
  'HPIV-1':                       { antiviral: false, vaccine: false },
  'HPIV-3':                       { antiviral: false, vaccine: false },
  'Nipah virus':                  { antiviral: false, vaccine: false },
  'Hendra virus':                 { antiviral: false, vaccine: false },
  // (−)ssRNA — Pneumoviridae
  'RSV-A':                        { antiviral: true,  vaccine: true  },
  'RSV-B':                        { antiviral: true,  vaccine: true  },
  'hMPV-A':                       { antiviral: false, vaccine: false },
  'hMPV-B':                       { antiviral: false, vaccine: false },
  // (−)ssRNA — Rhabdoviridae
  'Rabies virus':                 { antiviral: false, vaccine: true  },
  // (−)ssRNA — Filoviridae
  'Ebola virus':                  { antiviral: true,  vaccine: true  },
  'Sudan virus':                  { antiviral: false, vaccine: false },
  'Bundibugyo virus':             { antiviral: false, vaccine: false },
  'Marburg virus':                { antiviral: true,  vaccine: false },
  'Ravn virus':                   { antiviral: false, vaccine: false },
  // (−)ssRNA — Arenaviridae
  'Lassa virus':                  { antiviral: false, vaccine: false },
  'LCMV':                         { antiviral: false, vaccine: false },
  'Junin virus':                  { antiviral: false, vaccine: false },
  'Machupo virus':                { antiviral: false, vaccine: false },
  // (−)ssRNA — Hantaviridae
  'Hantaan virus':                { antiviral: false, vaccine: false },
  'Sin Nombre virus':             { antiviral: false, vaccine: false },
  'Andes virus':                  { antiviral: false, vaccine: false },
  // (−)ssRNA — Nairoviridae
  'CCHF virus':                   { antiviral: false, vaccine: false },
  // (−)ssRNA — Phenuiviridae
  'Rift Valley fever virus':      { antiviral: false, vaccine: false },
  'Sandfly fever Naples virus':   { antiviral: false, vaccine: false },
  'Sandfly fever Sicilian virus': { antiviral: false, vaccine: false },
  // (−)ssRNA — Peribunyaviridae
  'La Crosse virus':              { antiviral: false, vaccine: false },
  'Oropouche virus':              { antiviral: false, vaccine: false },
  // RT — Retroviridae
  'HIV-1':                        { antiviral: true,  vaccine: false },
  'HIV-2':                        { antiviral: true,  vaccine: false },
  'HTLV-1':                       { antiviral: false, vaccine: false },
  'HTLV-2':                       { antiviral: false, vaccine: false },
  // dsRNA — Sedoreoviridae
  'Rotavirus A':                  { antiviral: false, vaccine: true  },
  'Rotavirus B':                  { antiviral: false, vaccine: false },
  'Rotavirus C':                  { antiviral: false, vaccine: false },
  // Ribozyviria — Kolmioviridae
  'HDV':                          { antiviral: true,  vaccine: false },
};

// Maps taxonomy-table virus names -> virusShort codes used in antivirals.json.
// Multiple codes are summed. Used to count unique compounds per virus.
export const VIRUS_CODE_MAP: Record<string, string[]> = {
  // Papillomaviridae
  'HPV-16': ['HPV-16', 'HPV'],
  'HPV-18': ['HPV-18', 'HPV'],
  'HPV-6':  ['HPV-6', 'HPV'],
  'HPV-11': ['HPV-11', 'HPV'],
  // Adenoviridae – HAdV subgroups
  'HAdV-A': ['HAdV', 'HAdV-1', 'HAdV-2', 'HAdV-5', 'HAdV-6'],
  'HAdV-B': ['HAdV', 'HAdV-3', 'HAdV-14'],
  'HAdV-C': ['HAdV'],
  'HAdV-D': ['HAdV', 'HAdV-8', 'HAdV-19', 'HAdV-22', 'HAdV-37'],
  'HAdV-E': ['HAdV'],
  'HAdV-F': ['HAdV'],
  'HAdV-G': ['HAdV'],
  // Hepadnaviridae
  'HBV': ['HBV'],
  // Orthoherpesviridae
  'HSV-1': ['HSV-1', 'HSV'],
  'HSV-2': ['HSV-2', 'HSV'],
  'VZV':   ['VZV'],
  'HCMV':  ['HCMV', 'CMV'],
  'HHV-6A': ['HHV-6'],
  'HHV-6B': ['HHV-6'],
  'HHV-7':  ['HHV-7'],
  'EBV':    ['EBV'],
  'KSHV (HHV-8)': ['KSHV'],
  // Polyomaviridae
  'JC virus': ['JCV'],
  'BK virus': ['BKV'],
  // Parvoviridae
  'Parvovirus B19': ['B19V'],
  // Poxviridae
  'Variola virus': ['VARV', 'Smallpox'],
  'Vaccinia virus': ['VACV', 'CPXV'],
  'Molluscum contagiosum virus': ['MCV'],
  'Orf virus': ['ORFV'],
  // Astroviridae
  'HAstV-4': ['HAstV-4', 'Ast-VA1'],
  // Picornaviridae
  'Poliovirus':   ['PV', 'PV-1'],
  'Rhinovirus A': ['HRV-A1', 'HRV-A16', 'HRV-A18', 'HRV-A1B', 'HRV-A2', 'HRV-A21', 'HRV-A39', 'HRV-A51', 'HRV-A68', 'HRV-A89'],
  'Rhinovirus B': ['HRV-B14'],
  'EV-A71': ['EV-A71', 'EV'],
  'EV-D68': ['EV-D68', 'EV'],
  'HAV':    ['HAV'],
  'HPeV-3': ['HPEV-3'],
  // Hepeviridae (all HEV genotypes share code)
  'HEV genotype 1': ['HEV'],
  'HEV genotype 2': ['HEV'],
  'HEV genotype 3': ['HEV'],
  'HEV genotype 4': ['HEV'],
  // Caliciviridae
  'Norovirus GI':  ['NoV'],
  'Norovirus GII': ['NoV'],
  // Matonaviridae
  'Rubella virus': ['RuV'],
  // Togaviridae
  'CHIKV': ['CHIKV'],
  'EEEV':  ['EEEV'],
  'WEEV':  ['WEEV'],
  'VEEV':  ['VEEV'],
  'Mayaro virus': ['MAYV'],
  // Flaviviridae
  'Dengue virus':       ['DENV', 'DENV-1', 'DENV-2', 'DENV-3', 'DENV-4'],
  'Zika virus':         ['ZIKV'],
  'Yellow fever virus': ['YFV'],
  'West Nile virus':    ['WNV', 'KUNV'],
  'JEV':  ['JEV'],
  'TBEV': ['TBEV', 'LGTV', 'POWV'],
  'HCV':  ['HCV', 'HCV-1'],
  // Coronaviridae
  'HCoV-229E':  ['HCoV-229E'],
  'HCoV-NL63':  ['HCoV-NL63'],
  'SARS-CoV-2': ['SARS-CoV-2'],
  'MERS-CoV':   ['MERS-CoV'],
  'HCoV-OC43':  ['HCoV-OC43'],
  // Orthomyxoviridae
  'Influenza A (H1N1)':    ['FLUAV', 'Influenza'],
  'Influenza A (H3N2)':    ['FLUAV', 'Influenza'],
  'Influenza A (H5N1)':    ['FLUAV', 'Influenza'],
  'Influenza B (Victoria)': ['FLUBV', 'Influenza'],
  'Influenza B (Yamagata)': ['FLUBV', 'Influenza'],
  'Influenza C':            ['FLUCV', 'Influenza'],
  // Paramyxoviridae
  'Measles virus': ['MeV'],
  'HPIV-1': ['HPIV-1', 'HPIV'],
  'HPIV-2': ['HPIV-2', 'HPIV'],
  'HPIV-3': ['HPIV-3', 'HPIV'],
  'HPIV-4': ['HPIV-4', 'HPIV'],
  'Nipah virus':  ['NiV'],
  'Hendra virus': ['HENV'],
  // Pneumoviridae
  'RSV-A': ['RSV'],
  'RSV-B': ['RSV'],
  'hMPV-A': ['HMPV'],
  'hMPV-B': ['HMPV'],
  // Rhabdoviridae
  'Rabies virus': ['RABV'],
  // Filoviridae
  'Ebola virus':   ['EBOV'],
  'Marburg virus': ['MARV'],
  'Ravn virus':    ['RAVV'],
  // Arenaviridae
  'Lassa virus':   ['LASV'],
  'LCMV':          ['LCMV'],
  'Junin virus':   ['JUNV'],
  'Machupo virus': ['MACV'],
  // Hantaviridae
  'Hantaan virus':    ['HTNV'],
  'Sin Nombre virus': ['SNV'],
  'Andes virus':      ['ANDV'],
  // Nairoviridae
  'CCHF virus': ['CCHFV'],
  // Phenuiviridae
  'Rift Valley fever virus': ['RVFV'],
  // Peribunyaviridae
  'La Crosse virus': ['LACV'],
  // Retroviridae
  'HIV-1': ['HIV-1', 'HIV'],
  'HIV-2': ['HIV-2', 'HIV'],
  // Sedoreoviridae
  'Rotavirus A': ['RoV', 'RoV-SA11'],
  'Rotavirus B': ['RoV'],
  'Rotavirus C': ['RoV'],
  // Kolmioviridae
  'HDV': ['HDV'],
};

export const SECTIONS: Section[] = [
  {
    label: 'DNA viruses',
    families: [
      {
        family: 'Anelloviridae',
        pandemic: 'na',
        genera: [
          { genus: 'Alphatorquevirus', viruses: ['TTV'] },
          { genus: 'Betatorquevirus', viruses: ['TTMV'] },
          { genus: 'Gammatorquevirus', viruses: ['TTMDV'] },
        ],
      },
      {
        family: 'Parvoviridae',
        pandemic: 'no',
        genera: [
          { genus: 'Erythroparvovirus', viruses: ['Parvovirus B19'] },
          { genus: 'Bocaparvovirus', viruses: ['Human bocavirus'] },
        ],
      },
      {
        family: 'Polyomaviridae',
        pandemic: 'no',
        genera: [
          { genus: 'Alphapolyomavirus', viruses: ['MCPyV'] },
          { genus: 'Betapolyomavirus', viruses: ['JC virus', 'BK virus'] },
        ],
      },
      {
        family: 'Papillomaviridae',
        pandemic: 'no',
        genera: [
          { genus: 'Alphapapillomavirus', viruses: ['HPV-16', 'HPV-18', 'HPV-6', 'HPV-11'] },
          { genus: 'Betapapillomavirus', viruses: ['HPV-5', 'HPV-8'] },
          { genus: 'Gammapapillomavirus', viruses: ['Cutaneous HPVs'] },
          { genus: 'Mupapillomavirus', viruses: ['HPV-1'] },
          { genus: 'Nupapillomavirus', viruses: ['HPV-41'] },
        ],
      },
      {
        family: 'Adenoviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Mastadenovirus', viruses: ['HAdV-A', 'HAdV-B', 'HAdV-C', 'HAdV-D', 'HAdV-E', 'HAdV-F', 'HAdV-G'] },
        ],
      },
      {
        family: 'Hepadnaviridae',
        pandemic: 'no',
        genera: [
          { genus: 'Orthohepadnavirus', viruses: ['HBV'] },
        ],
      },
      {
        family: 'Orthoherpesviridae',
        pandemic: 'no',
        genera: [
          { genus: 'Simplexvirus', viruses: ['HSV-1', 'HSV-2'] },
          { genus: 'Varicellovirus', viruses: ['VZV'] },
          { genus: 'Cytomegalovirus', viruses: ['HCMV'] },
          { genus: 'Roseolovirus', viruses: ['HHV-6A', 'HHV-6B', 'HHV-7'] },
          { genus: 'Lymphocryptovirus', viruses: ['EBV'] },
          { genus: 'Rhadinovirus', viruses: ['KSHV (HHV-8)'] },
        ],
      },
      {
        family: 'Poxviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Orthopoxvirus', viruses: ['Variola virus', 'Mpox virus', 'Vaccinia virus'] },
          { genus: 'Molluscipoxvirus', viruses: ['Molluscum contagiosum virus'] },
          { genus: 'Parapoxvirus', viruses: ['Orf virus'] },
          { genus: 'Yatapoxvirus', viruses: ['Tanapox virus'] },
        ],
      },
    ],
  },
  {
    label: '(+)ssRNA viruses',
    families: [
      {
        family: 'Astroviridae',
        pandemic: 'no',
        genera: [
          { genus: 'Mamastrovirus', viruses: ['HAstV-1', 'HAstV-2', 'HAstV-3', 'HAstV-4', 'HAstV-5', 'HAstV-6', 'HAstV-7', 'HAstV-8'] },
        ],
      },
      {
        family: 'Picornaviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Enterovirus', viruses: ['Poliovirus', 'Rhinovirus A', 'Rhinovirus B', 'Rhinovirus C', 'EV-A71', 'EV-D68'] },
          { genus: 'Hepatovirus', viruses: ['HAV'] },
          { genus: 'Parechovirus', viruses: ['HPeV-1', 'HPeV-3'] },
          { genus: 'Kobuvirus', viruses: ['Aichi virus'] },
        ],
      },
      {
        family: 'Hepeviridae',
        pandemic: 'no',
        genera: [
          { genus: 'Paslahepevirus', viruses: ['HEV genotype 1', 'HEV genotype 2', 'HEV genotype 3', 'HEV genotype 4'] },
        ],
      },
      {
        family: 'Caliciviridae',
        pandemic: 'no',
        genera: [
          { genus: 'Norovirus', viruses: ['Norovirus GI', 'Norovirus GII'] },
          { genus: 'Sapovirus', viruses: ['Human sapovirus'] },
        ],
      },
      {
        family: 'Matonaviridae',
        pandemic: 'no',
        genera: [
          { genus: 'Rubivirus', viruses: ['Rubella virus'] },
        ],
      },
      {
        family: 'Togaviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Alphavirus', viruses: ['CHIKV', 'EEEV', 'WEEV', 'VEEV', 'Mayaro virus'] },
        ],
      },
      {
        family: 'Flaviviridae',
        pandemic: 'yes', // default; overridden per-genus below
        genera: [
          { genus: 'Orthoflavivirus', viruses: ['Dengue virus', 'Zika virus', 'Yellow fever virus', 'West Nile virus', 'JEV', 'TBEV'], pandemic: 'yes' },
          { genus: 'Hepacivirus', viruses: ['HCV'], pandemic: 'no' },
          { genus: 'Pegivirus', viruses: ['HPgV (non-pathogenic)'], pandemic: 'na' },
        ],
      },
      {
        family: 'Coronaviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Alphacoronavirus', viruses: ['HCoV-229E', 'HCoV-NL63'] },
          { genus: 'Betacoronavirus', viruses: ['SARS-CoV-2', 'MERS-CoV', 'HCoV-OC43', 'HCoV-HKU1'] },
        ],
      },
    ],
  },
  {
    label: '(−)ssRNA viruses',
    families: [
      {
        family: 'Bornaviridae',
        pandemic: 'no',
        genera: [
          { genus: 'Orthobornavirus', viruses: ['BoDV-1'] },
        ],
      },
      {
        family: 'Orthomyxoviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Alphainfluenzavirus', viruses: ['Influenza A (H1N1)', 'Influenza A (H3N2)', 'Influenza A (H5N1)'] },
          { genus: 'Betainfluenzavirus', viruses: ['Influenza B (Victoria)', 'Influenza B (Yamagata)'] },
          { genus: 'Gammainfluenzavirus', viruses: ['Influenza C'] },
        ],
      },
      {
        family: 'Paramyxoviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Morbillivirus', viruses: ['Measles virus'] },
          { genus: 'Orthorubulavirus', viruses: ['Mumps virus', 'HPIV-2', 'HPIV-4'] },
          { genus: 'Respirovirus', viruses: ['HPIV-1', 'HPIV-3'] },
          { genus: 'Henipavirus', viruses: ['Nipah virus', 'Hendra virus'] },
        ],
      },
      {
        family: 'Pneumoviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Orthopneumovirus', viruses: ['RSV-A', 'RSV-B'] },
          { genus: 'Metapneumovirus', viruses: ['hMPV-A', 'hMPV-B'] },
        ],
      },
      {
        family: 'Rhabdoviridae',
        pandemic: 'no',
        genera: [
          { genus: 'Lyssavirus', viruses: ['Rabies virus'] },
        ],
      },
      {
        family: 'Filoviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Orthoebolavirus', viruses: ['Ebola virus', 'Sudan virus', 'Bundibugyo virus'] },
          { genus: 'Orthomarburgvirus', viruses: ['Marburg virus', 'Ravn virus'] },
        ],
      },
      {
        family: 'Arenaviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Mammarenavirus', viruses: ['Lassa virus', 'LCMV', 'Junin virus', 'Machupo virus'] },
        ],
      },
      {
        family: 'Hantaviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Orthohantavirus', viruses: ['Hantaan virus', 'Sin Nombre virus', 'Andes virus'] },
        ],
      },
      {
        family: 'Nairoviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Orthonairovirus', viruses: ['CCHF virus'] },
        ],
      },
      {
        family: 'Phenuiviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Phlebovirus', viruses: ['Rift Valley fever virus', 'Sandfly fever Naples virus', 'Sandfly fever Sicilian virus'] },
          { genus: 'Bandavirus', viruses: ['SFTS virus', 'Heartland virus'] },
        ],
      },
      {
        family: 'Peribunyaviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Orthobunyavirus', viruses: ['La Crosse virus', 'Oropouche virus'] },
        ],
      },
    ],
  },
  {
    label: 'RT / dsRNA / Ribozyviria',
    families: [
      {
        family: 'Retroviridae',
        pandemic: 'yes',
        genera: [
          { genus: 'Lentivirus', viruses: ['HIV-1', 'HIV-2'] },
          { genus: 'Deltaretrovirus', viruses: ['HTLV-1', 'HTLV-2'] },
        ],
      },
      {
        family: 'Sedoreoviridae',
        pandemic: 'no',
        genera: [
          { genus: 'Rotavirus', viruses: ['Rotavirus A', 'Rotavirus B', 'Rotavirus C'] },
        ],
      },
      {
        family: 'Kolmioviridae',
        pandemic: 'na',
        genera: [
          { genus: 'Deltavirus', viruses: ['HDV'] },
        ],
      },
    ],
  },
];

// Registry: slug → virus metadata. Built from SECTIONS + VIRUS_CODE_MAP.
// Used by the table to create links, and by VirusPage to render stub pages
// for viruses that have no entries in antivirals.json yet.
export const VIRUS_REGISTRY: Record<string, VirusInfo> = (() => {
  const reg: Record<string, VirusInfo> = {};
  for (const section of SECTIONS) {
    for (const fam of section.families) {
      for (const gen of fam.genera) {
        const pandemic: Pandemic = gen.pandemic ?? fam.pandemic;
        for (const virus of gen.viruses) {
          const codes = VIRUS_CODE_MAP[virus] ?? [virus];
          reg[toVirusSlug(virus)] = {
            name: virus,
            family: fam.family,
            genus: gen.genus,
            section: section.label,
            pandemic,
            codes,
          };
        }
      }
    }
  }
  return reg;
})();

const COL_SPAN = 9;

function StatusIcon({ value }: { value: boolean }) {
  if (value) return <Check size={15} className="vf-icon-yes" />;
  return <X size={15} className="vf-icon-no" />;
}

function PandemicIcon({ value }: { value: Pandemic }) {
  if (value === 'yes') return <Check size={15} className="vf-icon-yes" />;
  if (value === 'no') return <X size={15} className="vf-icon-no" />;
  return <Minus size={15} className="vf-icon-na" />;
}

export function ViralFamiliesTable() {
  const { antivirals } = useAntiviralsData();

  // virusShort code -> { p3: Set<drug>, p2: Set<drug>, pc: Set<drug> }
  const countsByCode = useMemo(() => {
    const map = new Map<string, { p3: Set<string>; p2: Set<string>; pc: Set<string> }>();
    if (!antivirals) return map;
    for (const d of antivirals.drugs) {
      const phase = getClinicalPhase(d);
      if (phase === 'approved') continue;
      if (!map.has(d.virusShort)) {
        map.set(d.virusShort, { p3: new Set(), p2: new Set(), pc: new Set() });
      }
      const bucket = map.get(d.virusShort)!;
      if (phase === 'phase3') bucket.p3.add(d.drugNormalized);
      else if (phase === 'phase2') bucket.p2.add(d.drugNormalized);
      else bucket.pc.add(d.drugNormalized);
    }
    return map;
  }, [antivirals]);

  const getCounts = (virusName: string) => {
    const codes = VIRUS_CODE_MAP[virusName] ?? [];
    const p3 = new Set<string>();
    const p2 = new Set<string>();
    const pc = new Set<string>();
    for (const code of codes) {
      const b = countsByCode.get(code);
      if (!b) continue;
      b.p3.forEach((d) => p3.add(d));
      b.p2.forEach((d) => p2.add(d));
      b.pc.forEach((d) => pc.add(d));
    }
    return { p3: p3.size, p2: p2.size, pc: pc.size };
  };

  type FlatRow =
    | { type: 'section'; label: string }
    | {
        type: 'virus';
        family: string;
        familyRowSpan: number;
        showFamily: boolean;
        genus: string;
        genusRowSpan: number;
        showGenus: boolean;
        virus: string;
        pandemic: Pandemic;
      };

  const rows: FlatRow[] = [];

  for (const section of SECTIONS) {
    rows.push({ type: 'section', label: section.label });

    for (const fam of section.families) {
      const totalVirusRows = fam.genera.reduce((sum, g) => sum + g.viruses.length, 0);
      let famFirst = true;

      for (const gen of fam.genera) {
        const pandemic: Pandemic = gen.pandemic ?? fam.pandemic;
        let genFirst = true;
        for (const virus of gen.viruses) {
          rows.push({
            type: 'virus',
            family: fam.family,
            familyRowSpan: totalVirusRows,
            showFamily: famFirst,
            genus: gen.genus,
            genusRowSpan: gen.viruses.length,
            showGenus: genFirst,
            virus,
            pandemic,
          });
          famFirst = false;
          genFirst = false;
        }
      }
    }
  }

  return (
    <div className="vf-wrapper">
      <div className="vf-header">
        <h2 className="vf-title">Human-Pathogenic Virus Families &amp; Genera</h2>
        <span className="vf-source">ICTV MSL40 &bull; AntiviralDB</span>
      </div>

      <div className="vf-table-scroll">
        <table className="vf-flat-table">
          <thead>
            <tr>
              <th className="vf-col-family">Family</th>
              <th className="vf-col-genus">Genus</th>
              <th className="vf-col-virus">Virus</th>
              <th className="vf-col-status vf-col-wrap">
                <span className="vf-hdr-line">Approved</span>
                <span className="vf-hdr-line">Antiviral</span>
              </th>
              <th className="vf-col-status vf-col-wrap">
                <span className="vf-hdr-line">Approved</span>
                <span className="vf-hdr-line">Vaccine</span>
              </th>
              <th className="vf-col-count" title="Unique compounds at Phase 3 (highest reached)">P3 AV</th>
              <th className="vf-col-count" title="Unique compounds at Phase 2 (highest reached)">P2 AV</th>
              <th className="vf-col-count" title="Unique preclinical compounds">PC AV</th>
              <th className="vf-col-status vf-col-wrap">
                <span className="vf-hdr-line">Pandemic</span>
                <span className="vf-hdr-line">Potential</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              if (row.type === 'section') {
                return (
                  <tr key={`section-${row.label}`} className="vf-section-row">
                    <td colSpan={COL_SPAN}>{row.label}</td>
                  </tr>
                );
              }
              const entry = APPROVAL_DB[row.virus] ?? { antiviral: false, vaccine: false };
              const counts = getCounts(row.virus);
              const virusCodes = (VIRUS_CODE_MAP[row.virus] ?? []).join(',');
              const rowClasses = [
                row.showFamily && i > 0 ? 'vf-family-first-row' : '',
                row.pandemic === 'yes' && !entry.antiviral && !entry.vaccine ? 'vf-pandemic-yes-row' : '',
              ].filter(Boolean).join(' ') || undefined;
              return (
                <tr key={`${row.family}-${row.genus}-${row.virus}`} className={rowClasses}>
                  {row.showFamily && (
                    <td rowSpan={row.familyRowSpan} className="vf-family">
                      {row.family}
                    </td>
                  )}
                  {row.showGenus && (
                    <td rowSpan={row.genusRowSpan} className="vf-genus">
                      {row.genus}
                    </td>
                  )}
                  <td className={`vf-virus${row.pandemic === 'yes' && !entry.antiviral && !entry.vaccine ? ' vf-virus-unmet' : ''}`}>
                    <Link to={`/virus/${toVirusSlug(row.virus)}`} className="vf-virus-link">
                      {row.virus}
                    </Link>
                  </td>
                  <td className="vf-status"><StatusIcon value={entry.antiviral} /></td>
                  <td className="vf-status"><StatusIcon value={entry.vaccine} /></td>
                  <td className="vf-count">{counts.p3 ? <Link to={`/?viruses=${virusCodes}&phases=phase3`}>{counts.p3}</Link> : ''}</td>
                  <td className="vf-count">{counts.p2 ? <Link to={`/?viruses=${virusCodes}&phases=phase2`}>{counts.p2}</Link> : ''}</td>
                  <td className="vf-count">{counts.pc ? <Link to={`/?viruses=${virusCodes}&phases=preclinical`}>{counts.pc}</Link> : ''}</td>
                  <td className="vf-status vf-pandemic">
                    <PandemicIcon value={row.pandemic} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
