import { supabase } from './supabaseClient';

const IS_DEV = import.meta.env.DEV;

// ─── Session Helper ───────────────────────────────────────────────────────────
function getSessionId() {
  const KEY = 'mate_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `s_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ─── Analytics Event Logger ──────────────────────────────────────────────────
// Logs lightweight funnel events to the analytics_events table.
// Events: 'view_catalog', 'view_product', 'add_to_cart', 'initiate_checkout',
//         'purchase', 'search', 'lead_captured'
//
// Safe to call anywhere — logs failures in dev, silent in production.

export const logAnalyticsEvent = async (eventName, metadata = {}) => {
  try {
    const { error } = await supabase.from('analytics_events').insert([{
      session_id: getSessionId(),
      event_name: eventName,
      metadata,
    }]);
    if (error && IS_DEV) {
      console.warn(`[Analytics] Event "${eventName}" INSERT failed:`, error.message);
    }
  } catch (err) {
    if (IS_DEV) console.warn(`[Analytics] Event "${eventName}" exception:`, err);
  }
};

// ─── Meta Pixel Helper ───────────────────────────────────────────────────────
// Wraps fbq calls so they are safe to call even if the pixel is not loaded.
// This prevents runtime errors when VITE_META_PIXEL_ID is not set (dev mode).

export const trackPixelEvent = (eventName, params = {}) => {
  try {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', eventName, params);
    }
  } catch (_) {
    // Silently ignore
  }
};

// ─── TikTok Pixel Helper ─────────────────────────────────────────────────────
// Wraps ttq calls so they are safe to call even if the pixel is not loaded.
// TikTok standard events: https://ads.tiktok.com/help/article/standard-events-parameters

export const trackTikTokEvent = (eventName, params = {}) => {
  try {
    if (typeof window !== 'undefined' && window.ttq) {
      // Sanitize value — TikTok requires a plain number (no strings, NaN, symbols)
      // Some events require value > 0, so fallback to 1
      const clean = { ...params };
      if ('value' in clean) clean.value = Number(clean.value) || 1;
      if (Array.isArray(clean.contents)) {
        clean.contents = clean.contents.map(c => ({
          ...c,
          price: Number(c.price) || 1,
          quantity: Number(c.quantity) || 1,
        }));
      }
      window.ttq.track(eventName, clean);
    }
  } catch (_) {
    // Silently ignore
  }
};
