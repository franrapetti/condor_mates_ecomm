/**
 * ============================================================
 *  Cóndor Mates — Analytics Validation Script
 *  Ejecutar: node validate_analytics.js
 *
 *  Simula N visitas a productos y verifica que se registran
 *  correctamente en las 3 capas:
 *    1. page_views (con product_id vinculado)
 *    2. products.visit_count (incrementado atómicamente)
 *    3. analytics_events (evento view_product)
 * ============================================================
 */

const SUPABASE_URL = 'https://rshodtpupdtjsloymavy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzaG9kdHB1cGR0anNsb3ltYXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NjI1NTMsImV4cCI6MjA4OTUzODU1M30.6fpRBkZMCpXR4_7xRJtcmk55C0f0t4Cx9jVADlDS4Nc';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const HEADERS_RETURN = {
  ...HEADERS,
  'Prefer': 'return=representation',
};

const HEADERS_MINIMAL = {
  ...HEADERS,
  'Prefer': 'return=minimal',
};

const NUM_SIMULATED_VISITS = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function supaGet(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${table} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supaPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${table} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supaRpc(fn, args) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC ${fn} failed: ${res.status} ${text}`);
  }
  // RPC returns void — 204 or empty body is OK
  return res.status === 204 ? null : res.json().catch(() => null);
}

async function supaPatch(table, query, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${table} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔬 Cóndor Mates — Analytics Validation');
  console.log('═'.repeat(55));
  console.log();

  // 1. Get all products
  const products = await supaGet('products', 'select=id,name,visit_count&order=id.asc&limit=10');
  if (products.length === 0) {
    console.log('❌ No hay productos en la base de datos. Abortando.');
    process.exit(1);
  }
  console.log(`📦 Productos encontrados: ${products.length}`);

  // Pick the first product for the test
  const testProduct = products[0];
  console.log(`🎯 Producto de prueba: "${testProduct.name}" (ID: ${testProduct.id})`);
  console.log(`   visit_count antes: ${testProduct.visit_count || 0}`);
  console.log();

  // 2. Record initial state
  const initialVisitCount = testProduct.visit_count || 0;
  const testSessionId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 3. Simulate N visits (mimics what the fixed frontend does)
  console.log(`🚀 Simulando ${NUM_SIMULATED_VISITS} visitas...`);
  const createdViewIds = [];
  const errors = [];

  for (let i = 0; i < NUM_SIMULATED_VISITS; i++) {
    const sessionId = `${testSessionId}_${i}`;
    try {
      // Step A: INSERT page_view (like useAnalytics does via Supabase JS SDK)
      // The Supabase JS SDK uses PostgREST with select() which adds Prefer: return=representation
      // For anon role, we need to use the SDK approach: insert + select in one call
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/page_views`, {
        method: 'POST',
        headers: {
          ...HEADERS,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          session_id: sessionId,
          path: `/producto/${testProduct.id}`,
          source: 'test_script',
          duration_seconds: 0,
        }),
      });

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        errors.push(`Visit ${i + 1}: page_view INSERT failed: ${insertRes.status} ${errText}`);
        process.stdout.write(`  ✗ Visit ${i + 1}/${NUM_SIMULATED_VISITS} — INSERT failed\n`);
        continue;
      }

      const insertData = await insertRes.json();
      const pageViewId = Array.isArray(insertData) ? insertData[0]?.id : insertData?.id;

      if (!pageViewId) {
        errors.push(`Visit ${i + 1}: page_view INSERT returned no ID`);
        process.stdout.write(`  ✗ Visit ${i + 1}/${NUM_SIMULATED_VISITS} — no ID\n`);
        continue;
      }

      // Step B: UPDATE page_view with product_id (like logProductPageView)
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/page_views?id=eq.${pageViewId}`, {
        method: 'PATCH',
        headers: HEADERS_MINIMAL,
        body: JSON.stringify({ product_id: testProduct.id }),
      });

      if (!patchRes.ok) {
        const errText = await patchRes.text();
        errors.push(`Visit ${i + 1}: page_view UPDATE failed: ${patchRes.status} ${errText}`);
      }

      // Step C: Increment visit_count via RPC
      await supaRpc('increment_visit_count', { p_product_id: testProduct.id });

      // Step D: Log analytics event (minimal return — no ID needed)
      const evtRes = await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
        method: 'POST',
        headers: HEADERS_MINIMAL,
        body: JSON.stringify({
          session_id: sessionId,
          event_name: 'view_product',
          metadata: { product_id: testProduct.id, product_name: testProduct.name, source: 'test_script' },
        }),
      });

      if (!evtRes.ok) {
        const errText = await evtRes.text();
        errors.push(`Visit ${i + 1}: analytics_events INSERT failed: ${evtRes.status} ${errText}`);
      }

      createdViewIds.push(pageViewId);
      process.stdout.write(`  ✓ Visit ${i + 1}/${NUM_SIMULATED_VISITS}\n`);
    } catch (err) {
      errors.push(`Visit ${i + 1}: ${err.message}`);
      process.stdout.write(`  ✗ Visit ${i + 1}/${NUM_SIMULATED_VISITS} — ${err.message}\n`);
    }
  }

  console.log();

  // 4. Verify results
  console.log('📊 Verificando resultados...');
  console.log('─'.repeat(55));

  let passed = 0;
  let failed = 0;

  // Check A: page_views rows with correct product_id
  const linkedViews = await supaGet(
    'page_views',
    `select=id,product_id&session_id=like.${testSessionId}*&product_id=eq.${testProduct.id}`
  );
  const linkedCount = linkedViews.length;

  if (linkedCount === NUM_SIMULATED_VISITS) {
    console.log(`  ✅ page_views con product_id correcto: ${linkedCount}/${NUM_SIMULATED_VISITS} (100%)`);
    passed++;
  } else {
    console.log(`  ❌ page_views con product_id correcto: ${linkedCount}/${NUM_SIMULATED_VISITS} (${((linkedCount / NUM_SIMULATED_VISITS) * 100).toFixed(0)}%)`);
    failed++;
  }

  // Check B: product.visit_count incremented
  const [updatedProduct] = await supaGet('products', `select=visit_count&id=eq.${testProduct.id}`);
  const newVisitCount = updatedProduct?.visit_count || 0;
  const expectedVisitCount = initialVisitCount + NUM_SIMULATED_VISITS;

  if (newVisitCount === expectedVisitCount) {
    console.log(`  ✅ visit_count: ${initialVisitCount} → ${newVisitCount} (esperado: ${expectedVisitCount})`);
    passed++;
  } else {
    console.log(`  ❌ visit_count: ${initialVisitCount} → ${newVisitCount} (esperado: ${expectedVisitCount})`);
    failed++;
  }

  // Check C: analytics_events con evento view_product
  const events = await supaGet(
    'analytics_events',
    `select=id,event_name&session_id=like.${testSessionId}*&event_name=eq.view_product`
  );
  const eventCount = events.length;

  if (eventCount === NUM_SIMULATED_VISITS) {
    console.log(`  ✅ analytics_events (view_product): ${eventCount}/${NUM_SIMULATED_VISITS} (100%)`);
    passed++;
  } else {
    console.log(`  ❌ analytics_events (view_product): ${eventCount}/${NUM_SIMULATED_VISITS} (${((eventCount / NUM_SIMULATED_VISITS) * 100).toFixed(0)}%)`);
    failed++;
  }

  // Check D: increment_click_count RPC works (type compatibility)
  let clickRpcOk = false;
  try {
    await supaRpc('increment_click_count', { product_id: testProduct.id });
    clickRpcOk = true;
    console.log(`  ✅ increment_click_count RPC: funciona con BIGINT`);
    passed++;
  } catch (err) {
    console.log(`  ❌ increment_click_count RPC: ${err.message}`);
    failed++;
  }

  console.log('─'.repeat(55));

  // Summary
  console.log();
  const total = passed + failed;
  const pct = ((passed / total) * 100).toFixed(0);

  if (failed === 0) {
    console.log(`🎉 RESULTADO: ${passed}/${total} verificaciones pasaron (${pct}% precisión)`);
    console.log('   ✅ El pipeline de analíticas funciona correctamente.');
  } else {
    console.log(`⚠️  RESULTADO: ${passed}/${total} verificaciones pasaron (${pct}% precisión)`);
    console.log(`   ❌ ${failed} verificación(es) fallaron.`);
    if (errors.length > 0) {
      console.log();
      console.log('   Errores detallados:');
      errors.forEach(e => console.log(`     • ${e}`));
    }
    console.log();
    console.log('   💡 Asegurate de haber ejecutado setup_analytics_v4_fix.sql en Supabase.');
  }

  console.log();

  // Cleanup: remove test data
  console.log('🧹 Limpiando datos de prueba...');
  try {
    // Delete test page_views
    await fetch(`${SUPABASE_URL}/rest/v1/page_views?session_id=like.${testSessionId}*`, {
      method: 'DELETE',
      headers: HEADERS,
    });
    // Delete test analytics_events  
    await fetch(`${SUPABASE_URL}/rest/v1/analytics_events?session_id=like.${testSessionId}*`, {
      method: 'DELETE',
      headers: HEADERS,
    });
    // Restore original visit_count
    await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${testProduct.id}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ visit_count: initialVisitCount }),
    });
    // Restore click_count (undo the +1 from the RPC test)
    if (clickRpcOk) {
      const [prod] = await supaGet('products', `select=click_count&id=eq.${testProduct.id}`);
      if (prod && prod.click_count > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${testProduct.id}`, {
          method: 'PATCH',
          headers: HEADERS,
          body: JSON.stringify({ click_count: prod.click_count - 1 }),
        });
      }
    }
    console.log('   ✓ Datos de prueba eliminados y contadores restaurados.');
  } catch (err) {
    console.log(`   ⚠️  Error en limpieza (no afecta resultados): ${err.message}`);
  }
}

main().catch(err => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
