import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export const useAnalytics = () => {
  const location = useLocation();
  const sessionRef = useRef(null);
  const startTimerRef = useRef(Date.now());
  const viewIdRef = useRef(null);

  // Initialize Anonymous Session
  useEffect(() => {
    let sessionId = sessionStorage.getItem('mate_analytics_session');
    if (!sessionId) {
      // Create a unique anonymous session ID valid for this browser tab
      sessionId = `sess_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
      sessionStorage.setItem('mate_analytics_session', sessionId);
    }
    sessionRef.current = sessionId;
  }, []);

  // Track Page Views and Time on Page
  useEffect(() => {
    if (!sessionRef.current) return;
    
    // When URL changes, reset the timer for the new page
    startTimerRef.current = Date.now();
    let isSubscribed = true;

    const logView = async () => {
      try {
        const { data, error } = await supabase.from('page_views').insert([{
          session_id: sessionRef.current,
          path: location.pathname,
          duration_seconds: 0
        }]).select('id').single();
        
        if (error) throw error;
        if (isSubscribed && data) {
          viewIdRef.current = data.id;
        }
      } catch (err) {
        // Silently fail if adblocker or connection issue prevents analytics
        console.warn('Analytics disabled or blocked.', err.message);
      }
    };

    logView();

    // Cleanup when the user navigates AWAY from this page
    return () => {
      isSubscribed = false;
      const duration = Math.floor((Date.now() - startTimerRef.current) / 1000);
      
      if (viewIdRef.current && duration > 0) {
        // Update the duration in Supabase before unmounting
        supabase.from('page_views')
          .update({ duration_seconds: duration })
          .eq('id', viewIdRef.current)
          .then(() => {})
          .catch(() => {});
      }
    };
  }, [location.pathname]);
};
