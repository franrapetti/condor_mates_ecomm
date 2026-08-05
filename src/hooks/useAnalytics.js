import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// ─── Constants ───────────────────────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV;

/** Session expires after 30 minutes of inactivity */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Minimum interval between tracking the same path (prevents StrictMode/re-render dupes) */
const DEDUP_WINDOW_MS = 2000;

// ─── Bot Detection ───────────────────────────────────────────────────────────

const BOT_PATTERNS = [
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'sogou', 'facebot', 'facebookexternalhit', 'ia_archiver',
  'semrushbot', 'ahrefsbot', 'dotbot', 'rogerbot', 'twitterbot',
  'linkedinbot', 'embedly', 'quora link preview', 'showyoubot',
  'outbrain', 'pinterest', 'applebot', 'mj12bot', 'seznambot',
  'petalbot', 'bytespider', 'gptbot', 'claudebot', 'anthropic',
  'headlesschrome', 'phantomjs', 'prerender', 'lighthouse',
  'chrome-lighthouse', 'pagespeed', 'gtmetrix', 'webpagetest',
];

let _isBot = null;

function isBot() {
  if (_isBot !== null) return _isBot;
  if (typeof navigator === 'undefined') { _isBot = true; return true; }
  // navigator.webdriver is true for automated browsers (Puppeteer, Selenium, etc.)
  if (navigator.webdriver) { _isBot = true; return true; }
  const ua = (navigator.userAgent || '').toLowerCase();
  if (!ua || ua.length < 10) { _isBot = true; return true; }
  _isBot = BOT_PATTERNS.some(p => ua.includes(p));
  return _isBot;
}

// ─── Session Management ──────────────────────────────────────────────────────
// Uses sessionStorage (dies on tab close) + 30-minute inactivity rotation.
// This replaces the old localStorage-based session that never expired.

const SESSION_KEY = 'mate_session_id';
const SESSION_TS_KEY = 'mate_session_ts';

/**
 * Get or create a session ID.
 * - Stored in sessionStorage (cleared when tab closes = new session)
 * - Auto-rotates after 30 minutes of inactivity
 * - Exported so analytics.js can reuse it (eliminates duplication)
 */
