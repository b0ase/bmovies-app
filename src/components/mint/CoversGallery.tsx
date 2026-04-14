'use client'

import React, { useCallback, useState } from 'react';
import type { TextOverlay } from '@/lib/mint/types';
import { coverTemplates } from '@/lib/mint/cover-templates';

type CoversGalleryProps = {
  onClose: () => void;
  onApplyTemplate: (overlays: TextOverlay[]) => void;
};

export default function CoversGallery({ onClose, onApplyTemplate }: CoversGalleryProps) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [issueNum, setIssueNum] = useState('');

  const handleApplyTemplate = useCallback((templateId: string) => {
    const template = coverTemplates.find((t) => t.id === templateId);
    if (!template) return;
    const overlays = template.factory(
      title || undefined,
      subtitle || undefined,
      issueNum || undefined
    );
    onApplyTemplate(overlays);
    onClose();
  }, [title, subtitle, issueNum, onApplyTemplate, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-950 border border-white/10 rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h2 className="text-white font-bold text-sm uppercase tracking-wider">Cover Templates</h2>
          <button className="text-gray-500 hover:text-white text-xs transition" onClick={onClose}>Close</button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[65vh] space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-16 shrink-0">Title</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cover title"
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:border-red-500/50 focus:outline-none" />
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-16 shrink-0">Subtitle</span>
              <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtitle text"
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:border-red-500/50 focus:outline-none" />
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-16 shrink-0">Issue #</span>
              <input type="text" value={issueNum} onChange={(e) => setIssueNum(e.target.value)} placeholder="#001"
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:border-red-500/50 focus:outline-none" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {coverTemplates.map((template) => (
              <button
                key={template.id}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/30 rounded-lg p-4 text-left transition"
                onClick={() => handleApplyTemplate(template.id)}
              >
                <div className="text-white text-sm font-bold mb-1">{template.name}</div>
                <div className="text-gray-500 text-[10px]">{template.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
