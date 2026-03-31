import React from 'react';
import { Outlet } from 'react-router-dom';
import Footer from './Footer';

const PublicLayout = () => {
  return (
    <>
      <div className="public-content-wrap">
        <Outlet />
      </div>
      <Footer />
    </>
  );
};

export default PublicLayout;
