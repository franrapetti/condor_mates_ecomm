import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../../lib/supabaseClient';

// ── Individual hero uploader slot ────────────────────────────────────────────
function HeroUploader({ slotKey, label, aspectLabel, sizeLabel, resLabel, currentUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(currentUrl || '');

  useEffect(() => {
    setUploadedUrl(currentUrl || '');
  }, [currentUrl]);

  const liveUrl = preview || uploadedUrl || null;

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `hero/${slotKey}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      const publicUrl = data.publicUrl;

      // Store in site_settings
      const { error: dbErr } = await supabase
        .from('site_settings')
        .upsert({ key: slotKey, value: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (dbErr) throw dbErr;

      setUploadedUrl(publicUrl);
      setPreview(null);
      onUploaded?.(slotKey, publicUrl);
    } catch (err) {
      alert('Error al subir imagen: ' + err.message);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [slotKey, onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Preview Area */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: slotKey === 'hero_bg_url' ? '16/6' : '9/16',
        maxHeight: slotKey === 'hero_bg_url' ? 280 : 480,
        background: '#e8e4db',
        overflow: 'hidden',
      }}>
        {liveUrl ? (
          <img
            src={liveUrl}
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#999', fontSize: '0.85rem', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '2.5rem' }}>🖼️</span>
            <span>Sin imagen cargada</span>
          </div>
        )}
        {uploading && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '0.9rem',
          }}>
            ⬆️ Subiendo...
          </div>
        )}
      </div>

      {/* Info & Uploader */}
      <div style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)' }}>
          {label}
        </h3>

        {/* Quality recommendations */}
        <div style={{
          background: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          fontSize: '0.78rem',
          color: 'var(--text-light)',
        }}>
          <p style={{ margin: '0 0 0.35rem', fontWeight: 700, color: 'var(--text-dark)' }}>
            📐 Recomendaciones
          </p>
          <ul style={{ margin: 0, paddingLeft: '1rem', lineHeight: 1.8 }}>
            <li>Relación de aspecto: <strong>{aspectLabel}</strong></li>
            <li>Resolución mínima: <strong>{resLabel}</strong></li>
            <li>Peso máximo: <strong>{sizeLabel}</strong></li>
            <li>Formato: <strong>JPG o WEBP</strong> comprimido</li>
          </ul>
        </div>

        <div
          {...getRootProps()}
          style={{
            border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 12,
            padding: '1.25rem',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            background: isDragActive ? 'rgba(35,74,46,0.04)' : 'transparent',
            transition: 'all 0.2s',
          }}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--accent)' }}>Soltá para subir ↓</p>
          ) : (
            <div>
              <p style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                📁 Arrastrá o hacé clic para subir
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>
                JPG, PNG, WEBP — Máx {sizeLabel}
              </p>
            </div>
          )}
        </div>

        {uploadedUrl && !preview && (
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
            ✅ Imagen activa — se ve en el sitio de inmediato
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value');
      if (data) {
        setSettings(Object.fromEntries(data.map(r => [r.key, r.value])));
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleUploaded = (key, url) => {
    setSettings(prev => ({ ...prev, [key]: url }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="admin-page">
      <div className="adm-page-header">
        <div className="adm-page-title">
          <h1>Configuración del Sitio</h1>
        </div>
        {saved && (
          <div style={{
            background: '#ecfdf5', color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: 8, padding: '0.5rem 1rem',
            fontWeight: 700, fontSize: '0.85rem',
          }}>
            ✅ ¡Guardado y activo!
          </div>
        )}
      </div>

      {loading ? (
        <p>Cargando configuración...</p>
      ) : (
        <div>
          <h2 style={{
            fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--text-light)', marginBottom: '1rem',
          }}>
            🖼️ Hero Banner Principal
          </h2>

          {/* SQL reminder */}
          <div style={{
            background: '#fef3c7', border: '1px solid #fde68a',
            borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem',
            fontSize: '0.8rem', color: '#92400e',
          }}>
            <strong>⚠️ Primer uso:</strong> Asegurate de haber ejecutado el SQL de creación de la tabla{' '}
            <code>site_settings</code> en Supabase. El link está en el plan de implementación.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            <HeroUploader
              slotKey="hero_bg_url"
              label="Hero Desktop"
              aspectLabel="16:9 o 21:9 (panorámico)"
              resLabel="1920×1080 px mín."
              sizeLabel="3 MB"
              currentUrl={settings['hero_bg_url']}
              onUploaded={handleUploaded}
            />
            <HeroUploader
              slotKey="hero_mobile_url"
              label="Hero Mobile"
              aspectLabel="9:16 (vertical)"
              resLabel="1080×1920 px mín."
              sizeLabel="2 MB"
              currentUrl={settings['hero_mobile_url']}
              onUploaded={handleUploaded}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
