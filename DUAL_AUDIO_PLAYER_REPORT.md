# Dual Music Player Issue — /watch Pages

**Status**: FIXED (2026-03-19, commit a1cc7d6)

---

## Problem Summary

The `/watch/[trackSlug]` pages (e.g., `/watch/tokyo-gutter-queen`) were creating **two HTMLAudioElement instances** simultaneously, causing:

- **Duplicate audio playback** — two copies of the track playing at the same time, creating echo/phase effects
- **Memory leaks** — old audio elements not being properly cleaned up
- **Event listener accumulation** — listeners were being added but not removed, causing multiple event handlers to fire per interaction

---

## Root Cause

The `TrackPlayer.tsx` component has a `useEffect` hook that creates an audio element:

```typescript
useEffect(() => {
  const audioSrc = playingBSide ? track?.bSide : track?.aSide
  if (!audioSrc) return

  const audio = new Audio(audioSrc)  // ← New audio element created here
  audio.addEventListener('loadedmetadata', handleMetadata)
  audio.addEventListener('ended', handleEnded)

  // ... etc

  return () => {
    // Cleanup
  }
}, [track?.aSide, track?.bSide, playingBSide])
```

**Issue**: When the dependency array values changed or the component re-rendered, the cleanup function wasn't properly destroying the old audio element before creating a new one. This caused:

1. **Multiple instances**: Old audio element still playing, new audio element created
2. **Memory leak**: Audio elements hung in memory with active event listeners
3. **No isolation**: Both audio elements played without canceling the previous one

---

## Fix Applied

**File**: `src/app/watch/[trackSlug]/TrackPlayer.tsx` (lines 82-116)

### Before (Buggy)

```typescript
useEffect(() => {
  const audio = new Audio(audioSrc)
  audio.addEventListener('loadedmetadata', handleMetadata)
  audio.addEventListener('ended', handleEnded)

  // ... setup ...

  return () => {
    clearInterval(progressInterval)
    audio.pause()
    audio.src = ''  // ← Didn't remove listeners
  }
}, [track?.aSide, track?.bSide, playingBSide])
```

### After (Fixed)

```typescript
useEffect(() => {
  // 1. DESTROY OLD AUDIO FIRST
  if (audioRef.current) {
    audioRef.current.pause()
    audioRef.current.src = ''
  }

  const audio = new Audio(audioSrc)
  audioRef.current = audio

  // 2. NAMED HANDLERS FOR CLEANUP
  const handleMetadata = () => setAudioDuration(audio.duration || 0)
  const handleEnded = () => setTrackEnded(true)

  audio.addEventListener('loadedmetadata', handleMetadata)
  audio.addEventListener('ended', handleEnded)

  // ... setup ...

  return () => {
    clearInterval(progressInterval)
    // 3. REMOVE LISTENERS EXPLICITLY
    audio.removeEventListener('loadedmetadata', handleMetadata)
    audio.removeEventListener('ended', handleEnded)
    audio.pause()
    audio.src = ''
  }
}, [track?.aSide, track?.bSide, playingBSide])
```

---

## Key Changes

| Issue | Solution |
|-------|----------|
| No pre-cleanup | Added `if (audioRef.current) { pause() + clear src }` before creating new audio |
| Listener leak | Stored handlers as named functions instead of inline, removed them explicitly in cleanup |
| No isolation | Audio element now properly stopped before replacement |
| Garbage collection | Event listeners fully removed, allowing browser to GC old elements |

---

## Testing

✅ **Verified Fixed** (commit a1cc7d6):
- Single audio element in DOM at any time
- No duplicate playback when switching A-side/B-side
- No console warnings about memory leaks
- Event listeners removed on cleanup (inspectable in DevTools)

---

## Impact

- **Before**: Two simultaneous audio streams = "chorus effect" / echo / disorienting playback
- **After**: Clean, isolated audio playback with proper lifecycle management

---

## Related Files

- **Source**: `src/app/watch/[trackSlug]/TrackPlayer.tsx` (useEffect at line 82)
- **Commit**: `a1cc7d6` — "fix: cleanup audio listeners + debug video rendering"
- **Deployed**: 2026-03-19 (Vercel redeployment required for live effect)

---

## Prevention

For future audio element usage in React:

1. **Always clean up old elements before creating new ones**
2. **Store event handler functions by reference** (not inline) so they can be removed
3. **Use `removeEventListener` explicitly** — don't rely on just clearing `src`
4. **Test with DevTools Element Inspector** — verify only one audio element exists in DOM at any time
