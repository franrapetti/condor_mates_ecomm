import { useEffect } from 'react';

export function useAdminFavicon() {
  useEffect(() => {
    let originalFavicon = document.querySelector("link[rel~='icon']");
    let originalHref = '/favicon.png';
    
    if (originalFavicon) {
      originalHref = originalFavicon.href;
      originalFavicon.disabled = true; // Disable original
    }

    let newFavicon = document.getElementById('admin-favicon');
    if (!newFavicon) {
      newFavicon = document.createElement('link');
      newFavicon.id = 'admin-favicon';
      newFavicon.rel = 'icon';
      document.head.appendChild(newFavicon);
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      // 1. Invert the image first (Black background -> White, White Condor -> Black)
      ctx.filter = 'invert(1)';
      ctx.drawImage(img, 0, 0);
      
      // 2. Multiply with green. 
      // White background * Green = Green. 
      // Black condor * Green = Black.
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#16a34a'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Restore composite for safety
      ctx.globalCompositeOperation = 'source-over';
      
      newFavicon.href = canvas.toDataURL('image/png');
    };
    
    img.crossOrigin = 'Anonymous';
    img.src = originalHref;

    return () => {
      if (newFavicon) document.head.removeChild(newFavicon);
      if (originalFavicon) originalFavicon.disabled = false;
    };
  }, []);
}
