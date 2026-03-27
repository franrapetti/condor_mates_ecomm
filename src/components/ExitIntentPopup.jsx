import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import './ExitIntentPopup.css';

const ExitIntentPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('mate_exit_popup_seen');
    
    if (hasSeenPopup) return;

    const handleMouseLeave = (e) => {
      // Trigger only when moving cursor out of the top of the window (exit intent)
      if (e.clientY <= 0 || e.clientX <= 0 || (e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        setIsVisible(true);
        localStorage.setItem('mate_exit_popup_seen', 'true');
        // Remove event listener after firing once
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };

    // Delay adding the listener so it doesn't fire immediately if they spawn with mouse out
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 3000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus('loading');
    
    try {
      const { error } = await supabase.from('leads').insert([{
        email: email.trim(),
        source: 'exit_intent'
      }]);
      
      // We might get an error if they previously submitted their email (uniqueness constraint)
      // but in UI we just pretend it succeeded so they get the discount anyway.
      
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('success'); // Fail silent, give them discount
    }
  };

  const closePopup = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="exit-overlay fade-in">
      <div className="exit-modal">
        <button className="exit-close-btn" onClick={closePopup}>×</button>
        
        {status === 'success' ? (
          <div className="exit-success text-center">
            <span className="exit-emoji-huge">🎉</span>
            <h2>¡Gracias por sumarte!</h2>
            <p className="exit-desc">Aplicá el siguiente código en el checkout de Mercado Pago o avisanos por WhatsApp:</p>
            <div className="discount-code-box">CONDOR10</div>
            <p className="exit-small">10% OFF en tu primer mate imperial.</p>
            <button className="exit-submit-btn mt-4" onClick={closePopup}>Seguir Viendo</button>
          </div>
        ) : (
          <div className="exit-form-container text-center">
            <span className="exit-emoji-huge">🧉</span>
            <h2>¡Esperá! ¿Te vas con las manos vacías?</h2>
            <p className="exit-desc">Dejanos tu email y llevate un <strong>10% OFF automático</strong> para tu primera compra de un Mate Imperial.</p>
            
            <form onSubmit={handleSubmit} className="exit-form">
              <input 
                type="email" 
                placeholder="Ingresá tu mejor correo..." 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="exit-input"
              />
              <button type="submit" disabled={status === 'loading'} className="exit-submit-btn">
                {status === 'loading' ? 'Procesando...' : 'Quiero mi 10% OFF 🚀'}
              </button>
            </form>
            <button className="exit-deny-btn" onClick={closePopup}>No gracias, prefiero pagar precio completo</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExitIntentPopup;
