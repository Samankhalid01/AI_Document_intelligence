// Background Worker - Process documents
import { supabaseAdmin } from '../lib/supabaseServer.js';
import { ocrService } from '../services/ocrService.js';
import { classificationService } from '../services/classificationService.js';
import { extractionService } from '../services/extractionService.js';

async function claimJob() {
  try {
    // Try to get pending jobs directly (simpler approach)
    const { data: jobs, error } = await supabaseAdmin
      .from('processing_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);
    
    if (error) {
      console.error('❌ Error fetching jobs:', error);
      return null;
    }
    
    if (jobs && jobs.length > 0) {
      const job = jobs[0];
      console.log(`📝 Found pending job: ${job.id}`);
      
      // Update to running
      const { error: updateError } = await supabaseAdmin
        .from('processing_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('status', 'pending'); // Only update if still pending (prevent race condition)
      
      if (updateError) {
        console.error('❌ Error claiming job:', updateError);
        return null;
      }
      
      console.log(`✅ Claimed job: ${job.id}`);
      return job;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Claim job error:', error);
    return null;
  }
}

async function processJob(job) {
  console.log(`Processing job ${job.id} for document ${job.document_id}`);

  try {
    // Update status to running
    await supabaseAdmin
      .from('processing_jobs')
      .update({ status: 'running', started_at: new Date().toISOString(), progress: 10 })
      .eq('id', job.id);

    // Fetch document
    const { data: document } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', job.document_id)
      .single();

    if (!document) {
      throw new Error('Document not found');
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('Documents')
      .download(document.storage_path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Update progress: OCR
    await supabaseAdmin
      .from('processing_jobs')
      .update({ progress: 30 })
      .eq('id', job.id);

    console.log('Running OCR...');
    // Check file type and use appropriate processor
    const isPDF = document.filename.toLowerCase().endsWith('.pdf');
    const ocrResult = isPDF 
      ? await ocrService.processPDF(buffer)
      : await ocrService.processImage(buffer);

    // Update progress: Classification
    await supabaseAdmin
      .from('processing_jobs')
      .update({ progress: 50 })
      .eq('id', job.id);

    console.log('Classifying document...');
    const classification = classificationService.classify(ocrResult.text);

    // Update progress: Extraction
    await supabaseAdmin
      .from('processing_jobs')
      .update({ progress: 70 })
      .eq('id', job.id);

    console.log('Extracting fields...');
    const extractedFields = extractionService.extractFields(ocrResult.text, classification.type);

    // Truncate text if too long (max 50000 chars for storage)
    const maxTextLength = 50000;
    const truncatedText = ocrResult.text.length > maxTextLength 
      ? ocrResult.text.substring(0, maxTextLength) + '... [truncated]'
      : ocrResult.text;

    // Save OCR text (without the raw data which can be huge)
    await supabaseAdmin.from('ocr_texts').insert([
      {
        document_id: document.id,
        page_number: 1,
        text: truncatedText,
        raw: null, // Skip raw data to avoid size issues
      },
    ]);

    // Save classification
    await supabaseAdmin.from('classifications').insert([
      {
        document_id: document.id,
        label: classification.type,
        confidence: classification.confidence,
        model: classification.model,
      },
    ]);

    // Save extracted fields
    if (extractedFields.length > 0) {
      const fieldsToInsert = extractedFields.map((field) => ({
        document_id: document.id,
        field_name: field.name,
        field_value: field.value,
        confidence: field.confidence,
        normalized: field.normalized || null,
      }));
      await supabaseAdmin.from('extracted_fields').insert(fieldsToInsert);
    }

    // Build structured result (without full text to avoid size issues)
    const structuredResult = {
      type: classification.type,
      confidence: classification.confidence,
      text_preview: truncatedText.substring(0, 500) + '...', // Only store preview
      fields: extractedFields.reduce((acc, field) => {
        acc[field.name] = field.value;
        return acc;
      }, {}),
    };

    // Update document (without raw_ocr to avoid size issues)
    await supabaseAdmin
      .from('documents')
      .update({
        status: 'processed',
        document_type: classification.type,
        structured_result: structuredResult,
        processed_at: new Date().toISOString(),
      })
      .eq('id', document.id);

    // Update job as done
    await supabaseAdmin
      .from('processing_jobs')
      .update({
        status: 'done',
        progress: 100,
        finished_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    console.log(`✅ Job ${job.id} completed successfully`);
  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, error);
    await supabaseAdmin
      .from('processing_jobs')
      .update({
        status: 'failed',
        error: error.message,
        finished_at: new Date().toISOString(),
      })
      .eq('id', job.id);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('🚀 Document processing worker started');
  console.log('Waiting for jobs...');
  
  let checkCount = 0;

  while (true) {
    try {
      checkCount++;
      if (checkCount % 20 === 0) {
        console.log(`🔍 Still checking for jobs... (checked ${checkCount} times)`);
      }
      
      const job = await claimJob();
      if (job) {
        await processJob(job);
      } else {
        await sleep(3000); // Wait 3 seconds before checking again
      }
    } catch (error) {
      console.error('❌ Worker error:', error);
      await sleep(5000);
    }
  }
}

// Export the worker function so it can be started by loader
export async function startWorker() {
  await run();
}

// If run directly (not imported), start immediately
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  run();
}
