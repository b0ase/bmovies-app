/**
 * POST /api/staking/dividends
 * Admin-only dividend distribution management
 *
 * Endpoints:
 * - action: 'distribute' -- Start a new dividend distribution (calculate allocations)
 * - action: 'execute' -- Mark allocations as paid (calls mark_npgx_allocations_paid RPC)
 * - action: 'status' -- Get distribution status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

interface DividendRequest {
  action: 'distribute' | 'execute' | 'status';
  distribution_id?: string;
  source_amount_sat?: number;
  source_reference?: string;
  batch_id?: string;
  payment_txid?: string;
}

// Verify admin authorization (check for admin API key)
function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const adminKey = process.env.NPGX_ADMIN_API_KEY;
  if (!adminKey) {
    console.warn('[dividends] NPGX_ADMIN_API_KEY not configured');
    return false;
  }
  return authHeader === `Bearer ${adminKey}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: DividendRequest = await request.json();
    const { action } = body;

    const supabase = createAdminClient();

    switch (action) {
      case 'distribute':
        return await handleDistribute(supabase, body);
      case 'execute':
        return await handleExecute(supabase, body);
      case 'status':
        return await handleStatus(supabase, body);
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Dividend operation failed';
    console.error('[dividends] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DISTRIBUTE: Calculate allocations for a new dividend batch
 */
async function handleDistribute(supabase: any, body: DividendRequest) {
  const { source_amount_sat, source_reference, batch_id } = body;

  if (!source_amount_sat || !batch_id) {
    return NextResponse.json(
      { error: 'source_amount_sat and batch_id are required' },
      { status: 400 }
    );
  }

  if (source_amount_sat <= 0) {
    return NextResponse.json(
      { error: 'source_amount_sat must be greater than 0' },
      { status: 400 }
    );
  }

  // Create distribution record
  const { data: distribution, error: insertError } = await supabase
    .from('npgx_dividend_distributions')
    .insert({
      batch_id,
      batch_number: await getNextBatchNumber(supabase, batch_id),
      source_amount_sat,
      source_reference,
      snapshot_timestamp: new Date().toISOString(),
      status: 'calculated',
    })
    .select()
    .single();

  if (insertError) {
    console.error('[dividends/distribute] Insert failed:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Call RPC to calculate allocations
  const { data: allocation_result, error: rpcError } = await supabase.rpc(
    'calculate_npgx_dividend_allocations',
    {
      p_distribution_id: distribution.id,
      p_source_amount_sat: source_amount_sat,
    }
  );

  if (rpcError) {
    console.error('[dividends/distribute] RPC failed:', rpcError);
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const { allocation_count, total_distributed_sat } = allocation_result[0] || {
    allocation_count: 0,
    total_distributed_sat: 0,
  };

  // Update distribution record with results
  await supabase
    .from('npgx_dividend_distributions')
    .update({
      total_recipients: allocation_count,
      total_distributed_sat,
      undistributed_sat: source_amount_sat - total_distributed_sat,
      updated_at: new Date().toISOString(),
    })
    .eq('id', distribution.id);

  console.log(
    `[dividends/distribute] Batch ${batch_id}: ${allocation_count} allocations, ${total_distributed_sat} sats distributed`
  );

  return NextResponse.json({
    success: true,
    distribution_id: distribution.id,
    batch_id,
    allocation_count,
    source_amount_sat,
    total_distributed_sat,
    undistributed_sat: source_amount_sat - total_distributed_sat,
    message: `Calculated ${allocation_count} allocations. Ready to execute.`,
  });
}

/**
 * EXECUTE: Mark allocations as paid
 */
async function handleExecute(supabase: any, body: DividendRequest) {
  const { distribution_id, payment_txid } = body;

  if (!distribution_id || !payment_txid) {
    return NextResponse.json(
      { error: 'distribution_id and payment_txid are required' },
      { status: 400 }
    );
  }

  // Verify distribution exists and is in correct status
  const { data: distribution, error: fetchError } = await supabase
    .from('npgx_dividend_distributions')
    .select('id, batch_id, status, total_recipients')
    .eq('id', distribution_id)
    .maybeSingle();

  if (fetchError || !distribution) {
    return NextResponse.json({ error: 'Distribution not found' }, { status: 404 });
  }

  if (distribution.status !== 'calculated') {
    return NextResponse.json(
      { error: `Cannot execute: distribution status is "${distribution.status}"` },
      { status: 400 }
    );
  }

  // Call RPC to mark allocations as paid
  const { data: result, error: rpcError } = await supabase.rpc('mark_npgx_allocations_paid', {
    p_distribution_id: distribution_id,
    p_payment_txid: payment_txid,
  });

  if (rpcError) {
    console.error('[dividends/execute] RPC failed:', rpcError);
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const updated_count = result[0]?.updated_count || 0;

  // Update distribution status
  await supabase
    .from('npgx_dividend_distributions')
    .update({
      status: 'executed',
      executed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', distribution_id);

  console.log(
    `[dividends/execute] Batch ${distribution.batch_id}: ${updated_count} allocations marked as paid`
  );

  return NextResponse.json({
    success: true,
    batch_id: distribution.batch_id,
    distribution_id,
    updated_allocations: updated_count,
    payment_txid,
    message: `Marked ${updated_count} allocations as paid (${distribution.batch_id})`,
  });
}

/**
 * STATUS: Get distribution status and allocation details
 */
async function handleStatus(supabase: any, body: DividendRequest) {
  const { distribution_id, batch_id } = body;

  if (!distribution_id && !batch_id) {
    return NextResponse.json(
      { error: 'distribution_id or batch_id is required' },
      { status: 400 }
    );
  }

  // Fetch distribution
  let query = supabase.from('npgx_dividend_distributions').select('*');
  if (distribution_id) {
    query = query.eq('id', distribution_id);
  } else {
    query = query.eq('batch_id', batch_id);
  }

  const { data: distributions, error: fetchError } = await query;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!distributions || distributions.length === 0) {
    return NextResponse.json({ error: 'Distribution not found' }, { status: 404 });
  }

  const distribution = distributions[0];

  // Fetch allocations for this distribution
  const { data: allocations, error: allocError } = await supabase
    .from('npgx_dividend_allocations')
    .select('user_handle, bsv_address, amount_allocated_sat, payment_status, payment_txid')
    .eq('distribution_id', distribution.id)
    .order('amount_allocated_sat', { ascending: false });

  if (allocError) {
    console.error('[dividends/status] Fetch allocations failed:', allocError);
  }

  return NextResponse.json({
    distribution: {
      id: distribution.id,
      batch_id: distribution.batch_id,
      batch_number: distribution.batch_number,
      status: distribution.status,
      source_amount_sat: distribution.source_amount_sat,
      source_reference: distribution.source_reference,
      total_recipients: distribution.total_recipients,
      total_distributed_sat: distribution.total_distributed_sat,
      undistributed_sat: distribution.undistributed_sat,
      executed_at: distribution.executed_at,
      created_at: distribution.created_at,
    },
    allocations: allocations || [],
    allocation_count: (allocations || []).length,
  });
}

/**
 * Helper: Get next batch number for a batch_id
 */
async function getNextBatchNumber(supabase: any, batch_id: string): Promise<number> {
  const { data, error } = await supabase
    .from('npgx_dividend_distributions')
    .select('batch_number')
    .eq('batch_id', batch_id)
    .order('batch_number', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return 1;
  }

  return (data[0].batch_number || 0) + 1;
}
