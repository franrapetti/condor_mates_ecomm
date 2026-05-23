import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { code, cartTotal, items } = req.body;
    if (!code) return res.status(400).json({ valid: false, error: 'Código de cupón requerido.' });

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('active', true)
      .single();

    if (error || !coupon) {
      return res.status(404).json({ valid: false, error: 'Cupón inválido o expirado.' });
    }

    // Validate expiration
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ valid: false, error: 'El cupón ha expirado.' });
    }

    // Validate max uses
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ valid: false, error: 'Este cupón ya alcanzó el límite de usos.' });
    }

    // Validate min purchase
    if (cartTotal < (coupon.min_purchase_amount || 0)) {
      return res.status(400).json({
        valid: false,
        error: `El monto mínimo de compra para este cupón es $${Number(coupon.min_purchase_amount).toLocaleString('es-AR')}.`
      });
    }

    // Calculate discount based on applicable_product_filter or applicable_category
    let discountAmount = 0;
    let applicableItemsFound = true;

    if (coupon.applicable_product_filter) {
      // Filter pattern: 'keyword1%keyword2' means item name must include both keywords
      const keywords = coupon.applicable_product_filter.split('%').map(k => k.toLowerCase().trim()).filter(Boolean);
      const targetItems = (items || []).filter(item =>
        keywords.every(kw => item.name.toLowerCase().includes(kw))
      );

      if (targetItems.length === 0) {
        return res.status(400).json({
          valid: false,
          error: `Este cupón solo aplica a productos que contengan: ${keywords.join(' + ')}.`
        });
      }

      const targetTotal = targetItems.reduce((acc, item) => acc + ((item.promo_price || item.price) * (item.quantity || 1)), 0);
      discountAmount = coupon.discount_type === 'percentage'
        ? Math.round(targetTotal * (coupon.discount_value / 100))
        : Math.min(Number(coupon.discount_value), targetTotal);

    } else if (coupon.applicable_category) {
      const targetItems = (items || []).filter(item => item.category === coupon.applicable_category);
      if (targetItems.length === 0) {
        return res.status(400).json({
          valid: false,
          error: `Este cupón solo aplica a productos de la categoría: ${coupon.applicable_category}.`
        });
      }
      const targetTotal = targetItems.reduce((acc, item) => acc + ((item.promo_price || item.price) * (item.quantity || 1)), 0);
      discountAmount = coupon.discount_type === 'percentage'
        ? Math.round(targetTotal * (coupon.discount_value / 100))
        : Math.min(Number(coupon.discount_value), targetTotal);

    } else {
      // Global coupon — applies to full cart
      discountAmount = coupon.discount_type === 'percentage'
        ? Math.round(cartTotal * (coupon.discount_value / 100))
        : Math.min(Number(coupon.discount_value), cartTotal);
    }

    return res.status(200).json({
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      discount_amount: discountAmount,
      applicable_product_filter: coupon.applicable_product_filter || null,
      applicable_category: coupon.applicable_category || null,
    });

  } catch (err) {
    console.error('Error validating coupon:', err);
    return res.status(500).json({ valid: false, error: 'Error interno del servidor.' });
  }
}
