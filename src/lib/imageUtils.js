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
 * Returns an optimized Cloudinary fetch URL, or fallback to original URL.
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

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  if (cloudName && rawUrl.startsWith('http')) {
    const transforms = [];
    const safeWidth = Math.min(w, 1600);
    transforms.push(`w_${safeWidth}`);
    
    if (h) {
      transforms.push(`h_${h}`);
    }
    
    transforms.push(`q_${q}`);
    transforms.push('f_auto'); // Automatically serves WebP/AVIF
    
    // Map resize modes to Cloudinary crop modes
    let cropMode = 'c_fit'; 
    if (resize === 'cover') cropMode = 'c_fill';
    else if (resize === 'contain') cropMode = 'c_pad';
    else if (resize === 'fill') cropMode = 'c_scale';
    transforms.push(cropMode);

    // Using encodeURIComponent ensures query params in the original URL are preserved
    return `https://res.cloudinary.com/${cloudName}/image/fetch/${transforms.join(',')}/${encodeURIComponent(rawUrl)}`;
  }

  // Fallback to original raw URL (no Supabase transformation charges)
  return rawUrl;
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
