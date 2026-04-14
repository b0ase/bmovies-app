'use client'

import React from 'react';
import type { Spread } from '@/lib/mint/types';

type PageStripProps = {
  spreads: Spread[];
  activeIndex: number;
  onPageClick: (index: number) => void;
};

export default function PageStrip({ spreads, activeIndex, onPageClick }: PageStripProps) {
  return (
    <div className="bg-gray-950 border-t border-white/10 px-4 py-2 flex-shrink-0">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {spreads.map((spread, i) => {
          const images =
            spread.type === 'portrait-pair'
              ? [spread.left, spread.right]
              : [spread.image];

          return (
            <button
              key={i}
              className={`flex-shrink-0 relative rounded overflow-hidden border-2 transition-all ${
                i === activeIndex
                  ? 'border-red-500 shadow-lg shadow-red-950/50'
                  : 'border-white/10 hover:border-white/30'
              }`}
              onClick={() => onPageClick(i)}
            >
              <div className="flex">
                {images.map((img) => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt={img.name}
                    className="object-cover h-[60px]"
                    style={{ width: images.length === 2 ? 30 : 45 }}
                  />
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[7px] text-gray-500 text-center py-0.5">
                {i + 1}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