export function getOrCreateSession() {
  const now = Date.now();
  let id = sessionStorage.getItem(SESSION_KEY);
  const lastTs = parseInt(sessionStorage.getItem(SESSION_TS_KEY) || '0', 10);

  // Rotate if expired or missing
  if (!id || (now - lastTs) > SESSION_TIMEOUT_MS) {
    id = `s_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }

  // Always update the timestamp to track last activity
  sessionStorage.setItem(SESSION_TS_KEY, String(now));
  return id;
}

// ─── Traffic Source Resolution ───────────────────────────────────────────────

/**
 * Resolve the traffic source.
 * Priority: fresh UTM/ref param in URL  →  stored value  →  'direct'
 * Supports: utm_source, ref, fbclid (→ facebook), ttclid (→ tiktok), wa_source (→ whatsapp)
 */
export function resolveSource(search) {
  const SOURCE_KEY = 'mate_traffic_source';
  const params = new URLSearchParams(search);

  let fresh = params.get('utm_source') || params.get('ref') || null;
  if (!fresh && params.get('fbclid'))    fresh = 'facebook';
  if (!fresh && params.get('ttclid'))    fresh = 'tiktok';
  if (!fresh && params.get('wa_source')) fresh = 'whatsapp';
  if (!fresh && params.get('gclid'))     fresh = 'google_ads';

  // Fallback: detect organic traffic from document.referrer
  if (!fresh && typeof document !== 'undefined' && document.referrer) {
    try {
      const ref = new URL(document.referrer).hostname.toLowerCase();
      if (ref.includes('google.'))                                   fresh = 'google_organic';
      else if (ref.includes('instagram.com') || ref.includes('l.instagram.com')) fresh = 'instagram_organic';
      else if (ref.includes('facebook.com') || ref.includes('l.facebook.com'))   fresh = 'facebook_organic';
      else if (ref.includes('t.co') || ref.includes('twitter.com') || ref.includes('x.com')) fresh = 'twitter_organic';
      else if (ref.includes('tiktok.com'))                           fresh = 'tiktok_organic';
      else if (ref.includes('pinterest.'))                           fresh = 'pinterest_organic';
      else if (ref.includes('bing.com'))                             fresh = 'bing_organic';
      else if (ref.includes('mercadolibre.com'))                     fresh = 'mercadolibre';
    } catch (_) { /* invalid URL — ignore */ }
  }

  if (fresh) {
    localStorage.setItem(SOURCE_KEY, fresh.toLowerCase());
    return fresh.toLowerCase();
  }
  return localStorage.getItem(SOURCE_KEY) || 'direct';
}

// ─── Global Dedup Tracker (Singleton) ────────────────────────────────────────
// Lives outside React lifecycle so StrictMode double-mounts don't cause dupes.

const _trackedPaths = new Map(); // path → timestamp of last track

function shouldTrack(path) {
  const now = Date.now();
  const lastTracked = _trackedPaths.get(path);
  if (lastTracked && (now - lastTracked) < DEDUP_WINDOW_MS) {
    if (IS_DEV) console.log(`[Analytics] Dedup: skipping "${path}" (tracked ${now - lastTracked}ms ago)`);
    return false;
  }
  _trackedPaths.set(path, now);

  // Cleanup old entries (keep map small)
  if (_trackedPaths.size > 50) {
    for (const [key, ts] of _trackedPaths) {
      if (now - ts > 60000) _trackedPaths.delete(key);
    }
  }

  return true;
}

// ─── View ID Promise Bridge ──────────────────────────────────────────────────
// Solves the race condition: logProductPageView can `await` the view ID
// instead of reading a stale value from localStorage.

let _viewIdResolve = null;
let _viewIdPromise = null;

/** Resets the promise for each new page navigation */
function resetViewIdBridge() {
  _viewIdPromise = new Promise((resolve) => {
    _viewIdResolve = resolve;
  });
}

/**
 * Returns a promise that resolves with the current page_view row ID
 * once the INSERT from useAnalytics completes.
 * Times out after 5 seconds to prevent infinite hangs.
 */
export function getViewIdPromise() {
  if (!_viewIdPromise) {
    // Edge case: called before useAnalytics mounted
    return Promise.resolve(null);
  }
  // Race against a 5-second timeout so we never hang indefinitely
  return Promise.race([
    _viewIdPromise,
    new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
  ]);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useAnalytics = () => {
  const location  = useLocation();
  const viewIdRef = useRef(null);
  const startRef  = useRef(Date.now());

  useEffect(() => {
    // ── Guard: don't track bots ──
    if (isBot()) {
      if (IS_DEV) console.log('[Analytics] Bot detected — skipping tracking');
      return;
    }

    // ── Guard: don't track admin pages ──
    if (location.pathname.startsWith('/admin')) {
      return;
    }

    // ── Guard: dedup (StrictMode double-mount / rapid re-renders) ──
    if (!shouldTrack(location.pathname)) {
      return;
    }

    const sessionId = getOrCreateSession();
    const source    = resolveSource(location.search);

    startRef.current  = Date.now();
    viewIdRef.current = null;

    // Reset the bridge promise so logProductPageView waits for THIS page's ID
    resetViewIdBridge();

    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('page_views')
          .insert([{
            session_id:       sessionId,
            path:             location.pathname,
            source,
            duration_seconds: 0,
          }])
          .select('id')
          .single();

        if (error) {
          if (IS_DEV) console.warn('[Analytics] page_view INSERT failed:', error.message);
          _viewIdResolve?.(null);
          return;
        }

        if (alive && data) {
          viewIdRef.current = data.id;
          // ✅ Resolve the promise so logProductPageView can proceed
          _viewIdResolve?.(data.id);
        } else {
          _viewIdResolve?.(null);
        }
      } catch (err) {
        if (IS_DEV) console.warn('[Analytics] page_view INSERT exception:', err);
        _viewIdResolve?.(null);
      }
    })();

    return () => {
      alive = false;
      const duration = Math.floor((Date.now() - startRef.current) / 1000);
      if (viewIdRef.current && duration > 0) {
        // ✅ Use fetch with keepalive for reliable delivery on page unload/navigation
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
          const url = `${supabaseUrl}/rest/v1/page_views?id=eq.${viewIdRef.current}`;
          fetch(url, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ duration_seconds: duration }),
            keepalive: true, // ✅ Survives page unload
          }).catch(() => {});
        } else {
          // Fallback for environments without env vars
          supabase
            .from('page_views')
            .update({ duration_seconds: duration })
            .eq('id', viewIdRef.current)
            .then(() => {})
            .catch(() => {});
        }
      }
    };
    // ✅ Only depend on pathname — search params changes don't warrant a new page view
  }, [location.pathname]);
};

// ─── Product Page View Logger ────────────────────────────────────────────────

/**
 * Call this once a product page loads.
 * Links the current page_view row to the product (for per-product analytics)
 * and atomically increments visit_count on the product.
 *
 * ✅ Awaits the view ID from the useAnalytics INSERT (race condition fix).
 * ✅ Skips for bots.
 */
export const logProductPageView = async (productId) => {
  if (!productId || isBot()) return;

  // URL params are always strings — cast to integer to match products.id BIGINT type
  const numericId = Number(productId);
  if (!Number.isFinite(numericId)) return; // guard against UUID-type products

  // 1. AWAIT the view ID from the current page's INSERT (race condition fix)
  const viewId = await getViewIdPromise();

  if (viewId) {
    try {
      const { error } = await supabase
        .from('page_views')
        .update({ product_id: numericId })
        .eq('id', viewId);

      if (error && IS_DEV) {
        console.warn('[Analytics] page_view UPDATE product_id failed:', error.message);
      }
    } catch (err) {
      if (IS_DEV) console.warn('[Analytics] page_view UPDATE exception:', err);
    }
  } else if (IS_DEV) {
    console.warn('[Analytics] No view ID available — product_id not linked for product', numericId);
  }

  // 2. Increment product visit counter
  try {
    const { error } = await supabase.rpc('increment_visit_count', { p_product_id: numericId });
    if (error && IS_DEV) {
      console.warn('[Analytics] increment_visit_count RPC failed:', error.message);
    }
  } catch (err) {
    if (IS_DEV) console.warn('[Analytics] increment_visit_count RPC exception:', err);
  }
};
