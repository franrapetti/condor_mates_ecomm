import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key) env[key.trim()] = val.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log("Attempting insert...");
  const res = await supabase.from('analytics_events').insert([{
    session_id: 'test_session_123',
    event_name: 'test_event',
    metadata: {}
  }]);
  console.log("Insert result:", JSON.stringify(res, null, 2));
}
test();
