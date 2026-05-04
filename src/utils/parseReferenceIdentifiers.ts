export interface RefLink {
  label: string;
  url: string | null;
}

export function parseReferenceIdentifiers(raw: string): RefLink[] {
  return raw
    .split(/;\s*/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map(tokenToRefLink);
}

function tokenToRefLink(token: string): RefLink {
  // Full URL — use as-is, label with hostname
  if (/^https?:\/\//i.test(token)) {
    try {
      const hostname = new URL(token).hostname.replace(/^www\./, '');
      const label = token.includes('doi.org') ? 'Ref' : hostname;
      return { label, url: token };
    } catch {
      return { label: token, url: token };
    }
  }

  // DOI with "doi:" prefix (e.g. "doi: 10.3389/fimmu.2019.02186")
  const doiPrefixed = token.match(/^doi\s*:\s*(10\.\d{4,9}\/\S+)$/i);
  if (doiPrefixed) {
    return { label: 'Ref', url: `https://doi.org/${doiPrefixed[1]}` };
  }

  // NCT trial number
  const nct = token.match(/^(NCT\d+)$/i);
  if (nct) {
    const id = nct[1].toUpperCase();
    return {
      label: id,
      url: `https://explore.metascienceobservatory.org/trials/${id}`,
    };
  }

  // Pan African Clinical Trials Registry
  const pactr = token.match(/^(PACTR\d+)$/i);
  if (pactr) {
    const id = pactr[1].toUpperCase();
    return {
      label: id,
      url: `https://pactr.samrc.ac.za/TrialDisplay.aspx?TrialID=${id}`,
    };
  }

  // PubMed Central ID
  const pmcid = token.match(/^PMCID\s*:\s*(PMC\d+)$/i);
  if (pmcid) {
    return {
      label: pmcid[1].toUpperCase(),
      url: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid[1].toUpperCase()}/`,
    };
  }

  // PubChem CID
  const cid = token.match(/^CID\s*:\s*(\d+)$/i);
  if (cid) {
    return {
      label: `PubChem CID:${cid[1]}`,
      url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid[1]}`,
    };
  }

  // DrugBank — bare DB##### or prefixed "DrugBank ID: DB#####"
  const db = token.match(/^(?:drugbank\s+id\s*:\s*)?(DB\d+)$/i);
  if (db) {
    return {
      label: db[1].toUpperCase(),
      url: `https://go.drugbank.com/drugs/${db[1].toUpperCase()}`,
    };
  }

  // PMID with prefix — strip trailing punctuation (e.g. "PMID: 31307979?")
  const pmidPrefixed = token.match(/^PMID\s*:\s*(\d+)\W*$/i);
  if (pmidPrefixed) {
    return {
      label: `PMID:${pmidPrefixed[1]}`,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmidPrefixed[1]}/`,
    };
  }

  // Bare number → assume PMID
  if (/^\d+$/.test(token)) {
    return {
      label: `PMID:${token}`,
      url: `https://pubmed.ncbi.nlm.nih.gov/${token}/`,
    };
  }

  // Bare DOI (e.g. "10.3390/biomedicines12102206")
  if (/^10\.\d{4,9}\/\S+$/.test(token)) {
    return { label: 'Ref', url: `https://doi.org/${token}` };
  }

  // Unrecognized — plain text, no link
  return { label: token, url: null };
}
