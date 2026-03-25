import React, { useState, useEffect } from 'react';
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

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category_raw: CATEGORIES[0],
    quick_add_upsell: false,
    image_url: '',
    gallery_images: []
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) throw error;
      
      let catRaw = data.category;
      if (data.sub_category) {
        const expectedRaw = `${data.category} - ${data.sub_category}`;
        if (CATEGORIES.includes(expectedRaw)) {
          catRaw = expectedRaw;
        }
      }
      
      setFormData({
        name: data.name,
        price: data.price,
        category_raw: catRaw,
        quick_add_upsell: data.quick_add_upsell,
        image_url: data.image_url || '',
        gallery_images: data.gallery_images || []
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile) return formData.image_url;
    
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, imageFile);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let finalImageUrl = formData.image_url;
      if (imageFile) {
        finalImageUrl = await handleImageUpload();
      }

      let finalGalleryUrls = [...(formData.gallery_images || [])];
      
      if (galleryFiles.length > 0) {
        for (const file of galleryFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `products/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, file);
            
          if (uploadError) throw uploadError;
          
          const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
          finalGalleryUrls.push(data.publicUrl);
        }
      }

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
        category: category,
        sub_category: subCategory,
        quick_add_upsell: formData.quick_add_upsell,
        image_url: finalImageUrl,
        gallery_images: finalGalleryUrls,
        has_free_packaging: category === 'Mates' || category === 'Materas y Yerberas' || category === 'Bombillas'
      };

      if (isEditing) {
        await supabase.from('products').update(payload).eq('id', id);
      } else {
        await supabase.from('products').insert([payload]);
      }

      navigate('/admin');
    } catch (error) {
      alert('Error saving product: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
        <Link to="/admin" className="btn-secondary">Cancel</Link>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Product Name</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Price</label>
            <input 
              type="number" 
              required
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select 
              value={formData.category_raw}
              onChange={e => setFormData({...formData, category_raw: e.target.value})}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {formData.category_raw.startsWith('Mates') && (
            <div className="form-group toggle-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={formData.quick_add_upsell}
                  onChange={e => setFormData({...formData, quick_add_upsell: e.target.checked})}
                />
                Enable Quick Add Upsell (Trigger Cross-sell Modal)
              </label>
            </div>
          )}

          <div className="form-group">
            <label>Image</label>
            <div className="image-upload-area">
              {formData.image_url && !imageFile && (
                <img src={formData.image_url} alt="Current" className="form-thumbnail" />
              )}
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setImageFile(e.target.files[0])}
              />
              <small>Drag & Drop supported by browser standard file input</small>
            </div>
          </div>

          <div className="form-group">
            <label>Galería Múltiple (Opcional)</label>
            <div className="image-upload-area">
              {formData.gallery_images && formData.gallery_images.length > 0 && (
                <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                  {formData.gallery_images.map((img, i) => (
                    <img key={i} src={img} alt="Gallery" className="form-thumbnail" style={{width:'40px', height:'40px', borderRadius:'4px'}} />
                  ))}
                  <button type="button" onClick={() => setFormData({...formData, gallery_images: []})} style={{fontSize:'0.8rem', padding:'0 5px'}}>Eliminar Antiguas</button>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*"
                multiple
                onChange={e => setGalleryFiles(Array.from(e.target.files))}
              />
              <small>Sube 1 o más imágenes extra para la tarjeta del producto</small>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Producto'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
