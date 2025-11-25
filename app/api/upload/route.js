// API: Upload document
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseServer.js';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and PDF allowed' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `documents/${timestamp}_${sanitizedName}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('Documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Insert document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert([
        {
          filename: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          status: 'uploaded',
          metadata: {
            size: file.size,
            uploaded_at: new Date().toISOString(),
          },
        },
      ])
      .select()
      .single();

    if (docError) {
      console.error('Document insert error:', docError);
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }

    // Create processing job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('processing_jobs')
      .insert([
        {
          document_id: document.id,
          status: 'pending',
          progress: 0,
        },
      ])
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      job_id: job.id,
      message: 'Document uploaded. Processing will begin shortly.',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
