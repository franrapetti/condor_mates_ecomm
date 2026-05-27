import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const TikTokPixel = () => {
  const location = useLocation();
  const pixelId = import.meta.env.VITE_TIKTOK_PIXEL_ID;
  const isInitialized = useRef(false);

  useEffect(() => {
    // Solo se activa si la variable de entorno está presente (Producción)
    if (!pixelId) return;

    if (!isInitialized.current) {
      /* eslint-disable */
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
        var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
        ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

        ttq.load(pixelId);
        ttq.page();
      }(window, document, 'ttq');
      /* eslint-enable */

      isInitialized.current = true;
    } else {
      // Dispara 'page' cada vez que el usuario cambia de ruta en React
      if (window.ttq) {
        window.ttq.page();
      }
    }
  }, [location.pathname, pixelId]);

  return null;
};

export default TikTokPixel;
