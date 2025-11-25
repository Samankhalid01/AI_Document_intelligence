// API: List documents
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseServer.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('documents')
      .select('*, processing_jobs(status, progress)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('List documents error:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({ documents: data || [] });
  } catch (error) {
    console.error('List error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
