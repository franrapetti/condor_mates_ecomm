import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: prods } = await supabase.from('products').select('id, name, price, promo_price, stock, image_url, category');
  console.log('Total products loaded:', prods.length);
  
  const { data: ordersData } = await supabase.from('orders').select('*');
  const { data: manualData } = await supabase.from('manual_sales').select('*');
  
  const validWeb = ordersData.filter(o => o.status === 'paid' || o.status === 'shipped');
  const validManual = manualData.filter(s => s.status === 'paid');
  
  const totalRevenue = validWeb.reduce((acc, o) => acc + (o.total_price || 0), 0) + validManual.reduce((acc, m) => acc + (m.total_amount || 0), 0);
  
  let yerbaRevenue = 0;
  [...validWeb, ...validManual].forEach(sale => {
    let items = sale.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (_) { items = []; }
    }
    if (Array.isArray(items)) {
      items.forEach(item => {
        const rawId = item.product_id || item.id;
        let numericId = null;
        if (rawId) {
          numericId = String(rawId).includes('_combo') ? parseInt(String(rawId).split('_')[0], 10) : Number(rawId);
        }
        
        const catProd = prods.find(p => Number(p.id) === numericId);
        const isYerba = catProd ? 
          (catProd.category === 'Yerbas' || catProd.category === 'Yerba Mate') : 
          /yerba|baldo|canarias|sara|rey verde/i.test(item.name || '');
          
        if (isYerba) {
          yerbaRevenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
        }
      });
    }
  });
  
  const yerbaPercentage = totalRevenue > 0 ? ((yerbaRevenue / totalRevenue) * 100).toFixed(1) : 0;
  console.log(`Yerba Revenue: ${yerbaRevenue}, Total Revenue: ${totalRevenue}`);
  console.log(`Calculated Percentage: ${yerbaPercentage}%`);
}

run();
