import type { ImageItem, Spread } from './types';

export const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm', '.avi']);
export const AUDIO_EXT = new Set(['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a']);

export function isVideoFile(filePath: string): boolean {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  return VIDEO_EXT.has(ext);
}

export function isAudioFile(filePath: string): boolean {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  return AUDIO_EXT.has(ext);
}

/**
 * In web context, files are already blob URLs, so just return the path as-is.
 * In Electron, this would return mint-media://media?path=...
 */
export function mediaStreamUrl(filePath: string): string {
  return filePath;
}

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

export const loadVideoThumbnail = (
  streamUrl: string
): Promise<{ width: number; height: number; thumbnailUrl: string }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    document.body.appendChild(video);

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Video thumbnail extraction timed out'));
    }, 15000);

    const cleanup = () => {
      clearTimeout(timeout);
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    };

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          thumbnailUrl
        });
      } catch (err) {
        reject(err);
      } finally {
        cleanup();
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error(`Failed to load video: ${streamUrl}`));
    };

    video.src = streamUrl;
  });
};

/**
 * Build spread layout from an ordered list of images.
 * Pairs consecutive portrait images; landscape images get their own spread.
 */
export function buildSpreads(images: ImageItem[]): Spread[] {
  const spreads: Spread[] = [];
  let i = 0;
  while (i < images.length) {
    const img = images[i];
    const isLandscape = img.width > img.height;
    if (isLandscape) {
      spreads.push({ type: 'landscape', image: img });
      i++;
    } else {
      const next = images[i + 1];
      if (next && next.height >= next.width) {
        spreads.push({ type: 'portrait-pair', left: img, right: next });
        i += 2;
      } else {
        spreads.push({ type: 'portrait-solo', image: img });
        i++;
      }
    }
  }
  return spreads;
}

/** Extract the ImageItem(s) from a spread. */
export function spreadImages(spread: Spread): ImageItem[] {
  if (spread.type === 'portrait-pair') return [spread.left, spread.right];
  return [spread.image];
}
