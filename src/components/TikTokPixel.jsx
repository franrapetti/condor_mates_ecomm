import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const pixelId = import.meta.env.VITE_TIKTOK_PIXEL_ID;

// Initialize the pixel script instantly on module load (avoids race conditions with useEffect)
if (pixelId && typeof window !== 'undefined' && !window.__TTQ_SCRIPT_LOADED) {
  /* eslint-disable */
  !function (w, d, t) {
    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
    var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
    ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

    ttq.load(pixelId);
  }(window, document, 'ttq');
  /* eslint-enable */
  window.__TTQ_SCRIPT_LOADED = true;
}

const TikTokPixel = () => {
  const location = useLocation();

  useEffect(() => {
    if (!pixelId || typeof window === 'undefined' || !window.ttq) return;

    if (!window.__TTQ_FIRST_PAGE_VIEW) {
      window.__TTQ_FIRST_PAGE_VIEW = true;
      window.__TTQ_LAST_PATH = location.pathname;
      window.ttq.page();
    } else {
      // Dispara 'page' solo si la ruta realmente cambió
      if (window.__TTQ_LAST_PATH !== location.pathname) {
        window.__TTQ_LAST_PATH = location.pathname;
        window.ttq.page();
      }
    }
  }, [location.pathname]);

  return null;
};

export default TikTokPixel;
