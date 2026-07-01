import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, RefreshCw, Clock, ArrowLeft, Info } from 'lucide-react';
import './Returns.css';

const Returns = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="returns-page">
      <div className="returns-hero">
        <div className="returns-hero-content">
          <Link to="/" className="returns-back-btn">
            <ArrowLeft size={18} />
            Volver al inicio
          </Link>
          <h1 className="returns-title">Devoluciones y Cambios</h1>
          <p className="returns-subtitle">Tu tranquilidad es nuestra prioridad. Conocé nuestra política de garantía.</p>
        </div>
      </div>

      <div className="returns-container">
        <div className="returns-grid">
          
          <div className="returns-main-card">
            <div className="returns-card-header">
              <ShieldCheck className="returns-icon" size={32} />
              <h2>Garantía de 30 Días</h2>
            </div>
            <div className="returns-card-body">
              <p>
                Todos nuestros productos cuentan con una <strong>garantía de 30 días corridos</strong> desde el momento de la compra. Si recibís un producto con fallas de fabricación, estamos acá para solucionarlo.
              </p>
              
              <div className="returns-alert returns-alert-info">
                <Info size={20} />
                <p>La garantía cubre exclusivamente defectos de fabricación y problemas de material que afecten el uso del producto.</p>
              </div>

              <h3>¿Qué casos están cubiertos?</h3>
              <ul className="returns-list">
                <li><strong>Mates pinchados o que filtren agua</strong> por problemas de sellado o porosidad extrema natural.</li>
                <li><strong>Roturas estructurales</strong> en virolas o bases que no hayan sido causadas por golpes o caídas.</li>
                <li><strong>Defectos groseros</strong> en el material (cuero despegado de fábrica, imperfecciones graves en el acero).</li>
              </ul>

              <h3>¿Qué casos NO están cubiertos?</h3>
              <ul className="returns-list">
                <li>Daños ocasionados por golpes, caídas o mal uso.</li>
                <li>Desgaste natural del uso diario (rayones, manchas por el uso de la yerba).</li>
                <li>Mates de calabaza que se hayan llenado de hongos por falta de secado adecuado o mal curado.</li>
                <li>Mates rajados por curado con agua hirviendo o exposición al calor directo extremo.</li>
              </ul>
            </div>
          </div>

          <div className="returns-sidebar">
            <div className="returns-side-card">
              <RefreshCw className="returns-side-icon" size={24} />
              <h3>Cómo gestionar un cambio</h3>
              <p>Si tu producto cumple con las condiciones de la garantía, el proceso es muy simple:</p>
              <ol className="returns-steps">
                <li>Escribinos por WhatsApp al <a href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '543572595756'}`} target="_blank" rel="noopener noreferrer"><strong>número oficial</strong></a>.</li>
                <li>Enviá una foto o video claro mostrando el defecto (ej: por dónde pierde agua).</li>
                <li>Incluí tu número de orden o nombre con el que realizaste la compra.</li>
              </ol>
              <p className="returns-side-footer">Evaluaremos el caso y coordinaremos el cambio por un producto igual o de similares características sin costo.</p>
            </div>

            <div className="returns-side-card returns-side-warning">
              <Clock className="returns-side-icon" size={24} />
              <h3>Plazos importantes</h3>
              <p>Tenés hasta <strong>30 días corridos</strong> desde que recibís tu pedido para avisarnos de cualquier problema.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Returns;
