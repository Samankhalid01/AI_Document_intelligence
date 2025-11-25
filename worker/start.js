// Worker entry point - loads environment then starts worker
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

console.log('📝 Loading environment from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env.local:', result.error);
  process.exit(1);
}

console.log('✅ Environment loaded');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET ✓' : 'MISSING ✗');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET ✓' : 'MISSING ✗');

// Now dynamically import and run the worker
const { startWorker } = await import('./processJobs.js');
await startWorker();
