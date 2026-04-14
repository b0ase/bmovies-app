'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CanvasPreview from '@/components/mint/CanvasPreview';
import CoversGallery from '@/components/mint/CoversGallery';
import FlipBookView from '@/components/mint/FlipBookView';
import FrameBrowser from '@/components/mint/FrameBrowser';
import LogoDesigner from '@/components/mint/LogoDesigner';
import MintCanvas from '@/components/mint/MintCanvas';
import MintPanel from '@/components/mint/MintPanel';
import ModeToggle from '@/components/mint/ModeToggle';
import PageStrip from '@/components/mint/PageStrip';
import SplashScreen from '@/components/mint/SplashScreen';
import TextOverlayPanel from '@/components/mint/TextOverlayPanel';
import TokenisePanel from '@/components/mint/TokenisePanel';
import VideoMixer from '@/components/mint/VideoMixer';
import VideoPlayer from '@/components/mint/VideoPlayer';
import WaveformEditor from '@/components/mint/WaveformEditor';
import { createDefaultSettings, createDefaultTextOverlay } from '@/lib/mint/defaults';
import { buildSpreads, isAudioFile, isVideoFile, loadImage, loadVideoThumbnail } from '@/lib/mint/image-utils';
import { createTextLogo, initialLogos, type GeneratedLogoStyle } from '@/lib/mint/logos';
import type { AppMode, AudioSegment, ExtractedFrame, ImageItem, ImageSettings, LogoAsset, Spread, StampReceipt, TextOverlay, WalletState } from '@/lib/mint/types';
import { useMintDesigner } from '@/lib/mint/useMintDesigner';
// import { useTokenisation } from '@/lib/mint/useTokenisation';
import './mint.css';

/* ── Supported file extensions ── */
const SUPPORTED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.bmp',
  '.mp4', '.mov', '.webm', '.avi',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'
]);

function spreadImages(spread: Spread): ImageItem[] {
  if (spread.type === 'portrait-pair') return [spread.left, spread.right];
  return [spread.image];
}

/* ═══════════════════════════════════════════════════
   NPGX RED — Mint
   ═══════════════════════════════════════════════════ */
