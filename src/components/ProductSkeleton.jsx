import React from 'react';
import { Skeleton, Box, ThemeProvider, createTheme } from '@mui/material';

// We create a base theme that we can use just for the skeleton to ensure MUI's 
// default color scheme behaves nicely.
const muiTheme = createTheme({
  palette: {
    mode: 'light', // We can keep it light or detect the body class, but light is safe for the "MUI standard design"
  },
});

export const ProductCardSkeleton = () => {
  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{
        border: '1px solid var(--border)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'none',
        height: '100%'
      }}>
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          sx={{ aspectRatio: '1/1', height: 'auto', backgroundColor: 'var(--border, rgba(0, 0, 0, 0.08))' }} 
          animation="wave" 
        />
        <Box sx={{ p: '1rem 0.6rem', display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
          <Skeleton variant="text" width="80%" sx={{ fontSize: '1.2rem', backgroundColor: 'var(--border, rgba(0, 0, 0, 0.08))' }} animation="wave" />
          <Skeleton variant="text" width="40%" sx={{ fontSize: '1.5rem', mb: 0.5, backgroundColor: 'var(--border, rgba(0, 0, 0, 0.08))' }} animation="wave" />
          
          <Box sx={{ p: 1, border: '1px dashed var(--border, #d0d0d0)', borderRadius: '6px', backgroundColor: 'var(--background, #f5f5f5)', mt: 0.5, width: '70%' }}>
            <Skeleton variant="text" width="60%" sx={{ fontSize: '1.2rem', backgroundColor: 'var(--text-muted, rgba(0, 0, 0, 0.15))' }} animation="wave" />
            <Skeleton variant="text" width="90%" sx={{ fontSize: '0.8rem', backgroundColor: 'var(--text-muted, rgba(0, 0, 0, 0.15))' }} animation="wave" />
          </Box>
          
          <Skeleton variant="rounded" width="100%" height={40} sx={{ mt: 'auto', backgroundColor: 'var(--border, rgba(0, 0, 0, 0.08))' }} animation="wave" />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export const ProductDetailSkeleton = () => {
  return (
    <ThemeProvider theme={muiTheme}>
      <Box className="container main-content fade-in">
        <Skeleton variant="rounded" width={150} height={20} sx={{ mb: 2.5, backgroundColor: 'var(--border, rgba(0, 0, 0, 0.08))' }} animation="wave" />
        <Box className="product-detail-layout">
          <Box className="product-gallery">
            <Skeleton variant="rounded" width="100%" sx={{ minHeight: '400px', borderRadius: '8px', backgroundColor: 'var(--border, rgba(0, 0, 0, 0.08))' }} animation="wave" />
          </Box>
          <Box className="product-info">
            <Skeleton variant="text" width="80%" sx={{ fontSize: '2.5rem', mb: 2, backgroundColor: 'var(--border, rgba(0, 0, 0, 0.08))' }} animation="wave" />
            <Skeleton variant="text" width="40%" sx={{ fontSize: '2rem', mb: 2, backgroundColor: 'var(--border, rgba(0, 0, 0, 0.08))' }} animation="wave" />
            <Skeleton variant="text" width="60%" sx={{ fontSize: '1rem', mb: 3, backgroundColor: 'var(--border, rgba(0, 0, 0, 0.08))' }} animation="wave" />
            
            <Skeleton variant="rounded" width="100%" height={60} sx={{ mb: 2, borderRadius: '8px', backgroundColor: 'var(--border, rgba(0, 0, 0, 0.08))' }} animation="wave" />
            
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Skeleton variant="rounded" sx={{ flexGrow: 1, backgroundColor: 'var(--border, rgba(0, 0, 0, 0.08))' }} height={50} animation="wave" />
              <Skeleton variant="rounded" width={50} height={50} sx={{ backgroundColor: 'var(--border, rgba(0, 0, 0, 0.08))' }} animation="wave" />
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default ProductCardSkeleton;
