import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – 3dmol ships its own types but they don't resolve cleanly in all TS configs
import * as $3Dmol from '3dmol';

interface Molecule3DViewerProps {
  pubchemCid?: string;
  drugName: string;
  width?: number;
  height?: number;
}

export function Molecule3DViewer({
  pubchemCid,
  drugName,
  width = 400,
  height = 320,
}: Molecule3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Destroy any prior viewer (handles React StrictMode double-invoke)
    if (viewerRef.current) {
      container.innerHTML = '';
      viewerRef.current = null;
    }

    setStatus('loading');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = ($3Dmol as any).createViewer(container, {
      backgroundColor: 'white',
      antialias: true,
    });
    viewerRef.current = viewer;

      const base = pubchemCid
      ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${pubchemCid}/record/SDF`
      : `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(drugName)}/record/SDF`;

    let cancelled = false;

    const tryFetch = (url: string) =>
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.text();
      });

    tryFetch(`${base}?record_type=3d`)
      .catch(() => tryFetch(`${base}?record_type=2d`))
      .then((sdfData) => {
        if (cancelled || !viewerRef.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v = viewerRef.current as any;
        v.addModel(sdfData, 'sdf');
        v.setStyle({}, { stick: { radius: 0.12 }, sphere: { scale: 0.25 } });
        v.zoomTo();
        v.render();
        setStatus('success');
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMsg('No structure available on PubChem');
        setStatus('error');
      });

    return () => {
      cancelled = true;
      viewerRef.current = null;
      container.innerHTML = '';
    };
  }, [pubchemCid, drugName]);

  return (
    <div className="molecule-3d-wrapper" style={{ width, height }}>
      {status === 'loading' && (
        <div className="molecule-3d-overlay">
          <Loader2 className="spinner" size={24} />
          <span>Loading 3D structure...</span>
        </div>
      )}
      {status === 'error' && (
        <div className="molecule-3d-overlay molecule-3d-error">
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
          {(pubchemCid || drugName) && (
            <a
              href={
                pubchemCid
                  ? `https://pubchem.ncbi.nlm.nih.gov/compound/${pubchemCid}`
                  : `https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(drugName)}`
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              Search PubChem <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
      {/* Always in DOM so 3dmol can measure offsetWidth/Height */}
      <div
        ref={containerRef}
        style={{
          width,
          height,
          visibility: status === 'success' ? 'visible' : 'hidden',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
}
