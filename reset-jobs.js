// Reset failed jobs to pending so they can be retried
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetJobs() {
  console.log('🔄 Resetting failed jobs to pending...');
  
  const { data, error } = await supabase
    .from('processing_jobs')
    .update({ 
      status: 'pending',
      progress: 0,
      error: null,
      started_at: null
    })
    .eq('status', 'failed');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ Reset complete!');
  console.log(`📝 Jobs reset: ${data?.length || 0}`);
  process.exit(0);
}

resetJobs();
