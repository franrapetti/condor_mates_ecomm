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
    img.crossOrigin = 'Anonymous';
    img.src = originalHref;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      // Draw original
      ctx.drawImage(img, 0, 0);
      
      // Color tint overlay (bright green for admin)
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = '#16a34a'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Mask it back to original alpha
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(img, 0, 0);
      
      newFavicon.href = canvas.toDataURL('image/png');
    };

    return () => {
      if (newFavicon) document.head.removeChild(newFavicon);
      if (originalFavicon) originalFavicon.disabled = false;
    };
  }, []);
}
