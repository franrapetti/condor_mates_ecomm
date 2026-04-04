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

  // Only transform URLs that contain the Supabase public storage endpoint
  if (!rawUrl.includes('/storage/v1/object/public/')) {
    return rawUrl;
  }

  // 1. Rewrite endpoint to activate Supabase Image Transformations engine
  let transformedUrl = rawUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  
  // 2. Build parameters manually to avoid 'new URL()' failure on relative paths
  const params = [];
  
  // 3. Cap width (Max 2000 per Supabase, 1600 is safer)
  const safeWidth = Math.min(w, 1600);
  params.push(`width=${safeWidth}`);
  
  if (h) {
    params.push(`height=${h}`);
  }
  
  params.push(`quality=${q}`);
  params.push(`resize=${resize}`);
  params.push('format=webp'); // Force WebP for all images
  
  // Join params and append with ? (or & if there are already params)
  const separator = transformedUrl.includes('?') ? '&' : '?';
  return `${transformedUrl}${separator}${params.join('&')}`;
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
