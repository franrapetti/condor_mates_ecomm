import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="notfound-page">
      <Helmet>
        <title>Página no encontrada | Cóndor Mates</title>
      </Helmet>
      <div className="notfound-card">
        <div className="notfound-eagle">🦅</div>
        <h1 className="notfound-code">404</h1>
        <h2 className="notfound-title">¡Uy, este camino no existe!</h2>
        <p className="notfound-desc">
          El mate que buscás no está en esta ruta. Puede que el link haya cambiado o que simplemente hayas tomado un camino equivocado.
        </p>
        <Link to="/" className="notfound-btn">
          🧉 Volver a la Tienda
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
