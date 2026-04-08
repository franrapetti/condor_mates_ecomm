import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (!fresh && params.get('fbclid'))  fresh = 'facebook';
  if (!fresh && params.get('ttclid'))  fresh = 'tiktok';
  if (!fresh && params.get('wa_source')) fresh = 'whatsapp';

  if (fresh) {
    localStorage.setItem(SOURCE_KEY, fresh.toLowerCase());
    return fresh.toLowerCase();
  }
  return localStorage.getItem(SOURCE_KEY) || 'direct';
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

        if (!error && alive && data) {
          viewIdRef.current = data.id;
          // Store last view ID so logProductPageView can attach the product_id later
          localStorage.setItem('mate_last_view_id', data.id);
        }
      } catch (_) {
        // Silently ignore — ad blockers, offline, etc.
      }
    })();

    return () => {
      alive = false;
      const duration = Math.floor((Date.now() - startRef.current) / 1000);
      if (viewIdRef.current && duration > 0) {
        supabase
          .from('page_views')
          .update({ duration_seconds: duration })
          .eq('id', viewIdRef.current)
          .then(() => {})
          .catch(() => {});
      }
    };
  }, [location.pathname, location.search]);
};

// ─── Product Page View Logger ────────────────────────────────────────────────

/**
 * Call this once a product page loads.
 * Links the current page_view row to the product (for per-product analytics)
 * and atomically increments visit_count on the product.
 */
export const logProductPageView = async (productId) => {
  if (!productId) return;

  // 1. Attach product_id to the page_views row created by useAnalytics
  const viewId = localStorage.getItem('mate_last_view_id');
  if (viewId) {
    supabase
      .from('page_views')
      .update({ product_id: productId })
      .eq('id', viewId)
      .then(() => {})
      .catch(() => {});
  }

  // 2. Increment product visit counter
  try {
    await supabase.rpc('increment_visit_count', { p_product_id: productId });
  } catch (_) {
    // RPC may not exist yet — silently ignore
  }
};
