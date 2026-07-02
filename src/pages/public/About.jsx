import React, { useEffect } from 'react';

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="page-section fade-in modern-layout" style={{ margin: '0 auto', marginTop: '2rem' }}>
      <div className="capsule-hero">
        <span className="badge-modern">Sobre nosotros</span>
        <h2 className="title-modern" style={{ fontWeight: 900 }}>Conocé a <br/><span className="text-gradient" style={{ fontWeight: 900 }}>Cóndor Mates</span></h2>
      </div>
      <div className="capsule-grid">
        <div className="capsule green-dark" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
          <img src="/img/francisco_portrait.jpg" alt="Francisco - Fundador" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }} onError={(e) => e.target.style.display='none'} />
          <div>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>Hola, soy Francisco 👋</h3>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
              Soy un apasionado del mate nacido en <strong>Río Segundo, Córdoba</strong>. En Cóndor Mates nacimos con una misión simple pero importante: llevar la mejor calidad y la verdadera mística de la cultura matera a cada rincón de Argentina. <br/><br/>
              Yo personalmente selecciono y superviso cada pieza, asegurando que a tu casa llegue un producto premium, duradero y hecho con dedicación.
            </p>
          </div>
        </div>
        <div className="capsule green-light">
          <span className="emoji-huge" style={{ justifyContent: 'center' }}>🇦🇷</span>
          <h3 style={{ textAlign: 'center' }}>Origen Cordobés</h3>
          <p style={{ textAlign: 'center' }}>De Río Segundo para todo el país con la mejor energía.</p>
        </div>
        <div className="capsule green-accent">
          <span className="emoji-huge" style={{ justifyContent: 'center' }}>🦅</span>
          <h3 style={{ textAlign: 'center' }}>El Cóndor</h3>
          <p style={{ textAlign: 'center' }}>Elegancia, altura y tradición en cada mate que armamos.</p>
        </div>
      </div>
    </div>
  );
};

export default About;
