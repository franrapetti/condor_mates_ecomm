import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const MetaPixel = () => {
  const location = useLocation();
  const pixelId = import.meta.env.VITE_META_PIXEL_ID;
  const isInitialized = useRef(false);

  useEffect(() => {
    // Solo se activa si la variable de entorno está presente (Producción)
    if (!pixelId) return;

    if (!isInitialized.current) {
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
      isInitialized.current = true;
    }
    
    // Dispara 'PageView' cada vez que el usuario cambia de página en React
    window.fbq('track', 'PageView');
  }, [location.pathname, pixelId]);

  return null;
};

export default MetaPixel;
