// API: Get document details
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseServer.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Fetch document
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Fetch classifications
    const { data: classifications } = await supabaseAdmin
      .from('classifications')
      .select('*')
      .eq('document_id', id);

    // Fetch extracted fields
    const { data: extractedFields } = await supabaseAdmin
      .from('extracted_fields')
      .select('*')
      .eq('document_id', id);

    // Fetch processing job
    const { data: job } = await supabaseAdmin
      .from('processing_jobs')
      .select('*')
      .eq('document_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get signed URL
    let signedUrl = null;
    if (document.storage_path) {
      const { data: urlData } = await supabaseAdmin.storage
        .from('Documents')
        .createSignedUrl(document.storage_path, 3600);
      signedUrl = urlData?.signedUrl;
    }

    return NextResponse.json({
      document,
      classifications: classifications || [],
      extracted_fields: extractedFields || [],
      job,
      signed_url: signedUrl,
    });
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
