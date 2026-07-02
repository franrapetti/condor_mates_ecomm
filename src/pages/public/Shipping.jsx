import React, { useEffect } from 'react';

const Shipping = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="page-section fade-in modern-layout" style={{ margin: '0 auto', marginTop: '2rem' }}>
      <div className="capsule-hero">
        <span className="badge-modern">Logística</span>
        <h2 className="title-modern" style={{ fontWeight: 900 }}><strong>Tus mates,</strong><br/><span className="text-gradient" style={{ fontWeight: 900 }}>a tu puerta</span></h2>
      </div>
      <div className="capsule-grid-2">
        <div className="capsule green-dark full-width">
          <h3>Envíos a Todo el País 🇦🇷</h3>
          <p>Tu pedido será preparado y despachado con máxima prioridad dentro de las 24 horas hábiles luego de confirmado tu pago. ¡Llegamos a donde estés!</p>
        </div>
        <div className="capsule border-style">
          <span className="emoji-huge">📦</span>
          <h3>Packaging Gratis</h3>
          <p>¡Todos nuestros productos incluyen packaging de regalo premium sin cargo extra! Llegar a casa o abrirlo enfrente de un amigo es toda una experiencia.</p>
        </div>
        <div className="capsule border-style">
          <span className="emoji-huge">⚡</span>
          <h3>Seguimiento Rápido</h3>
          <p>Te enviamos el código de rastreo por WhatsApp al instante de despachar el paquete.</p>
        </div>
      </div>
    </div>
  );
};

export default Shipping;