export default function MintPage() {
  /* ── Core state ── */
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logos, setLogos] = useState<LogoAsset[]>(initialLogos);
  const [mode, setMode] = useState<AppMode>('stamp');
  const [showSplash, setShowSplash] = useState(true);

  /* ── Logo form ── */
  const [logoForm, setLogoForm] = useState({
    text: '',
    color: '#ffffff',
    style: 'solid' as GeneratedLogoStyle
  });

  /* ── Page navigation ── */
  const [activeSpreadIndex, setActiveSpreadIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [turnDirection, setTurnDirection] = useState<'left' | 'right' | null>(null);
  const [turnMode, setTurnMode] = useState<'slide' | 'turn'>('slide');

  /* ── Stamp state ── */
  const [stampPath, setStampPath] = useState('');
  const [lastReceipt, setLastReceipt] = useState<StampReceipt | null>(null);
  const [isStamping, setIsStamping] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  /* ── Overlays / modals ── */
  const [showLogoDesigner, setShowLogoDesigner] = useState(false);
  const [showCoversGallery, setShowCoversGallery] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState(false);

  /* ── Mint designer ── */
  const mint = useMintDesigner();
  const [showMintGrid, setShowMintGrid] = useState(false);
  const [mintAnimate, setMintAnimate] = useState(false);

  /* ── DnD reorder ── */
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  /* ── Tokenise state (stub — no Electron) ── */
  const [extractedFrames] = useState<Map<string, ExtractedFrame[]>>(new Map());
  const [audioSegments] = useState<Map<string, AudioSegment[]>>(new Map());
  const [audioPeaks] = useState<Map<string, number[]>>(new Map());
  const [selectedPieceIds] = useState<Set<string>>(new Set());

  /* ── Refs ── */
  const canvasPanelRef = useRef<HTMLElement>(null);
  const swipeRef = useRef<{ startX: number; startY: number } | null>(null);

  /* ══════════════════════════════════════════════════
     Computed / Memoised
     ══════════════════════════════════════════════════ */

  const sortedImages = useMemo(() => [...images].sort((a, b) => a.sortOrder - b.sortOrder), [images]);
  const enabledImages = useMemo(() => sortedImages.filter((img) => !img.disabled), [sortedImages]);
  const spreads = useMemo(() => buildSpreads(enabledImages), [enabledImages]);

  const pairMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const spread of spreads) {
      if (spread.type === 'portrait-pair') {
        map.set(spread.left.id, spread.right.id);
        map.set(spread.right.id, spread.left.id);
      }
    }
    return map;
  }, [spreads]);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedId) || null,
    [images, selectedId]
  );

  const currentSpreadIndex = useMemo(() => {
    if (!selectedId) return activeSpreadIndex;
    const idx = spreads.findIndex((s) => spreadImages(s).some((img) => img.id === selectedId));
    return idx >= 0 ? idx : activeSpreadIndex;
  }, [spreads, selectedId, activeSpreadIndex]);

  const currentSpread = currentSpreadIndex >= 0 && currentSpreadIndex < spreads.length
    ? spreads[currentSpreadIndex]
    : null;

  const selectedLogo = useMemo(() => {
    if (!selectedImage) return logos[0] || null;
    return logos.find((logo) => logo.id === selectedImage.settings.logoId) || logos[0] || null;
  }, [logos, selectedImage]);

  const currentFrames = useMemo(() => {
    if (!selectedId) return [];
    return extractedFrames.get(selectedId) ?? [];
  }, [selectedId, extractedFrames]);

  const currentSegments = useMemo(() => {
    if (!selectedId) return [];
    return audioSegments.get(selectedId) ?? [];
  }, [selectedId, audioSegments]);

  const currentPeaks = useMemo(() => {
    if (!selectedId) return [];
    return audioPeaks.get(selectedId) ?? [];
  }, [selectedId, audioPeaks]);

  /* ══════════════════════════════════════════════════
     File loading — Web File API (replaces Electron IPC)
     ══════════════════════════════════════════════════ */

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const defaultLogoId = logos[0]?.id ?? 'mint-outline';

    const results = await Promise.all(
      files.map(async (file): Promise<ImageItem | null> => {
        try {
          const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
          if (!SUPPORTED_EXT.has(ext)) return null;

          const blobUrl = URL.createObjectURL(file);

          if (isAudioFile(file.name)) {
            return {
              id: crypto.randomUUID(),
              path: blobUrl, // blob URL for playback
              name: file.name,
              url: 'data:image/svg+xml,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80"><rect fill="#222" width="400" height="80"/><text x="200" y="45" fill="#666" text-anchor="middle" font-size="14">Audio</text></svg>'
              ),
              width: 400,
              height: 80,
              sortOrder: 0,
              mediaType: 'audio' as const,
              settings: createDefaultSettings(defaultLogoId),
            };
          }

          if (isVideoFile(file.name)) {
            try {
              const { width, height, thumbnailUrl } = await loadVideoThumbnail(blobUrl);
              return {
                id: crypto.randomUUID(),
                path: blobUrl, // blob URL for playback
                name: file.name,
                url: thumbnailUrl, // thumbnail for sidebar display
                width,
                height,
                sortOrder: 0,
                mediaType: 'video' as const,
                settings: createDefaultSettings(defaultLogoId),
              };
            } catch {
              return {
                id: crypto.randomUUID(),
                path: blobUrl, // blob URL for playback
                name: file.name,
                url: blobUrl,
                width: 1920,
                height: 1080,
                sortOrder: 0,
                mediaType: 'video' as const,
                settings: createDefaultSettings(defaultLogoId),
              };
            }
          }

          // Image
          const img = await loadImage(blobUrl);
          return {
            id: crypto.randomUUID(),
            path: blobUrl, // blob URL
            name: file.name,
            url: blobUrl,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            sortOrder: 0,
            mediaType: 'image' as const,
            settings: createDefaultSettings(defaultLogoId),
          };
        } catch (err) {
          console.error(`Failed to load ${file.name}:`, err);
          return null;
        }
      })
    );

    const items = results.filter((item): item is ImageItem => item !== null);

    setImages((prev) => {
      const startOrder = prev.length > 0 ? Math.max(...prev.map((p) => p.sortOrder)) + 1 : 0;
      const withOrder = items.map((item, i) => ({ ...item, sortOrder: startOrder + i }));
      return [...prev, ...withOrder];
    });
    setSelectedId((prev) => prev ?? items[0]?.id ?? null);
  }, [logos]);

  const handleLoadFiles = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*,audio/*';
    input.onchange = async () => {
      if (!input.files) return;
      await processFiles(Array.from(input.files));
    };
    input.click();
  }, [processFiles]);

  // Auto-load all media from NPGX public directories on mount
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  useEffect(() => {
    if (showSplash || libraryLoaded) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/mint/library');
        if (!res.ok) return;
        const data = await res.json();
        const files: { name: string; path: string; mediaType: 'image' | 'video' | 'audio' }[] = data.files ?? [];
        if (cancelled || files.length === 0) return;

        const defaultLogoId = logos[0]?.id ?? 'mint-outline';
        const items: ImageItem[] = [];

        for (const f of files) {
          if (f.mediaType === 'audio') {
            items.push({
              id: crypto.randomUUID(),
              path: f.path,
              name: f.name,
              url: 'data:image/svg+xml,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80"><rect fill="#222" width="400" height="80"/><text x="200" y="45" fill="#666" text-anchor="middle" font-size="14">Audio</text></svg>'
              ),
              width: 400,
              height: 80,
              sortOrder: items.length,
              mediaType: 'audio',
              settings: createDefaultSettings(defaultLogoId),
            });
          } else if (f.mediaType === 'video') {
            items.push({
              id: crypto.randomUUID(),
              path: f.path,
              name: f.name,
              url: f.path, // thumbnail generated on demand
              width: 1920,
              height: 1080,
              sortOrder: items.length,
              mediaType: 'video',
              settings: createDefaultSettings(defaultLogoId),
            });
          } else {
            items.push({
              id: crypto.randomUUID(),
              path: f.path,
              name: f.name,
              url: f.path,
              width: 800,
              height: 1200, // assume portrait; corrected when rendered
              sortOrder: items.length,
              mediaType: 'image',
              settings: createDefaultSettings(defaultLogoId),
            });
          }
        }

        if (!cancelled && items.length > 0) {
          setImages(items);
          setSelectedId(items[0].id);
        }
      } catch (err) {
        console.error('Failed to load mint library:', err);
      } finally {
        if (!cancelled) setLibraryLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [showSplash, libraryLoaded, logos]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter((f) => {
      const ext = '.' + (f.name.split('.').pop()?.toLowerCase() ?? '');
      return SUPPORTED_EXT.has(ext);
    });
    await processFiles(files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  /* ══════════════════════════════════════════════════
     Image operations
     ══════════════════════════════════════════════════ */

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    if (selectedId === id) {
      setSelectedId((prev) => {
        const remaining = images.filter((img) => img.id !== id);
        return remaining[0]?.id ?? null;
      });
    }
    setSelectedTextId(null);
  }, [selectedId, images]);

  const handleToggleDisabled = useCallback((id: string) => {
    setImages((prev) => prev.map((img) =>
      img.id === id ? { ...img, disabled: !img.disabled } : img
    ));
  }, []);

  const handleReorderImages = useCallback((sourceId: string, targetIndex: number) => {
    setImages((prev) => {
      const sorted = [...prev].sort((a, b) => a.sortOrder - b.sortOrder);
      const sourceIdx = sorted.findIndex((img) => img.id === sourceId);
      if (sourceIdx < 0 || sourceIdx === targetIndex) return prev;
      const [moved] = sorted.splice(sourceIdx, 1);
      sorted.splice(targetIndex, 0, moved);
      return sorted.map((img, i) => ({ ...img, sortOrder: i }));
    });
  }, []);

  const updateSelectedSettings = (patch: Partial<ImageSettings>) => {
    if (!selectedImage) return;
    setImages((prev) =>
      prev.map((image) =>
        image.id === selectedImage.id
          ? { ...image, settings: { ...image.settings, ...patch } }
          : image
      )
    );
  };

  /* ── Text overlays ── */

  const handleAddTextOverlay = useCallback(() => {
    if (!selectedImage) return;
    const overlay = createDefaultTextOverlay();
    setImages((prev) => prev.map((img) =>
      img.id === selectedImage.id
        ? { ...img, settings: { ...img.settings, textOverlays: [...img.settings.textOverlays, overlay] } }
        : img
    ));
    setSelectedTextId(overlay.id);
  }, [selectedImage]);

  const handleUpdateTextOverlay = useCallback((overlayId: string, patch: Partial<TextOverlay>) => {
    if (!selectedImage) return;
    setImages((prev) => prev.map((img) =>
      img.id === selectedImage.id
        ? {
            ...img,
            settings: {
              ...img.settings,
              textOverlays: img.settings.textOverlays.map((o) =>
                o.id === overlayId ? { ...o, ...patch } : o
              )
            }
          }
        : img
    ));
  }, [selectedImage]);

  const handleRemoveTextOverlay = useCallback((overlayId: string) => {
    if (!selectedImage) return;
    setImages((prev) => prev.map((img) =>
      img.id === selectedImage.id
        ? {
            ...img,
            settings: {
              ...img.settings,
              textOverlays: img.settings.textOverlays.filter((o) => o.id !== overlayId)
            }
          }
        : img
    ));
    if (selectedTextId === overlayId) setSelectedTextId(null);
  }, [selectedImage, selectedTextId]);

  /* ── Logo ── */

  const handleCreateLogo = () => {
    const newLogo = createTextLogo(logoForm.text, logoForm.color, logoForm.style);
    setLogos((prev) => [newLogo, ...prev]);
    if (selectedImage) {
      updateSelectedSettings({ logoId: newLogo.id });
    }
  };

  const handleApplyLogoToAll = () => {
    if (!selectedLogo) return;
    setImages((prev) => prev.map((image) => ({
      ...image,
      settings: { ...image.settings, logoId: selectedLogo.id }
    })));
  };

  const handleImportLogo = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/svg+xml,image/png,image/jpeg';
    input.onchange = async () => {
      if (!input.files?.length) return;
      const file = input.files[0];
      const src = URL.createObjectURL(file);
      const newLogo: LogoAsset = {
        id: `import-${crypto.randomUUID()}`,
        name: file.name,
        src,
        kind: 'imported'
      };
      setLogos((prev) => [newLogo, ...prev]);
      if (selectedImage) {
        updateSelectedSettings({ logoId: newLogo.id });
      }
    };
    input.click();
  };

  /* ══════════════════════════════════════════════════
     Page navigation
     ══════════════════════════════════════════════════ */

  const triggerTurn = (direction: 'left' | 'right') => {
    setTurnDirection(direction);
    setTimeout(() => setTurnDirection(null), 300);
  };

  const handlePrevSpread = useCallback(() => {
    if (currentSpreadIndex <= 0) return;
    triggerTurn('right');
    const prev = spreads[currentSpreadIndex - 1];
    const imgs = spreadImages(prev);
    setSelectedId(imgs[0].id);
    setActiveSpreadIndex(currentSpreadIndex - 1);
  }, [currentSpreadIndex, spreads]);

  const handleNextSpread = useCallback(() => {
    if (currentSpreadIndex >= spreads.length - 1) return;
    triggerTurn('left');
    const next = spreads[currentSpreadIndex + 1];
    const imgs = spreadImages(next);
    setSelectedId(imgs[0].id);
    setActiveSpreadIndex(currentSpreadIndex + 1);
  }, [currentSpreadIndex, spreads]);

  const handlePageClick = (index: number) => {
    if (index === currentSpreadIndex) return;
    triggerTurn(index > currentSpreadIndex ? 'left' : 'right');
    const spread = spreads[index];
    if (spread) {
      const imgs = spreadImages(spread);
      setSelectedId(imgs[0].id);
      setActiveSpreadIndex(index);
    }
  };

  /* ══════════════════════════════════════════════════
     Keyboard + swipe nav
     ══════════════════════════════════════════════════ */

  useEffect(() => {
    setPlayingVideo(false);
    setSelectedTextId(null);
  }, [selectedId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.ctrlKey || e.metaKey;

      // Mint mode shortcuts
      if (mode === 'mint') {
        if (ctrl && e.key === 'z') { e.preventDefault(); mint.undo(); return; }
        if (ctrl && e.key === 'y') { e.preventDefault(); mint.redo(); return; }
        if (ctrl && e.key === 'd') { e.preventDefault(); if (mint.selectedLayerId) mint.duplicateLayer(mint.selectedLayerId); return; }
        if ((e.key === 'Delete' || e.key === 'Backspace') && mint.selectedLayerId) {
          e.preventDefault(); mint.removeLayer(mint.selectedLayerId); return;
        }
        if (e.key === '[' && mint.selectedLayerId) {
          e.preventDefault();
          const idx = mint.doc.layers.findIndex((l) => l.id === mint.selectedLayerId);
          if (idx > 0) mint.reorderLayer(mint.selectedLayerId, idx - 1);
          return;
        }
        if (e.key === ']' && mint.selectedLayerId) {
          e.preventDefault();
          const idx = mint.doc.layers.findIndex((l) => l.id === mint.selectedLayerId);
          if (idx < mint.doc.layers.length - 1) mint.reorderLayer(mint.selectedLayerId, idx + 1);
          return;
        }
        if (e.key === 'ArrowLeft' && mint.selectedLayerId) {
          e.preventDefault();
          mint.updateLayerTransform(mint.selectedLayerId, { x: (mint.selectedLayer?.transform?.x ?? 0) - (e.shiftKey ? 10 : 1) });
          return;
        }
        if (e.key === 'ArrowRight' && mint.selectedLayerId) {
          e.preventDefault();
          mint.updateLayerTransform(mint.selectedLayerId, { x: (mint.selectedLayer?.transform?.x ?? 0) + (e.shiftKey ? 10 : 1) });
          return;
        }
        if (e.key === 'ArrowUp' && mint.selectedLayerId) {
          e.preventDefault();
          mint.updateLayerTransform(mint.selectedLayerId, { y: (mint.selectedLayer?.transform?.y ?? 0) - (e.shiftKey ? 10 : 1) });
          return;
        }
        if (e.key === 'ArrowDown' && mint.selectedLayerId) {
          e.preventDefault();
          mint.updateLayerTransform(mint.selectedLayerId, { y: (mint.selectedLayer?.transform?.y ?? 0) + (e.shiftKey ? 10 : 1) });
          return;
        }
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        handleRemoveImage(selectedId);
        return;
      }
      if (e.key === 'Escape' && selectedTextId) {
        e.preventDefault();
        setSelectedTextId(null);
        return;
      }
      if (ctrl && e.key === 't') {
        e.preventDefault();
        handleAddTextOverlay();
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (selectedTextId && selectedImage) {
          const overlay = selectedImage.settings.textOverlays.find((o) => o.id === selectedTextId);
          if (overlay) { handleUpdateTextOverlay(selectedTextId, { x: overlay.x - (e.shiftKey ? 0.05 : 0.01) }); return; }
        }
        handlePrevSpread();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (selectedTextId && selectedImage) {
          const overlay = selectedImage.settings.textOverlays.find((o) => o.id === selectedTextId);
          if (overlay) { handleUpdateTextOverlay(selectedTextId, { x: overlay.x + (e.shiftKey ? 0.05 : 0.01) }); return; }
        }
        handleNextSpread();
      } else if (e.key === 'ArrowUp') {
        if (selectedTextId && selectedImage) {
          e.preventDefault();
          const overlay = selectedImage.settings.textOverlays.find((o) => o.id === selectedTextId);
          if (overlay) handleUpdateTextOverlay(selectedTextId, { y: overlay.y - (e.shiftKey ? 0.05 : 0.01) });
        }
      } else if (e.key === 'ArrowDown') {
        if (selectedTextId && selectedImage) {
          e.preventDefault();
          const overlay = selectedImage.settings.textOverlays.find((o) => o.id === selectedTextId);
          if (overlay) handleUpdateTextOverlay(selectedTextId, { y: overlay.y + (e.shiftKey ? 0.05 : 0.01) });
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handlePrevSpread, handleNextSpread, mode, mint, selectedId, selectedTextId, selectedImage, handleRemoveImage, handleAddTextOverlay, handleUpdateTextOverlay]);

  // Swipe navigation
  useEffect(() => {
    const el = canvasPanelRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      swipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!swipeRef.current || e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - swipeRef.current.startX;
      const dy = e.changedTouches[0].clientY - swipeRef.current.startY;
      swipeRef.current = null;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) handleNextSpread();
      else handlePrevSpread();
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [handlePrevSpread, handleNextSpread]);

  /* ── Fullscreen ── */
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await canvasPanelRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  /* ── Stub handlers (features requiring Electron / backend) ── */

  const handleHashAndInscribe = async () => {
    alert('Hash & Inscribe requires the desktop app or a backend API.');
  };

  const handleMintToken = async () => {
    alert('Mint Token requires the desktop app or a backend API.');
  };

  const handleBatchStamp = async () => {
    alert('Batch Stamp requires the desktop app or a backend API.');
  };

  const handleExtractFrames = async () => {
    alert('Frame extraction requires the desktop app or FFmpeg backend.');
  };

  const handleStampPieces = async () => {
    alert('Stamp Pieces requires the desktop app or a backend API.');
  };

  const handleMintPieces = async () => {
    alert('Mint Pieces requires the desktop app or a backend API.');
  };

  const handleApplyTemplate = useCallback((overlays: TextOverlay[]) => {
    const target = enabledImages[0] || sortedImages[0];
    if (!target) return;
    setImages((prev) => prev.map((img) =>
      img.id === target.id
        ? { ...img, settings: { ...img.settings, textOverlays: overlays } }
        : img
    ));
    setSelectedId(target.id);
  }, [enabledImages, sortedImages]);

  /* ══════════════════════════════════════════════════
     Canvas wrapper class
     ══════════════════════════════════════════════════ */
  const canvasWrapperClass = [
    'canvas-wrapper',
    turnDirection === 'left' && 'turning-left',
    turnDirection === 'right' && 'turning-right'
  ].filter(Boolean).join(' ');

  /* ══════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════ */
  if (showSplash) {
    return (
      <div className="mint-app">
        <SplashScreen onEnter={() => setShowSplash(false)} />
      </div>
    );
  }

  return (
    <div className="mint-app" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="app">
        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="brand-title">NPGX <span className="brand-accent">Mint</span></h1>
          </div>
          <div className="topbar-actions">
            <ModeToggle mode={mode} onChange={setMode} />
            <button className="secondary" onClick={handleLoadFiles}>
              Load Files
            </button>
            <button className="secondary" onClick={() => setShowCoversGallery(true)}>
              Covers
            </button>
            <button
              className="fullscreen-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? '\u2716' : '\u26F6'}
            </button>
          </div>
        </header>

        {/* ── Watch mode: full-screen video player ── */}
        {mode === 'watch' ? (
          <div style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
            <VideoPlayer
              videos={images}
              currentVideo={selectedImage || null}
              onSelectVideo={(item) => setSelectedId(item.id)}
            />
          </div>
        ) : mode === 'mix' ? (
          <VideoMixer mediaItems={images} />
        ) : (
          /* ── Stamp / Mint / Tokenise — 3-column layout ── */
          <div className="main">
            {/* ── Left panel: image list ── */}
            <aside className="panel left-panel">
              <h2>Images</h2>
              <div className="image-list">
                {sortedImages.length === 0 ? (
                  <div className="empty-sidebar">
                    <div className="empty-sidebar-icon">{'\u25C8'}</div>
                    <div className="small">Drop files here or use Load Files above to load media.</div>
                  </div>
                ) : (
                  sortedImages.map((image, idx) => {
                    const partnerId = pairMap.get(image.id);
                    const isPaired = !!partnerId;
                    const isPartnerSelected = partnerId === selectedId;
                    return (
                      <div
                        key={image.id}
                        draggable
                        className={[
                          'image-card',
                          image.id === selectedId && 'active',
                          isPartnerSelected && 'paired',
                          image.disabled && 'is-disabled',
                          isPaired && 'is-paired',
                          dragId === image.id && 'dragging',
                          dragOverIndex === idx && 'drag-over'
                        ].filter(Boolean).join(' ')}
                        onClick={() => setSelectedId(image.id)}
                        onDragStart={(e) => {
                          setDragId(image.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          setDragOverIndex(idx);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (dragId) handleReorderImages(dragId, idx);
                          setDragId(null);
                          setDragOverIndex(null);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDragOverIndex(null);
                        }}
                      >
                        <span className="image-drag-handle" onMouseDown={(e) => e.stopPropagation()}>{'\u2630'}</span>
                        <div style={{ position: 'relative' }}>
                          <img src={image.url} alt={image.name} />
                          {image.mediaType === 'video' && (
                            <span className="video-badge">VID</span>
                          )}
                          {image.mediaType === 'audio' && (
                            <span className="video-badge" style={{ background: 'rgba(100, 149, 237, 0.85)' }}>AUD</span>
                          )}
                        </div>
                        <div className="image-meta">
                          <strong>{image.name}</strong>
                          <span>
                            {image.mediaType === 'video' ? 'Video' : image.mediaType === 'audio' ? 'Audio' : (image.width > image.height ? 'L' : 'P')}
                            {image.duration ? ` \u00b7 ${Math.floor(image.duration)}s` : ''}
                            {isPaired ? ' \u00b7 Paired' : ''}
                            {image.disabled ? ' \u00b7 Off' : ''}
                          </span>
                        </div>
                        <div className="image-card-actions">
                          <button
                            className="image-toggle"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleDisabled(image.id);
                            }}
                            title={image.disabled ? 'Enable' : 'Disable'}
                          >
                            {image.disabled ? '\u25CB' : '\u25C9'}
                          </button>
                          <button
                            className="image-remove-btn"
                            onClick={(e) => { e.stopPropagation(); handleRemoveImage(image.id); }}
                            title="Remove from session"
                          >
                            {'\u00D7'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>

            {/* ── Center panel: canvas / preview ── */}
            <section className="canvas-panel" ref={canvasPanelRef}>
              {/* Mint mode: Currency Designer canvas */}
              {mode === 'mint' ? (
                <MintCanvas
                  doc={mint.doc}
                  selectedLayerId={mint.selectedLayerId}
                  renderToCanvas={mint.renderToCanvas}
                  onSelectLayer={mint.selectLayer}
                  showGrid={showMintGrid}
                  animatePreview={mintAnimate}
                />
              ) : /* Tokenise mode: show FrameBrowser or WaveformEditor */
              mode === 'tokenise' && selectedImage?.mediaType === 'video' && currentFrames.length > 0 ? (
                <FrameBrowser
                  frames={currentFrames}
                  selectedIds={selectedPieceIds}
                  onSelectFrame={() => {}}
                  onSelectRange={() => {}}
                  onSelectEveryNth={() => {}}
                  onSelectAll={() => {}}
                />
              ) : mode === 'tokenise' && selectedImage?.mediaType === 'audio' && currentPeaks.length > 0 ? (
                <WaveformEditor
                  filePath={selectedImage.path}
                  duration={selectedImage.duration || 0}
                  peaks={currentPeaks}
                  segments={currentSegments}
                  onSegmentsChange={() => {}}
                  parentId={selectedImage.id}
                />
              ) : images.length === 0 ? (
                <div className={`canvas-empty-state ${mode === 'tokenise' ? 'tokenise-empty' : 'stamp-empty'}`}>
                  <div className="canvas-empty-content">
                    <div className="canvas-empty-icon">
                      {mode === 'tokenise' ? '\u2699' : '\u2756'}
                    </div>
                    <div className="canvas-empty-title">
                      {mode === 'tokenise' ? 'Tokenise Media' : 'Load Media to Begin'}
                    </div>
                    <div className="canvas-empty-hint">
                      {mode === 'tokenise'
                        ? 'Load video or audio files to extract frames and segments for tokenisation.'
                        : 'Drop files here, or use Load Files above to start framing and stamping.'}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="canvas-video-wrap">
                    {turnMode === 'slide' ? (
                      <CanvasPreview
                        spread={currentSpread}
                        selectedId={selectedId}
                        logos={logos}
                        pageNumber={currentSpread ? currentSpreadIndex + 1 : undefined}
                        selectedTextId={selectedTextId}
                        onLogoPosChange={(pos) => updateSelectedSettings({ logoPos: pos })}
                        onSelectImage={(id) => setSelectedId(id)}
                        onTextOverlayPosChange={(overlayId, pos) => handleUpdateTextOverlay(overlayId, pos)}
                        onSelectTextOverlay={setSelectedTextId}
                        wrapperClassName={canvasWrapperClass}
                      />
                    ) : (
                      <FlipBookView
                        spreads={spreads}
                        logos={logos}
                        activeIndex={currentSpreadIndex}
                        onPageChange={(idx) => {
                          const spread = spreads[idx];
                          if (spread) {
                            const imgs = spreadImages(spread);
                            setSelectedId(imgs[0].id);
                            setActiveSpreadIndex(idx);
                          }
                        }}
                      />
                    )}
                    {selectedImage?.mediaType === 'video' && !playingVideo && (
                      <button
                        className="video-play-overlay"
                        onClick={() => setPlayingVideo(true)}
                        title="Play video"
                      >
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                          <circle cx="24" cy="24" r="23" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="rgba(0,0,0,0.5)" />
                          <path d="M19 14L35 24L19 34V14Z" fill="rgba(255,255,255,0.9)" />
                        </svg>
                      </button>
                    )}
                    {selectedImage?.mediaType === 'video' && playingVideo && (
                      <div className="video-player-overlay">
                        <video
                          src={selectedImage.path}
                          controls
                          autoPlay
                        />
                        <button className="video-close-btn" onClick={() => setPlayingVideo(false)}>
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="canvas-helper">
                    <button
                      className="ghost spread-nav"
                      onClick={handlePrevSpread}
                      disabled={currentSpreadIndex <= 0}
                    >
                      Prev
                    </button>
                    <span>
                      {currentSpread
                        ? `Page ${currentSpreadIndex + 1} of ${spreads.length}`
                        : 'Select an image to edit.'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {mode === 'stamp' && selectedImage && (
                        <button
                          className="ghost spread-nav"
                          onClick={handleAddTextOverlay}
                          title="Add text overlay (Ctrl+T)"
                        >
                          + Text
                        </button>
                      )}
                      <div className="turn-toggle">
                        <button
                          className={`turn-toggle-btn ${turnMode === 'slide' ? 'active' : ''}`}
                          onClick={() => setTurnMode('slide')}
                        >
                          Slide
                        </button>
                        <button
                          className={`turn-toggle-btn ${turnMode === 'turn' ? 'active' : ''}`}
                          onClick={() => setTurnMode('turn')}
                        >
                          Turn
                        </button>
                      </div>
                      <button
                        className="ghost spread-nav"
                        onClick={handleNextSpread}
                        disabled={currentSpreadIndex >= spreads.length - 1}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* ── Right panel ── */}
            {mode === 'mint' ? (
              <MintPanel
                doc={mint.doc}
                selectedLayer={mint.selectedLayer}
                selectedLayerId={mint.selectedLayerId}
                canUndo={mint.canUndo}
                canRedo={mint.canRedo}
                uvMode={mint.uvMode}
                onAddLayer={mint.addLayer}
                onRemoveLayer={mint.removeLayer}
                onReorderLayer={mint.reorderLayer}
                onUpdateConfig={mint.updateLayerConfig}
                onUpdateMeta={mint.updateLayerMeta}
                onUpdateTransform={mint.updateLayerTransform}
                onDuplicateLayer={mint.duplicateLayer}
                onSelectLayer={mint.selectLayer}
                onSetCanvasSize={mint.setCanvasSize}
                onSetBackgroundColor={mint.setBackgroundColor}
                onSetDocMeta={mint.setDocMeta}
                onSetUvMode={mint.setUvMode}
                onUndo={mint.undo}
                onRedo={mint.redo}
                onLoadDocument={mint.loadDocument}
                onExportPng={mint.exportPng}
                onExportBatchPng={mint.exportBatchPng}
                showGrid={showMintGrid}
                onToggleGrid={() => setShowMintGrid((prev) => !prev)}
                animatePreview={mintAnimate}
                onToggleAnimate={() => setMintAnimate((prev) => !prev)}
                getThumbnailSrc={mint.getLayerThumbnailSrc}
              />
            ) : mode === 'tokenise' ? (
              <TokenisePanel
                selectedImage={selectedImage}
                stampPath={stampPath}
                onStampPathChange={setStampPath}
                extractedFrames={currentFrames}
                extractionProgress={null}
                onExtractFrames={handleExtractFrames}
                onClearFrames={() => {}}
                audioSegments={currentSegments}
                selectedPieceCount={selectedPieceIds.size}
                totalPieces={
                  selectedImage?.mediaType === 'video' ? currentFrames.length :
                  selectedImage?.mediaType === 'audio' ? currentSegments.length : 1
                }
                isStamping={isStamping}
                onStampPieces={handleStampPieces}
                onMintPieces={handleMintPieces}
                isMinting={isMinting}
                mintingProgress={null}
                lastReceipt={lastReceipt}
              />
            ) : (
              <aside className="panel right-panel">
                <h2>Settings</h2>
                {selectedImage ? (
                  <>
                    <TextOverlayPanel
                      overlays={selectedImage.settings.textOverlays}
                      selectedTextId={selectedTextId}
                      onSelectText={setSelectedTextId}
                      onAdd={handleAddTextOverlay}
                      onUpdate={handleUpdateTextOverlay}
                      onRemove={handleRemoveTextOverlay}
                    />

                    <div className="section">
                      <h3>Vignette</h3>
                      <div className="control-group">
                        <label className="control-row">
                          <span>Enabled</span>
                          <input
                            type="checkbox"
                            checked={selectedImage.settings.vignetteEnabled}
                            onChange={(event) => updateSelectedSettings({ vignetteEnabled: event.target.checked })}
                          />
                        </label>
                        <label className="control-row">
                          <span>Strength</span>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={selectedImage.settings.vignetteStrength}
                            onChange={(event) => updateSelectedSettings({ vignetteStrength: Number(event.target.value) })}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="section">
                      <h3>Frame</h3>
                      <div className="control-group">
                        <label className="control-row">
                          <span>Enabled</span>
                          <input
                            type="checkbox"
                            checked={selectedImage.settings.frameEnabled}
                            onChange={(event) => updateSelectedSettings({ frameEnabled: event.target.checked })}
                          />
                        </label>
                        <label className="control-row">
                          <span>Thickness</span>
                          <input
                            type="range"
                            min="0"
                            max="0.12"
                            step="0.005"
                            value={selectedImage.settings.frameThickness}
                            onChange={(event) => updateSelectedSettings({ frameThickness: Number(event.target.value) })}
                          />
                        </label>
                        <label className="control-row">
                          <span>Color</span>
                          <input
                            type="color"
                            value={selectedImage.settings.frameColor}
                            onChange={(event) => updateSelectedSettings({ frameColor: event.target.value })}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="section">
                      <h3>Logo</h3>
                      <div className="control-group">
                        <label className="control-row">
                          <span>Size</span>
                          <input
                            type="range"
                            min="0.05"
                            max="1.0"
                            step="0.01"
                            value={selectedImage.settings.logoScale}
                            onChange={(event) => updateSelectedSettings({ logoScale: Number(event.target.value) })}
                          />
                        </label>
                        <div className="control-row">
                          <button className="secondary" onClick={() => updateSelectedSettings({ logoPos: { x: 0.82, y: 0.86 } })}>
                            Reset Position
                          </button>
                          <button className="ghost" onClick={handleApplyLogoToAll}>
                            Apply To All
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="section">
                      <h3>Logo Gallery</h3>
                      <div className="logo-grid">
                        {logos.map((logo) => (
                          <div
                            key={logo.id}
                            className={`logo-item ${selectedImage.settings.logoId === logo.id ? 'active' : ''}`}
                            onClick={() => updateSelectedSettings({ logoId: logo.id })}
                            title={logo.name}
                          >
                            <img src={logo.src} alt={logo.name} />
                          </div>
                        ))}
                      </div>
                      <button className="secondary" onClick={handleImportLogo}>
                        Import Logo
                      </button>
                      <button className="secondary" onClick={() => setShowLogoDesigner(true)}>
                        Design Logo
                      </button>
                    </div>

                    <div className="section">
                      <h3>Create Logo</h3>
                      <div className="control-group">
                        <label className="control-row">
                          <span>Text</span>
                          <input
                            type="text"
                            value={logoForm.text}
                            onChange={(event) => setLogoForm((prev) => ({ ...prev, text: event.target.value }))}
                          />
                        </label>
                        <label className="control-row">
                          <span>Style</span>
                          <select
                            value={logoForm.style}
                            onChange={(event) =>
                              setLogoForm((prev) => ({ ...prev, style: event.target.value as GeneratedLogoStyle }))
                            }
                          >
                            <option value="solid">Solid</option>
                            <option value="outline">Outline</option>
                            <option value="stamp">Stamp</option>
                          </select>
                        </label>
                        <label className="control-row">
                          <span>Color</span>
                          <input
                            type="color"
                            value={logoForm.color}
                            onChange={(event) => setLogoForm((prev) => ({ ...prev, color: event.target.value }))}
                          />
                        </label>
                        <button onClick={handleCreateLogo}>Add Logo</button>
                      </div>
                    </div>

                    <div className="section">
                      <h3>Stamp</h3>
                      <div className="control-group">
                        <label className="control-row">
                          <span>Path</span>
                          <input
                            type="text"
                            value={stampPath}
                            onChange={(e) => {
                              setStampPath(e.target.value);
                              if (selectedImage?.settings.stampVisual.borderStampEnabled) {
                                updateSelectedSettings({
                                  stampVisual: { ...selectedImage.settings.stampVisual, borderStampText: e.target.value }
                                });
                              }
                            }}
                            placeholder="$TOKEN/SERIES/ISSUE"
                          />
                        </label>
                        <label className="control-row">
                          <span>Watermark</span>
                          <input
                            type="checkbox"
                            checked={selectedImage.settings.stampVisual.watermarkEnabled}
                            onChange={(e) =>
                              updateSelectedSettings({
                                stampVisual: { ...selectedImage.settings.stampVisual, watermarkEnabled: e.target.checked }
                              })
                            }
                          />
                        </label>
                        {selectedImage.settings.stampVisual.watermarkEnabled && (
                          <>
                            <label className="control-row">
                              <span>Text</span>
                              <input
                                type="text"
                                value={selectedImage.settings.stampVisual.watermarkText}
                                onChange={(e) =>
                                  updateSelectedSettings({
                                    stampVisual: { ...selectedImage.settings.stampVisual, watermarkText: e.target.value }
                                  })
                                }
                              />
                            </label>
                            <label className="control-row">
                              <span>Opacity</span>
                              <input
                                type="range"
                                min="0.02"
                                max="0.5"
                                step="0.01"
                                value={selectedImage.settings.stampVisual.watermarkOpacity}
                                onChange={(e) =>
                                  updateSelectedSettings({
                                    stampVisual: { ...selectedImage.settings.stampVisual, watermarkOpacity: Number(e.target.value) }
                                  })
                                }
                              />
                            </label>
                            <label className="control-row">
                              <span>Position</span>
                              <select
                                value={selectedImage.settings.stampVisual.watermarkPosition}
                                onChange={(e) =>
                                  updateSelectedSettings({
                                    stampVisual: { ...selectedImage.settings.stampVisual, watermarkPosition: e.target.value as 'center' | 'diagonal' | 'bottom-right' }
                                  })
                                }
                              >
                                <option value="diagonal">Diagonal</option>
                                <option value="center">Center</option>
                                <option value="bottom-right">Bottom Right</option>
                              </select>
                            </label>
                          </>
                        )}
                        <label className="control-row">
                          <span>Border Stamp</span>
                          <input
                            type="checkbox"
                            checked={selectedImage.settings.stampVisual.borderStampEnabled}
                            onChange={(e) =>
                              updateSelectedSettings({
                                stampVisual: {
                                  ...selectedImage.settings.stampVisual,
                                  borderStampEnabled: e.target.checked,
                                  borderStampText: e.target.checked ? stampPath : selectedImage.settings.stampVisual.borderStampText
                                }
                              })
                            }
                          />
                        </label>
                        <div className="control-row">
                          <button onClick={handleHashAndInscribe} disabled={isStamping}>
                            {isStamping ? 'Stamping\u2026' : 'Hash & Inscribe'}
                          </button>
                          <button className="secondary" onClick={handleMintToken} disabled={!lastReceipt || isMinting}>
                            {isMinting ? 'Minting\u2026' : 'Mint Token'}
                          </button>
                        </div>
                        <div className="control-row">
                          <button className="ghost" onClick={handleBatchStamp} disabled={enabledImages.length === 0 || isStamping}>
                            Stamp All ({enabledImages.length})
                          </button>
                        </div>
                        {lastReceipt && (
                          <div className="stamp-receipt">
                            <div className="small" title={lastReceipt.hash}>
                              Hash: {lastReceipt.hash.slice(0, 12)}...{lastReceipt.hash.slice(-8)}
                            </div>
                            {lastReceipt.txid && (
                              <div className="small" title={lastReceipt.txid}>
                                TxID: {lastReceipt.txid.slice(0, 12)}...{lastReceipt.txid.slice(-8)}
                              </div>
                            )}
                            {!lastReceipt.txid && (
                              <div className="small" style={{ color: 'var(--muted)' }}>Local only (no wallet key)</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="small">Pick an image to edit its settings.</div>
                )}
              </aside>
            )}
          </div>
        )}

        {/* ── Page strip (hidden in watch/mix modes) ── */}
        {mode !== 'watch' && mode !== 'mix' && (
          <PageStrip
            spreads={spreads}
            activeIndex={currentSpreadIndex}
            onPageClick={handlePageClick}
          />
        )}
      </div>

      {/* ── Modals / overlays ── */}
      {showLogoDesigner && (
        <LogoDesigner
          onClose={() => setShowLogoDesigner(false)}
          onSave={(logo) => {
            setLogos((prev) => [logo, ...prev]);
            if (selectedImage) {
              updateSelectedSettings({ logoId: logo.id });
            }
            setShowLogoDesigner(false);
          }}
        />
      )}

      {showCoversGallery && (
        <CoversGallery
          onClose={() => setShowCoversGallery(false)}
          onApplyTemplate={handleApplyTemplate}
        />
      )}

    </div>
  );
}
