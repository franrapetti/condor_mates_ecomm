import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate, useParams, Link } from 'react-router-dom';
import './AdminProducts.css';

const CATEGORIES = [
  "Mates - Torpedo",
  "Mates - Imperial",
  "Mates - Varios",
  "Yerbas",
  "Bombillas - Bombillas Acero",
  "Bombillas - Bombillas Alpaca",
  "Bombillas - Bombillones de Alpaca",
  "Bombillas - Bombillones de Acero",
  "Materas y Yerberas",
  "Accesorios",
  "Termos - Termolar",
  "Termos - Media Manija Cebador",
  "Termos - Stanley Mate Sistem",
  "Termos - Houdson"
];

/* ────────────────────────────────────────────────────────────
   Beautiful Dropzone Component
──────────────────────────────────────────────────────────── */
const ImageDropzone = ({ images, onAdd, onRemove, onSetPrimary }) => {
  const onDrop = useCallback((acceptedFiles) => {
    const withPreviews = acceptedFiles.map(file =>
      Object.assign(file, { preview: URL.createObjectURL(file) })
    );
    onAdd(withPreviews);
  }, [onAdd]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });

  return (
    <div className="dropzone-wrapper">
      {/* Drop area */}
      <div
        {...getRootProps()}
        className={`dropzone-area ${isDragActive ? 'drag-over' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-inner">
          <div className="dropzone-icon">🖼️</div>
          {isDragActive
            ? <p className="dropzone-hint active">Soltá las imágenes aquí...</p>
            : (
              <>
                <p className="dropzone-hint">Arrastrá imágenes o <span className="dropzone-link">elegí archivos</span></p>
                <p className="dropzone-sub">PNG, JPG, WEBP · Podés subir varias a la vez</p>
              </>
            )
          }
        </div>
      </div>

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="dropzone-preview-grid">
          {images.map((img, idx) => (
            <div key={idx} className={`dropzone-preview-item ${idx === 0 ? 'primary' : ''}`}>
              <img src={img.preview || img.url} alt={`img-${idx}`} />
              <div className="dropzone-preview-actions">
                {idx !== 0 && (
                  <button type="button" title="Establecer como principal" onClick={() => onSetPrimary(idx)}>⭐</button>
                )}
                <button type="button" title="Eliminar" onClick={() => onRemove(idx)}>✕</button>
              </div>
              {idx === 0 && <span className="dropzone-primary-badge">Principal</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Main Form
──────────────────────────────────────────────────────────── */
const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    promo_price: '',
    stock: '',
    category_raw: CATEGORIES[0],
    quick_add_upsell: false,
  });

  // images: array of { preview, file } for new files OR { url } for existing URLs
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    if (isEditing) fetchProduct();
  }, [id]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => images.forEach(img => img.preview && URL.revokeObjectURL(img.preview));
  }, [images]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) throw error;

      let catRaw = data.category;
      if (data.sub_category) {
        const expectedRaw = `${data.category} - ${data.sub_category}`;
        if (CATEGORIES.includes(expectedRaw)) catRaw = expectedRaw;
      }

      setFormData({
        name: data.name,
        price: data.price,
        promo_price: data.promo_price ?? '',
        stock: data.stock ?? '',
        category_raw: catRaw,
        quick_add_upsell: data.quick_add_upsell,
      });

      // Reconstruct images array from existing URLs
      const existing = [];
      if (data.image_url) existing.push({ url: data.image_url });
      (data.gallery_images || []).forEach(url => existing.push({ url }));
      setImages(existing);
    } catch (error) {
      console.error(error);
    }
  };

  /* ── Image helpers ── */
  const handleAddImages = (newFiles) => {
    setImages(prev => [...prev, ...newFiles.map(f => ({ preview: f.preview, file: f }))]);
  };

  const handleRemoveImage = (idx) => {
    setImages(prev => {
      const next = [...prev];
      if (next[idx].preview) URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  const handleSetPrimary = (idx) => {
    setImages(prev => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      return [item, ...next];
    });
  };

  const uploadImage = async (img, index) => {
    if (!img.file) return img.url; // already uploaded, return URL
    setUploadProgress(`Subiendo imagen ${index + 1}...`);
    const fileExt = img.file.name.split('.').pop();
    const filePath = `products/${Math.random().toString(36).substr(2)}.${fileExt}`;
    const { error } = await supabase.storage.from('product-images').upload(filePath, img.file);
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length === 0) return alert('Por favor agregá al menos una imagen.');
    setLoading(true);

    try {
      // Upload all images (skip already-uploaded ones)
      const uploadedUrls = [];
      for (let i = 0; i < images.length; i++) {
        const url = await uploadImage(images[i], i);
        uploadedUrls.push(url);
      }

      const [primaryUrl, ...galleryUrls] = uploadedUrls;

      let category = formData.category_raw;
      let subCategory = null;
      if (formData.category_raw.includes(' - ')) {
        const parts = formData.category_raw.split(' - ');
        category = parts[0];
        subCategory = parts[1];
      }

      const payload = {
        name: formData.name,
        price: Number(formData.price),
        promo_price: formData.promo_price !== '' ? Number(formData.promo_price) : null,
        stock: formData.stock !== '' ? Number(formData.stock) : null,
        category,
        sub_category: subCategory,
        quick_add_upsell: formData.quick_add_upsell,
        image_url: primaryUrl,
        gallery_images: galleryUrls,
        has_free_packaging: ['Mates', 'Materas y Yerberas', 'Bombillas'].includes(category),
      };

      setUploadProgress('Guardando en base de datos...');
      if (isEditing) {
        const { error } = await supabase.from('products').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
      }

      navigate('/admin');
    } catch (error) {
      console.error(error);
      alert('Error al guardar el producto:\n\n' + (error.message || error.details || JSON.stringify(error)));
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h1>
        <Link to="/admin" className="btn-secondary">Cancelar</Link>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="admin-form">

          {/* ── Nombre ── */}
          <div className="form-group">
            <label>Nombre del Producto</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ej: Mate Torpedo Premium"
            />
          </div>

          {/* ── Precios ── */}
          <div className="form-row">
            <div className="form-group">
              <label>Precio Regular (ARS)</label>
              <input
                type="number"
                required
                min="0"
                value={formData.price}
                onChange={e => set('price', e.target.value)}
                placeholder="Ej: 12000"
              />
            </div>
            <div className="form-group">
              <label>
                Precio Promocional <span className="form-label-hint">(Opcional)</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.promo_price}
                onChange={e => set('promo_price', e.target.value)}
                placeholder="Ej: 9500"
              />
              {formData.promo_price && formData.price && Number(formData.promo_price) < Number(formData.price) && (
                <small className="form-hint-success">
                  {Math.round((1 - formData.promo_price / formData.price) * 100)}% de descuento ✓
                </small>
              )}
            </div>
          </div>

          {/* ── Stock ── */}
          <div className="form-group">
            <label>Stock Disponible</label>
            <input
              type="number"
              min="0"
              value={formData.stock}
              onChange={e => set('stock', e.target.value)}
              placeholder="Ej: 10"
            />
          </div>

          {/* ── Categoría ── */}
          <div className="form-group">
            <label>Categoría</label>
            <select
              value={formData.category_raw}
              onChange={e => set('category_raw', e.target.value)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* ── Cross-sell toggle ── */}
          {formData.category_raw.startsWith('Mates') && (
            <div className="form-group toggle-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={formData.quick_add_upsell}
                  onChange={e => set('quick_add_upsell', e.target.checked)}
                />
                <span>Activar Cross-sell Modal al agregar al carrito</span>
              </label>
            </div>
          )}

          {/* ── Images ── */}
          <div className="form-group">
            <label>
              Imágenes del Producto
              <span className="form-label-hint"> · La primera es la imagen principal</span>
            </label>
            <ImageDropzone
              images={images}
              onAdd={handleAddImages}
              onRemove={handleRemoveImage}
              onSetPrimary={handleSetPrimary}
            />
          </div>

          {/* ── Submit ── */}
          <button type="submit" className="btn-primary btn-submit" disabled={loading}>
            {loading ? (
              <span>{uploadProgress || 'Guardando...'}</span>
            ) : (
              <span>{isEditing ? '✓ Guardar Cambios' : '+ Crear Producto'}</span>
            )}
          </button>

        </form>
      </div>
    </div>
  );
};

export default ProductForm;
