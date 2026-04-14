'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { ImageItem, WatchPlayback } from '@/lib/mint/types';
import { mediaStreamUrl } from '@/lib/mint/image-utils';

type Props = {
  videos: ImageItem[];
  currentVideo: ImageItem | null;
  onSelectVideo: (item: ImageItem) => void;
};

export default function VideoPlayer({ videos, currentVideo, onSelectVideo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playback, setPlayback] = useState<WatchPlayback>({
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    loop: false,
    playbackRate: 1,
  });
  const [showControls, setShowControls] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const videoItems = videos.filter((v) => v.mediaType === 'video');
  const currentIndex = currentVideo ? videoItems.findIndex((v) => v.id === currentVideo.id) : -1;

  // Auto-select first video if none selected
  useEffect(() => {
    if (!currentVideo && videoItems.length > 0) {
      onSelectVideo(videoItems[0]);
    }
  }, [currentVideo, videoItems, onSelectVideo]);

  // Auto-hide controls after 3s of no mouse movement
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  // Sync video element events
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onTime = () => setPlayback((p) => ({ ...p, currentTime: el.currentTime, duration: el.duration || 0 }));
    const onPlay = () => setPlayback((p) => ({ ...p, playing: true }));
    const onPause = () => setPlayback((p) => ({ ...p, playing: false }));
    const onEnded = () => {
      if (!playback.loop && currentIndex < videoItems.length - 1) {
        onSelectVideo(videoItems[currentIndex + 1]);
      }
    };

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
    };
  }, [currentIndex, videoItems, playback.loop, onSelectVideo]);

  // Auto-play when video changes
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !currentVideo) return;
    el.src = mediaStreamUrl(currentVideo.path);
    el.load();
    el.play().catch(() => {});
    resetHideTimer();
  }, [currentVideo, resetHideTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
      if (e.key === 'f') toggleFullscreen();
      if (e.key === 'p') setShowPlaylist((s) => !s);
      if (e.key === 'ArrowRight') { const el = videoRef.current; if (el) el.currentTime += 5; }
      if (e.key === 'ArrowLeft') { const el = videoRef.current; if (el) el.currentTime -= 5; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setVolume(Math.min(1, playback.volume + 0.1)); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setVolume(Math.max(0, playback.volume - 0.1)); }
      if (e.key === 'n' || e.key === 'N') skip(1);
      if (e.key === 'b' || e.key === 'B') skip(-1);
      if (e.key === 'l' || e.key === 'L') toggleLoop();
      if (e.key === 'm') toggleMute();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    el.paused ? el.play() : el.pause();
  };

  const seek = (e: React.MouseEvent) => {
    const el = videoRef.current;
    const bar = progressRef.current;
    if (!el || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = pct * (el.duration || 0);
  };

  const setVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    if (videoRef.current) videoRef.current.volume = clamped;
    setPlayback((p) => ({ ...p, volume: clamped }));
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setPlayback((p) => ({ ...p, muted: el.muted }));
  };

  const toggleLoop = () => {
    const el = videoRef.current;
    if (!el) return;
    el.loop = !el.loop;
    setPlayback((p) => ({ ...p, loop: el.loop }));
  };

  const setRate = (r: number) => {
    if (videoRef.current) videoRef.current.playbackRate = r;
    setPlayback((p) => ({ ...p, playbackRate: r }));
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  // Listen for fullscreen change
  useEffect(() => {
    const onFsChange = () => {
      const isFs = !!document.fullscreenElement;
      if (isFs) setShowPlaylist(false);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const skip = (dir: -1 | 1) => {
    const next = currentIndex + dir;
    if (next >= 0 && next < videoItems.length) {
      onSelectVideo(videoItems[next]);
    }
  };

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = playback.duration ? (playback.currentTime / playback.duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="watch-cinema"
      onMouseMove={resetHideTimer}
    >
      {/* Full-screen video */}
      <div className="watch-screen" onClick={togglePlay} onDoubleClick={toggleFullscreen}>
        {currentVideo ? (
          <video ref={videoRef} className="watch-video" />
        ) : (
          <div className="watch-empty">
            <div className="watch-empty-icon">{'\u25B6'}</div>
            <div>Load a folder to start watching</div>
            <div className="watch-empty-hint">
              Use Load Folder above, or drag video files into the app
            </div>
            <div className="watch-empty-keys">
              Space: play/pause &bull; F: fullscreen &bull; P: playlist &bull; N/B: next/prev
            </div>
          </div>
        )}
      </div>

      {/* Controls overlay — auto-hides */}
      {currentVideo && (
        <div className={`watch-controls ${showControls ? 'visible' : 'hidden'}`}>
          {/* Now playing */}
          <div className="watch-now-playing">
            <span className="watch-now-playing-name">{currentVideo.name}</span>
            {videoItems.length > 1 && (
              <span className="watch-now-playing-pos">
                {currentIndex + 1} / {videoItems.length}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="watch-progress" ref={progressRef} onClick={seek}>
            <div className="watch-progress-fill" style={{ width: `${pct}%` }} />
            <div className="watch-progress-thumb" style={{ left: `${pct}%` }} />
          </div>

          <div className="watch-bar">
            <div className="watch-bar-left">
              <button onClick={(e) => { e.stopPropagation(); skip(-1); }} disabled={currentIndex <= 0}>
                {'\u23EE'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="watch-play-btn">
                {playback.playing ? '\u23F8' : '\u25B6'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); skip(1); }} disabled={currentIndex >= videoItems.length - 1}>
                {'\u23ED'}
              </button>
              <span className="watch-time">
                {fmt(playback.currentTime)} / {fmt(playback.duration)}
              </span>
            </div>

            <div className="watch-bar-right">
              <button
                onClick={(e) => { e.stopPropagation(); toggleLoop(); }}
                className={playback.loop ? 'active' : ''}
                title="Loop (L)"
              >
                {'\u21BA'}
              </button>
              <select
                value={playback.playbackRate}
                onChange={(e) => { e.stopPropagation(); setRate(Number(e.target.value)); }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
              <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} title="Mute (M)">
                {playback.muted || playback.volume === 0 ? '\uD83D\uDD07' : playback.volume < 0.5 ? '\uD83D\uDD09' : '\uD83D\uDD0A'}
              </button>
              <input
                type="range" min={0} max={1} step={0.05}
                value={playback.muted ? 0 : playback.volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="watch-volume"
              />
              <button
                onClick={(e) => { e.stopPropagation(); setShowPlaylist((s) => !s); }}
                className={showPlaylist ? 'active' : ''}
                title="Playlist (P)"
              >
                {'\u2630'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} title="Fullscreen (F)">
                {document.fullscreenElement ? '\u2716' : '\u26F6'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playlist sidebar — collapsible */}
      {showPlaylist && videoItems.length > 0 && (
        <div className="watch-playlist">
          <div className="watch-playlist-header">
            <span>Playlist</span>
            <span className="watch-playlist-count">{videoItems.length} videos</span>
          </div>
          <div className="watch-playlist-list">
            {videoItems.map((v, i) => (
              <button
                key={v.id}
                className={`watch-playlist-item ${currentVideo?.id === v.id ? 'active' : ''}`}
                onClick={() => onSelectVideo(v)}
                title={v.name}
              >
                <span className="watch-playlist-num">{i + 1}</span>
                <span className="watch-playlist-name">{v.name}</span>
                {v.duration ? (
                  <span className="watch-playlist-dur">{fmt(v.duration)}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
