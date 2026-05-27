import { supabase } from './supabaseClient';

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
// Safe to call anywhere — silently ignores failures (ad blockers, offline, etc.)

export const logAnalyticsEvent = async (eventName, metadata = {}) => {
  try {
    await supabase.from('analytics_events').insert([{
      session_id: getSessionId(),
      event_name: eventName,
      metadata,
    }]);
  } catch (_) {
    // Silently ignore — ad blockers, offline, table not created yet, etc.
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
      window.ttq.track(eventName, params);
    }
  } catch (_) {
    // Silently ignore
  }
};
