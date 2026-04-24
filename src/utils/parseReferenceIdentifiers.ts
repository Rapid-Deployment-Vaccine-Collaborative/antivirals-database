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
      const label = token.includes('doi.org') ? 'DOI' : hostname;
      return { label, url: token };
    } catch {
      return { label: token, url: token };
    }
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

  // PMID with prefix
  const pmidPrefixed = token.match(/^PMID\s*:\s*(\d+)$/i);
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

  // Unrecognized — plain text, no link
  return { label: token, url: null };
}
