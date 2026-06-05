import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV;

/** Persistent anonymous session ID — survives tab close (unlike sessionStorage) */
function getOrCreateSession() {
  const KEY = 'mate_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `s_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

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
          // Also keep localStorage as a fallback for edge cases
          localStorage.setItem('mate_last_view_id', data.id);
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
        // ✅ Use sendBeacon for reliable delivery on page unload/navigation
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey && navigator.sendBeacon) {
          const url = `${supabaseUrl}/rest/v1/page_views?id=eq.${viewIdRef.current}`;
          const blob = new Blob(
            [JSON.stringify({ duration_seconds: duration })],
            { type: 'application/json' }
          );
          // sendBeacon does not support custom headers natively,
          // so we fall back to fetch with keepalive as the primary method
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
          // Fallback for environments without sendBeacon
          supabase
            .from('page_views')
            .update({ duration_seconds: duration })
            .eq('id', viewIdRef.current)
            .then(() => {})
            .catch(() => {});
        }
      }
    };
  }, [location.pathname, location.search]);
};

// ─── Product Page View Logger ────────────────────────────────────────────────

/**
 * Call this once a product page loads.
 * Links the current page_view row to the product (for per-product analytics)
 * and atomically increments visit_count on the product.
 *
 * ✅ FIX: Now awaits the view ID from the useAnalytics INSERT instead of
 *    reading a potentially stale value from localStorage (race condition fix).
 */
export const logProductPageView = async (productId) => {
  if (!productId) return;

  // URL params are always strings — cast to integer to match products.id BIGINT type
  const numericId = Number(productId);
  if (!Number.isFinite(numericId)) return; // guard against UUID-type products

  // 1. ✅ AWAIT the view ID from the current page's INSERT (race condition fix)
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
