const SUPABASE_URL = 'https://rshodtpupdtjsloymavy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzaG9kdHB1cGR0anNsb3ltYXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NjI1NTMsImV4cCI6MjA4OTUzODU1M30.6fpRBkZMCpXR4_7xRJtcmk55C0f0t4Cx9jVADlDS4Nc';

async function check() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,visit_count`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

check();
