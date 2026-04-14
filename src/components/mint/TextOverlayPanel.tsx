'use client'

import React from 'react';
import type { TextOverlay } from '@/lib/mint/types';
import { FONT_OPTIONS } from '@/lib/mint/logos';

type TextOverlayPanelProps = {
  overlays: TextOverlay[];
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<TextOverlay>) => void;
  onRemove: (id: string) => void;
};

export default function TextOverlayPanel({ overlays, selectedTextId, onSelectText, onAdd, onUpdate, onRemove }: TextOverlayPanelProps) {
  const selected = overlays.find((o) => o.id === selectedTextId) ?? null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Text Overlays</h3>

      <button
        className="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-3 rounded-lg transition"
        onClick={onAdd}
      >
        + Add Text
      </button>

      {overlays.length > 0 && (
        <div className="space-y-1">
          {overlays.map((overlay) => (
            <div
              key={overlay.id}
              className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs transition ${
                overlay.id === selectedTextId
                  ? 'bg-red-600/20 border border-red-500/30 text-white'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400'
              }`}
              onClick={() => onSelectText(overlay.id)}
            >
              <span className="truncate">{overlay.text.slice(0, 20) || 'Empty'}</span>
              <button
                className="ml-2 text-gray-500 hover:text-red-400 transition"
                onClick={(e) => { e.stopPropagation(); onRemove(overlay.id); }}
                title="Delete overlay"
              >
                {'\u00D7'}
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-2.5 pt-2 border-t border-white/10">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">Text</span>
            <input
              type="text"
              value={selected.text}
              onChange={(e) => onUpdate(selected.id, { text: e.target.value })}
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:border-red-500/50 focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">Font</span>
            <select
              value={selected.fontFamily}
              onChange={(e) => onUpdate(selected.id, { fontFamily: e.target.value })}
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:border-red-500/50 focus:outline-none"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">Size</span>
            <input type="range" min="12" max="200" step="1" value={selected.fontSize}
              onChange={(e) => onUpdate(selected.id, { fontSize: Number(e.target.value) })}
              className="flex-1 accent-red-500"
            />
            <span className="w-7 text-right text-gray-500">{selected.fontSize}</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">Weight</span>
            <input type="range" min="100" max="900" step="100" value={selected.fontWeight}
              onChange={(e) => onUpdate(selected.id, { fontWeight: Number(e.target.value) })}
              className="flex-1 accent-red-500"
            />
            <span className="w-7 text-right text-gray-500">{selected.fontWeight}</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">Color</span>
            <input type="color" value={selected.color}
              onChange={(e) => onUpdate(selected.id, { color: e.target.value })}
              className="w-8 h-6 rounded border border-white/10 bg-transparent cursor-pointer"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">Spacing</span>
            <input type="range" min="-5" max="20" step="0.5" value={selected.letterSpacing}
              onChange={(e) => onUpdate(selected.id, { letterSpacing: Number(e.target.value) })}
              className="flex-1 accent-red-500"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">Line H</span>
            <input type="range" min="0.8" max="3" step="0.05" value={selected.lineHeight}
              onChange={(e) => onUpdate(selected.id, { lineHeight: Number(e.target.value) })}
              className="flex-1 accent-red-500"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">Align</span>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  className={`px-2 py-1 rounded text-xs font-mono transition ${
                    selected.align === a ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                  onClick={() => onUpdate(selected.id, { align: a })}
                >
                  {a === 'left' ? '\u2190' : a === 'right' ? '\u2192' : '\u2194'}
                </button>
              ))}
            </div>
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">Width</span>
            <input type="range" min="0.1" max="1" step="0.01" value={selected.width}
              onChange={(e) => onUpdate(selected.id, { width: Number(e.target.value) })}
              className="flex-1 accent-red-500"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">Rotation</span>
            <input type="range" min="-180" max="180" step="1" value={selected.rotation}
              onChange={(e) => onUpdate(selected.id, { rotation: Number(e.target.value) })}
              className="flex-1 accent-red-500"
            />
            <span className="w-7 text-right text-gray-500">{selected.rotation}&deg;</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">Opacity</span>
            <input type="range" min="0" max="1" step="0.01" value={selected.opacity}
              onChange={(e) => onUpdate(selected.id, { opacity: Number(e.target.value) })}
              className="flex-1 accent-red-500"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">BG Color</span>
            <input type="color" value={selected.backgroundColor}
              onChange={(e) => onUpdate(selected.id, { backgroundColor: e.target.value })}
              className="w-8 h-6 rounded border border-white/10 bg-transparent cursor-pointer"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">BG Opacity</span>
            <input type="range" min="0" max="1" step="0.01" value={selected.backgroundOpacity}
              onChange={(e) => onUpdate(selected.id, { backgroundOpacity: Number(e.target.value) })}
              className="flex-1 accent-red-500"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-14 shrink-0">Visible</span>
            <input type="checkbox" checked={selected.visible}
              onChange={(e) => onUpdate(selected.id, { visible: e.target.checked })}
              className="accent-red-500"
            />
          </label>

          <button
            className="w-full text-red-400 hover:text-red-300 text-xs py-1 transition"
            onClick={() => onRemove(selected.id)}
          >
            Delete Overlay
          </button>
        </div>
      )}
    </div>
  );
}
