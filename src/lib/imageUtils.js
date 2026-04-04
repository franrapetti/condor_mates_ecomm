/**
 * imageUtils.js
 *
 * Supabase Storage image optimization helper.
 *
 * Supabase Pro plans support on-the-fly image transformations via URL parameters
 * or via the `transform` option in `getPublicUrl()`.
 *
 * This helper appends the transform parameters to a raw Supabase storage URL.
 * It works on both Free and Pro plans — on Pro, Supabase CDN applies the resize;
 * on Free, the URL still works (params are ignored), so upgrading later requires
 * no code changes.
 *
 * Usage:
 *   import { getImgUrl } from '../lib/imageUtils';
 *   <img src={getImgUrl(product.image_url, { w: 600, q: 75 })} />
 */

const SUPABASE_STORAGE_PATTERN = /\/storage\/v1\/object\/public\//;

/**
 * Returns an optimized Supabase image URL.
 *
 * @param {string} rawUrl  - The original Supabase public URL.
 * @param {object} opts
 * @param {number} [opts.w]  - Width in pixels (height auto-scales to maintain aspect ratio).
 * @param {number} [opts.q]  - Quality 20-100 (default 80). Lower = smaller file.
 * @param {'cover'|'contain'|'fill'} [opts.resize] - Resize mode (default 'cover').
 * @returns {string} - Optimized URL.
 */
export function getImgUrl(rawUrl, { w = 800, h = null, q = 70, resize = 'contain' } = {}) {
  if (!rawUrl) return '';

  // Only transform Supabase storage URLs
  if (!SUPABASE_STORAGE_PATTERN.test(rawUrl)) return rawUrl;

  try {
    // 1. Rewrite to the transformation endpoint
    const transformedUrl = rawUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    
    const url = new URL(transformedUrl);
    
    // 2. Cap width/height to avoid engine timeouts
    const safeWidth = Math.min(w, 1600);
    url.searchParams.set('width', String(safeWidth));
    
    if (h) {
      url.searchParams.set('height', String(h));
    }
    
    url.searchParams.set('quality', String(q));
    
    // 3. Always set resize mode explicitly to avoid CDN defaults
    url.searchParams.set('resize', resize);
    
    // 4. Force WebP for smaller payloads
    url.searchParams.set('format', 'webp');
    
    return url.toString();
  } catch (err) {
    console.error('Error transforming image URL:', err);
    return rawUrl;
  }
}

/**
 * Returns a srcSet string for responsive images.
 * Example: getImgSrcSet(url) → "url?w=400 400w, url?w=800 800w, url?w=1200 1200w"
 *
 * @param {string} rawUrl
 * @param {number[]} widths - Array of widths to generate.
 * @param {number} [quality]
 * @returns {string}
 */
export function getImgSrcSet(rawUrl, widths = [400, 800, 1200], quality = 80) {
  return widths.map(w => `${getImgUrl(rawUrl, { w, q: quality })} ${w}w`).join(', ');
}
