import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const pixelId = import.meta.env.VITE_META_PIXEL_ID;

// Initialize instantly on module load
if (pixelId && typeof window !== 'undefined' && !window.__FBQ_SCRIPT_LOADED) {
  /* eslint-disable */
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  
  window.fbq('init', pixelId);
  window.__FBQ_SCRIPT_LOADED = true;
}

const MetaPixel = () => {
  const location = useLocation();

  useEffect(() => {
    if (!pixelId || typeof window === 'undefined' || !window.fbq) return;

    if (!window.__FBQ_FIRST_PAGE_VIEW) {
      window.__FBQ_FIRST_PAGE_VIEW = true;
      window.__FBQ_LAST_PATH = location.pathname;
      window.fbq('track', 'PageView');
    } else {
      // Dispara 'PageView' solo si la ruta realmente cambió
      if (window.__FBQ_LAST_PATH !== location.pathname) {
        window.__FBQ_LAST_PATH = location.pathname;
        window.fbq('track', 'PageView');
      }
    }
  }, [location.pathname]);

  return null;
};

export default MetaPixel;
