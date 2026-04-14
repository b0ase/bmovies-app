'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { COLOR_SCHEMES, MINT_TEMPLATES, type ColorScheme } from '@/lib/mint/mint-defaults';
import type { MintBlendMode, MintDocument, MintLayer, MintLayerConfig, MintLayerTransform } from '@/lib/mint/types';
import LayerList from './LayerList';
import PatternControls from './PatternControls';

// --- Web localStorage document store ---

type SavedDoc = { id: string; name: string; data: string; updatedAt: string };

function getMintDocs(): SavedDoc[] {
  try {
    return JSON.parse(localStorage.getItem('npgx-mint-docs') || '[]');
  } catch { return []; }
}

function saveMintDocs(docs: SavedDoc[]) {
  localStorage.setItem('npgx-mint-docs', JSON.stringify(docs));
}

// --- Browser download helper ---

function downloadFile(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// --- Web Crypto hash helper ---

async function hashDataUrl(dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl);
  const buf = await res.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Component ---

type Props = {
  doc: MintDocument;
  selectedLayer: MintLayer | null;
  selectedLayerId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  uvMode: boolean;
  onAddLayer: (type: MintLayerConfig['type']) => void;
  onRemoveLayer: (id: string) => void;
  onReorderLayer: (id: string, newIndex: number) => void;
  onUpdateConfig: (id: string, patch: Record<string, unknown>) => void;
  onUpdateMeta: (id: string, patch: { name?: string; visible?: boolean; locked?: boolean; opacity?: number; blendMode?: MintBlendMode; uvOnly?: boolean }) => void;
  onUpdateTransform: (id: string, patch: Partial<MintLayerTransform>) => void;
  onDuplicateLayer: (id: string) => void;
  onSelectLayer: (id: string | null) => void;
  onSetCanvasSize: (width: number, height: number) => void;
  onSetBackgroundColor: (color: string) => void;
  onSetDocMeta: (patch: Partial<Pick<MintDocument, 'name' | 'description' | 'circleMask' | 'rimPattern'>>) => void;
  onSetUvMode: (uv: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onLoadDocument: (doc: MintDocument) => void;
  onExportPng: () => string | null;
  onExportBatchPng: (serialOverride?: { layerId: string; number: number }) => string | null;
  showGrid: boolean;
  onToggleGrid: () => void;
  animatePreview: boolean;
  onToggleAnimate: () => void;
  getThumbnailSrc: (id: string) => string | null;
};

const LAYER_TYPES: { type: MintLayerConfig['type']; label: string; group: string }[] = [
  { type: 'guilloche', label: 'Guilloche', group: 'Security' },
  { type: 'rosette', label: 'Rosette', group: 'Security' },
  { type: 'fine-line', label: 'Fine Lines', group: 'Security' },
  { type: 'moire', label: 'Moir\u00e9', group: 'Security' },
  { type: 'crosshatch', label: 'Crosshatch', group: 'Security' },
  { type: 'stipple', label: 'Stipple', group: 'Security' },
  { type: 'border', label: 'Border', group: 'Structure' },
  { type: 'microprint', label: 'Microprint', group: 'Structure' },
  { type: 'security-thread', label: 'Security Thread', group: 'Structure' },
  { type: 'serial-number', label: 'Serial Number', group: 'Structure' },
  { type: 'qr-code', label: 'QR Code', group: 'Structure' },
  { type: 'text', label: 'Text', group: 'Content' },
  { type: 'text-arc', label: 'Text Arc', group: 'Content' },
  { type: 'image', label: 'Image', group: 'Content' },
  { type: 'gradient', label: 'Gradient', group: 'Background' },
  { type: 'lathe', label: 'Lathe', group: 'Background' },
  { type: 'watermark-pattern', label: 'Watermark', group: 'Background' },
  { type: 'hologram', label: 'Hologram', group: 'Effects' },
];

const BLEND_MODES: { value: MintBlendMode; label: string }[] = [
  { value: 'source-over', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' }
];

export default function MintPanel({
  doc, selectedLayer, selectedLayerId, canUndo, canRedo, uvMode,
  onAddLayer, onRemoveLayer, onReorderLayer, onUpdateConfig, onUpdateMeta,
  onUpdateTransform, onDuplicateLayer, onSelectLayer, onSetCanvasSize,
  onSetBackgroundColor, onSetDocMeta, onSetUvMode, onUndo, onRedo,
  onLoadDocument, onExportPng, onExportBatchPng, showGrid, onToggleGrid,
  animatePreview, onToggleAnimate, getThumbnailSrc
}: Props) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showColorSchemes, setShowColorSchemes] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [savedDocs, setSavedDocs] = useState<SavedDoc[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isStamping, setIsStamping] = useState(false);
  const [batchCount, setBatchCount] = useState(10);
  const [batchStatus, setBatchStatus] = useState('');
  const [stampResult, setStampResult] = useState('');

  const refreshSavedDocs = useCallback(() => {
    const docs = getMintDocs();
    setSavedDocs(docs);
  }, []);

  useEffect(() => {
    if (showSaveLoad) refreshSavedDocs();
  }, [showSaveLoad, refreshSavedDocs]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const docs = getMintDocs();
      const existing = docs.findIndex(d => d.id === (doc as MintDocument & { id?: string }).id);
      const entry: SavedDoc = {
        id: (doc as MintDocument & { id?: string }).id || crypto.randomUUID(),
        name: doc.name || 'Untitled',
        data: JSON.stringify(doc),
        updatedAt: new Date().toISOString(),
      };
      if (existing >= 0) {
        docs[existing] = entry;
      } else {
        docs.push(entry);
      }
      saveMintDocs(docs);
      refreshSavedDocs();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async (id: string) => {
    try {
      const docs = getMintDocs();
      const found = docs.find(d => d.id === id);
      if (!found) throw new Error('Document not found');
      const loaded = JSON.parse(found.data) as MintDocument;
      onLoadDocument(loaded);
      setShowSaveLoad(false);
    } catch (err) {
      console.error('Load failed:', err);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const docs = getMintDocs().filter(d => d.id !== id);
      saveMintDocs(docs);
      refreshSavedDocs();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      const dataUrl = onExportPng();
      if (dataUrl) downloadFile(dataUrl, `${doc.name || 'mint-design'}.png`);
    } catch (err) { console.error('Export PNG failed:', err); }
    finally { setIsExporting(false); }
  };

  const handleExportSvg = async () => {
    setIsExporting(true);
    try {
      const dataUrl = onExportPng();
      if (dataUrl) {
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}"><image href="${dataUrl}" width="${doc.width}" height="${doc.height}"/></svg>`;
        const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
        downloadFile(svgDataUrl, `${doc.name || 'mint-design'}.svg`);
      }
    } catch (err) { console.error('Export SVG failed:', err); }
    finally { setIsExporting(false); }
  };

  const applyColorScheme = (scheme: ColorScheme) => {
    onSetBackgroundColor(scheme.background);
    for (const layer of doc.layers) {
      if (layer.type === 'border' || layer.type === 'guilloche' || layer.type === 'rosette') {
        onUpdateConfig(layer.id, { color: scheme.primary });
      } else if (layer.type === 'text' || layer.type === 'text-arc') {
        onUpdateConfig(layer.id, { color: scheme.text });
      } else if (layer.type === 'microprint' || layer.type === 'watermark-pattern') {
        onUpdateConfig(layer.id, { color: scheme.secondary + '33' });
      } else if (layer.type === 'serial-number') {
        onUpdateConfig(layer.id, { color: scheme.text });
      } else if (layer.type === 'security-thread') {
        onUpdateConfig(layer.id, { color: scheme.secondary + '33', textColor: scheme.secondary + '55' });
      }
    }
    setShowColorSchemes(false);
  };

  const handleBatchExport = async () => {
    const serialLayer = doc.layers.find((l) => l.type === 'serial-number');
    if (!serialLayer) { setBatchStatus('Add a Serial Number layer first'); return; }
    setIsExporting(true);
    setBatchStatus('Preparing batch...');
    try {
      const startNum = (serialLayer.config as { startNumber: number }).startNumber;
      for (let i = 0; i < batchCount; i++) {
        setBatchStatus(`Rendering ${i + 1} of ${batchCount}...`);
        const dataUrl = onExportBatchPng({ layerId: serialLayer.id, number: startNum + i });
        if (dataUrl) {
          const padded = String(startNum + i).padStart(4, '0');
          downloadFile(dataUrl, `${doc.name || 'mint'}-${padded}.png`);
        }
      }
      setBatchStatus(`Exported ${batchCount} variants`);
    } catch (err) { console.error('Batch export failed:', err); setBatchStatus('Failed'); }
    finally { setIsExporting(false); }
  };

  // Stamp & Inscribe the current design
  const handleStampDesign = async () => {
    setIsStamping(true);
    setStampResult('');
    try {
      const dataUrl = onExportPng();
      if (!dataUrl) throw new Error('Export failed');
      // Hash the image data via Web Crypto
      const hash = await hashDataUrl(dataUrl);
      const timestamp = new Date().toISOString();
      const stampPath = `$STAMP/${doc.name || 'DESIGN'}`;
      const receipt = {
        id: crypto.randomUUID(), path: stampPath, hash, algorithm: 'sha256' as const,
        sourceFile: `${doc.name || 'mint'}.png`, sourceSize: 0,
        timestamp, txid: null, tokenId: null, metadata: {}
      };
      // Save stamp receipt to localStorage
      const receipts = JSON.parse(localStorage.getItem('npgx-stamp-receipts') || '[]');
      receipts.push(receipt);
      localStorage.setItem('npgx-stamp-receipts', JSON.stringify(receipts));
      // Blockchain features disabled in web — show hash only
      setStampResult(`Hashed: ${hash.slice(0, 16)}... (web mode)`);
    } catch (err) { setStampResult(`Failed: ${err instanceof Error ? err.message : err}`); }
    finally { setIsStamping(false); }
  };

  // Mint token from current design (placeholder in web)
  const handleMintToken = async () => {
    setIsStamping(true);
    setStampResult('');
    try {
      const dataUrl = onExportPng();
      if (!dataUrl) throw new Error('Export failed');
      const hash = await hashDataUrl(dataUrl);
      // Blockchain minting not available in web mode
      setStampResult(`Hashed: ${hash.slice(0, 16)}... (minting requires desktop app)`);
    } catch (err) { setStampResult(`Failed: ${err instanceof Error ? err.message : err}`); }
    finally { setIsStamping(false); }
  };

  // Save as custom template
  const handleSaveAsTemplate = async () => {
    const name = doc.name || 'Custom Template';
    const templateDoc = { ...doc, name: `Template: ${name}` };
    const docs = getMintDocs();
    docs.push({
      id: crypto.randomUUID(),
      name: `Template: ${name}`,
      data: JSON.stringify(templateDoc),
      updatedAt: new Date().toISOString(),
    });
    saveMintDocs(docs);
    setBatchStatus(`Saved as template: ${name}`);
    setTimeout(() => setBatchStatus(''), 2000);
  };

  const transform = selectedLayer?.transform || { x: 0, y: 0, rotation: 0, scale: 1 };

  return (
    <aside className="panel right-panel mint-panel">
      <h2>Currency Designer</h2>

      {/* Document Name */}
      <input
        type="text"
        value={doc.name}
        onChange={(e) => onSetDocMeta({ name: e.target.value })}
        placeholder="Document name..."
        className="mint-doc-name-input"
      />

      {/* Toolbar */}
      <div className="control-row" style={{ gap: 4, flexWrap: 'wrap' }}>
        <button className="ghost" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
        <button className="ghost" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">Redo</button>
        <button className={`ghost ${showGrid ? 'active-toggle' : ''}`} onClick={onToggleGrid} title="Grid">Grid</button>
        <button className={`ghost ${uvMode ? 'active-toggle' : ''}`} onClick={() => onSetUvMode(!uvMode)} title="UV Light mode">UV</button>
        <button className={`ghost ${animatePreview ? 'active-toggle' : ''}`} onClick={onToggleAnimate} title="Animated preview">Anim</button>
      </div>

      {/* Quick Actions */}
      <div className="mint-actions">
        <button className="mint-action-btn" onClick={() => setShowTemplates(!showTemplates)}>Templates</button>
        <button className="mint-action-btn" onClick={() => setShowColorSchemes(!showColorSchemes)}>Colors</button>
        <button className="mint-action-btn" onClick={() => setShowSaveLoad(!showSaveLoad)}>Save/Load</button>
        <button className="mint-action-btn" onClick={() => setShowBatch(!showBatch)}>Batch</button>
      </div>

      {/* Template Picker */}
      {showTemplates && (
        <div className="section mint-dropdown-section">
          <h3>Templates</h3>
          <div className="mint-template-grid">
            {MINT_TEMPLATES.map((tpl) => (
              <button key={tpl.id} className="mint-template-card" onClick={() => { onLoadDocument(tpl.factory()); setShowTemplates(false); }} title={tpl.description}>
                <span className="mint-template-name">{tpl.name}</span>
                <span className="mint-template-desc">{tpl.description}</span>
              </button>
            ))}
          </div>
          <button className="ghost" onClick={handleSaveAsTemplate} style={{ width: '100%', marginTop: 6, fontSize: 11 }}>Save Current as Template</button>
        </div>
      )}

      {/* Color Schemes */}
      {showColorSchemes && (
        <div className="section mint-dropdown-section">
          <h3>Color Schemes</h3>
          <div className="mint-scheme-grid">
            {COLOR_SCHEMES.map((scheme) => (
              <button key={scheme.name} className="mint-scheme-chip" onClick={() => applyColorScheme(scheme)} title={scheme.name}>
                <span className="mint-scheme-swatch" style={{ background: `linear-gradient(135deg, ${scheme.primary}, ${scheme.secondary})` }} />
                <span>{scheme.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save / Load */}
      {showSaveLoad && (
        <div className="section mint-dropdown-section">
          <h3>Documents</h3>
          <button className="secondary" onClick={handleSave} disabled={isSaving} style={{ width: '100%', marginBottom: 8 }}>
            {isSaving ? 'Saving...' : 'Save Current'}
          </button>
          {savedDocs.length === 0 ? (
            <div className="small">No saved documents.</div>
          ) : (
            <div className="mint-saved-docs">
              {savedDocs.map((d) => (
                <div key={d.id} className="mint-saved-doc">
                  <button className="ghost mint-doc-name" onClick={() => handleLoad(d.id)}>{d.name || 'Untitled'}</button>
                  <span className="small">{new Date(d.updatedAt).toLocaleDateString()}</span>
                  <button className="ghost" style={{ fontSize: 10, padding: '2px 6px', color: 'var(--danger)' }} onClick={() => handleDeleteDoc(d.id)}>x</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Batch Export */}
      {showBatch && (
        <div className="section mint-dropdown-section">
          <h3>Batch Export</h3>
          <div className="small" style={{ marginBottom: 6 }}>Generate serial number variants as PNG.</div>
          <label className="control-row">
            <span>Count</span>
            <input type="number" value={batchCount} min={1} max={1000} step={1} onChange={(e) => setBatchCount(Number(e.target.value))} style={{ width: 80 }} />
          </label>
          <button className="secondary" onClick={handleBatchExport} disabled={isExporting} style={{ width: '100%' }}>
            {isExporting ? 'Exporting...' : `Export ${batchCount} Variants`}
          </button>
          {batchStatus && <div className="small" style={{ marginTop: 4 }}>{batchStatus}</div>}
        </div>
      )}

      {/* Export + Stamp + Mint */}
      <div className="section">
        <h3>Export</h3>
        <div className="control-row" style={{ gap: 4 }}>
          <button className="secondary" onClick={handleExportPng} disabled={isExporting} style={{ flex: 1 }}>PNG</button>
          <button className="secondary" onClick={handleExportSvg} disabled={isExporting} style={{ flex: 1 }}>SVG</button>
        </div>
        <div className="control-row" style={{ gap: 4, marginTop: 4 }}>
          <button className="secondary" onClick={handleStampDesign} disabled={isStamping} style={{ flex: 1 }}>
            {isStamping ? 'Stamping...' : 'Stamp & Inscribe'}
          </button>
          <button onClick={handleMintToken} disabled={isStamping} style={{ flex: 1 }}>
            {isStamping ? 'Minting...' : 'Mint Token'}
          </button>
        </div>
        {stampResult && <div className="small" style={{ marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>{stampResult}</div>}
      </div>

      {/* Canvas */}
      <div className="section">
        <h3>Canvas</h3>
        <div className="control-group">
          <label className="control-row">
            <span>Width</span>
            <input type="number" value={doc.width} min={100} max={4000} step={50} onChange={(e) => onSetCanvasSize(Number(e.target.value), doc.height)} style={{ width: 80 }} />
          </label>
          <label className="control-row">
            <span>Height</span>
            <input type="number" value={doc.height} min={100} max={4000} step={50} onChange={(e) => onSetCanvasSize(doc.width, Number(e.target.value))} style={{ width: 80 }} />
          </label>
          <label className="control-row">
            <span>Background</span>
            <input type="color" value={doc.backgroundColor} onChange={(e) => onSetBackgroundColor(e.target.value)} />
          </label>
          <label className="control-row">
            <span>Circle Mask</span>
            <input type="checkbox" checked={doc.circleMask} onChange={(e) => onSetDocMeta({ circleMask: e.target.checked })} />
          </label>
          {doc.circleMask && (
            <>
              <label className="control-row">
                <span>Rim</span>
                <input type="checkbox" checked={doc.rimPattern?.enabled ?? false} onChange={(e) => onSetDocMeta({ rimPattern: { ...doc.rimPattern, enabled: e.target.checked } })} />
              </label>
              {doc.rimPattern?.enabled && (
                <>
                  <label className="control-row">
                    <span>Teeth</span>
                    <input type="range" min={20} max={300} step={5} value={doc.rimPattern.teeth} onChange={(e) => onSetDocMeta({ rimPattern: { ...doc.rimPattern, teeth: Number(e.target.value) } })} />
                    <span className="small" style={{ minWidth: 30, textAlign: 'right' }}>{doc.rimPattern.teeth}</span>
                  </label>
                  <label className="control-row">
                    <span>Depth</span>
                    <input type="range" min={2} max={20} step={1} value={doc.rimPattern.depth} onChange={(e) => onSetDocMeta({ rimPattern: { ...doc.rimPattern, depth: Number(e.target.value) } })} />
                  </label>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Layer List */}
      <div className="section">
        <h3>Layers ({doc.layers.length})</h3>
        <LayerList
          layers={doc.layers}
          selectedLayerId={selectedLayerId}
          getThumbnailSrc={getThumbnailSrc}
          onSelect={onSelectLayer}
          onReorder={onReorderLayer}
          onToggleVisible={(id) => { const l = doc.layers.find((l) => l.id === id); if (l) onUpdateMeta(id, { visible: !l.visible }); }}
          onToggleLock={(id) => { const l = doc.layers.find((l) => l.id === id); if (l) onUpdateMeta(id, { locked: !l.locked }); }}
          onRemove={onRemoveLayer}
          onDuplicate={onDuplicateLayer}
        />
        <div style={{ position: 'relative' }}>
          <button className="secondary" onClick={() => setShowAddMenu(!showAddMenu)} style={{ width: '100%' }}>+ Add Layer</button>
          {showAddMenu && (
            <div className="layer-add-menu">
              {['Security', 'Structure', 'Content', 'Background', 'Effects'].map((group) => {
                const items = LAYER_TYPES.filter((t) => t.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group}>
                    <div className="layer-add-group-label">{group}</div>
                    {items.map(({ type, label }) => (
                      <button key={type} className="ghost" onClick={() => { onAddLayer(type); setShowAddMenu(false); }}>{label}</button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Layer Inspector */}
      {selectedLayer && (
        <div className="section">
          <h3>Layer: {selectedLayer.name}</h3>
          <div className="control-group">
            <label className="control-row">
              <span>Name</span>
              <input type="text" value={selectedLayer.name} onChange={(e) => onUpdateMeta(selectedLayer.id, { name: e.target.value })} />
            </label>
            <label className="control-row">
              <span>Opacity</span>
              <input type="range" min={0} max={1} step={0.01} value={selectedLayer.opacity} onChange={(e) => onUpdateMeta(selectedLayer.id, { opacity: Number(e.target.value) })} />
              <span className="small" style={{ minWidth: 30, textAlign: 'right' }}>{Math.round(selectedLayer.opacity * 100)}%</span>
            </label>
            <label className="control-row">
              <span>Blend</span>
              <select value={selectedLayer.blendMode} onChange={(e) => onUpdateMeta(selectedLayer.id, { blendMode: e.target.value as MintBlendMode })}>
                {BLEND_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            <label className="control-row">
              <span>UV Only</span>
              <input type="checkbox" checked={selectedLayer.uvOnly ?? false} onChange={(e) => onUpdateMeta(selectedLayer.id, { uvOnly: e.target.checked })} />
            </label>
          </div>

          {/* Transform */}
          <div className="control-group">
            <div className="small" style={{ fontWeight: 600, marginBottom: 2 }}>Transform</div>
            <label className="control-row">
              <span>X</span>
              <input type="range" min={-500} max={500} step={1} value={transform.x} onChange={(e) => onUpdateTransform(selectedLayer.id, { x: Number(e.target.value) })} />
              <span className="small" style={{ minWidth: 30, textAlign: 'right' }}>{transform.x}</span>
            </label>
            <label className="control-row">
              <span>Y</span>
              <input type="range" min={-500} max={500} step={1} value={transform.y} onChange={(e) => onUpdateTransform(selectedLayer.id, { y: Number(e.target.value) })} />
              <span className="small" style={{ minWidth: 30, textAlign: 'right' }}>{transform.y}</span>
            </label>
            <label className="control-row">
              <span>Rotate</span>
              <input type="range" min={-180} max={180} step={1} value={transform.rotation} onChange={(e) => onUpdateTransform(selectedLayer.id, { rotation: Number(e.target.value) })} />
              <span className="small" style={{ minWidth: 30, textAlign: 'right' }}>{transform.rotation}&deg;</span>
            </label>
            <label className="control-row">
              <span>Scale</span>
              <input type="range" min={0.1} max={3} step={0.05} value={transform.scale} onChange={(e) => onUpdateTransform(selectedLayer.id, { scale: Number(e.target.value) })} />
              <span className="small" style={{ minWidth: 30, textAlign: 'right' }}>{transform.scale.toFixed(2)}</span>
            </label>
          </div>

          {/* Type-specific controls */}
          <div className="control-group">
            <PatternControls layer={selectedLayer} onConfigChange={(patch) => onUpdateConfig(selectedLayer.id, patch)} />
          </div>
        </div>
      )}
    </aside>
  );
}
