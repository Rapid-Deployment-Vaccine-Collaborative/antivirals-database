import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface MoleculeViewerProps {
  smiles: string;
  width?: number;
  height?: number;
}

/**
 * MoleculeViewer component
 *
 * Uses PubChem's REST API to fetch 2D structure images from SMILES strings.
 * This is a lightweight approach that doesn't require loading RDKit WASM.
 * For production, consider using @rdkit/rdkit for client-side rendering.
 */
export function MoleculeViewer({ smiles, width = 300, height = 200 }: MoleculeViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!smiles) {
      setError('No SMILES provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Use PubChem's image API for structure rendering
    // This avoids the complexity of loading RDKit WASM
    const encodedSmiles = encodeURIComponent(smiles);
    const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodedSmiles}/PNG?image_size=${width}x${height}`;

    // Test if the image loads
    const img = new Image();
    img.onload = () => {
      setImageUrl(pubchemUrl);
      setLoading(false);
    };
    img.onerror = () => {
      // Fallback: try a simpler request or show error
      setError('Could not render structure');
      setLoading(false);
    };
    img.src = pubchemUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [smiles, width, height]);

  if (loading) {
    return (
      <div className="molecule-viewer molecule-loading">
        <Loader2 className="spinner" size={32} />
        <span>Loading structure...</span>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="molecule-viewer molecule-error">
        <AlertCircle size={32} />
        <span>{error || 'Structure unavailable'}</span>
        {smiles && (
          <a
            href={`https://pubchem.ncbi.nlm.nih.gov/compound/structure?smiles=${encodeURIComponent(smiles)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="view-external-link"
          >
            View on PubChem
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="molecule-viewer">
      <img
        src={imageUrl}
        alt={`Molecular structure for SMILES: ${smiles.substring(0, 50)}...`}
        width={width}
        height={height}
        className="molecule-image"
      />
    </div>
  );
}

/**
 * Simple placeholder for when we don't want to make network requests
 * Shows the SMILES string in a formatted way
 */
export function MoleculeViewerPlaceholder({ smiles }: { smiles: string }) {
  return (
    <div className="molecule-viewer molecule-placeholder">
      <div className="smiles-display">
        <span className="smiles-label">SMILES</span>
        <code className="smiles-string">
          {smiles.length > 100 ? smiles.substring(0, 100) + '...' : smiles}
        </code>
      </div>
      <a
        href={`https://pubchem.ncbi.nlm.nih.gov/compound/structure?smiles=${encodeURIComponent(smiles)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="view-structure-link"
      >
        View 2D Structure
        <ExternalLink size={14} />
      </a>
    </div>
  );
}
