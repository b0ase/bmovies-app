/**
 * POST /api/staking
 * Handles staking operations: stake, unstake, claim dividends
 *
 * Requires authentication via $401 identity (user_handle)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email-service';

interface StakingRequest {
  action: 'stake' | 'unstake' | 'claim_dividends';
  user_handle: string;
  staking_address?: string;
  amount_npgx?: number;
  stake_id?: string;
  bsv_address?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StakingRequest = await request.json();
    const { action, user_handle } = body;

    if (!user_handle) {
      return NextResponse.json({ error: 'user_handle is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    switch (action) {
      case 'stake':
        return await handleStake(supabase, body);
      case 'unstake':
        return await handleUnstake(supabase, body);
      case 'claim_dividends':
        return await handleClaimDividends(supabase, body);
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Staking operation failed';
    console.error('[staking] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * STAKE: Record a new $NPGX staking position
 */
async function handleStake(supabase: any, body: StakingRequest) {
  const { user_handle, staking_address, amount_npgx } = body;

  if (!staking_address || !amount_npgx) {
    return NextResponse.json(
      { error: 'staking_address and amount_npgx are required' },
      { status: 400 }
    );
  }

  // Check if member exists, create if not
  const { data: member } = await supabase
    .from('npgx_members')
    .select('id')
    .eq('user_handle', user_handle)
    .maybeSingle();

  if (!member) {
    await supabase.from('npgx_members').insert({
      user_handle,
      kyc_status: 'unverified',
    });
  }

  // Create stake record
  const { data: stake, error } = await supabase
    .from('npgx_stakes')
    .insert({
      user_handle,
      staking_address,
      amount_npgx,
      status: 'active',
      staked_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[staking/stake] Insert failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update member summary
  await supabase.rpc('update_npgx_member_staking_summary', {
    p_user_handle: user_handle,
  });

  console.log(`[staking/stake] Stake created: ${stake.id} for ${user_handle} (${amount_npgx} $NPGX)`);

  return NextResponse.json({
    success: true,
    stake_id: stake.id,
    message: `Staked ${amount_npgx} $NPGX. Complete KYC to claim dividends.`,
  });
}

/**
 * UNSTAKE: Unlock and remove a $NPGX staking position
 */
async function handleUnstake(supabase: any, body: StakingRequest) {
  const { user_handle, stake_id } = body;

  if (!stake_id) {
    return NextResponse.json({ error: 'stake_id is required' }, { status: 400 });
  }

  // Verify ownership
  const { data: stake, error: fetchError } = await supabase
    .from('npgx_stakes')
    .select('id, user_handle, status, amount_npgx')
    .eq('id', stake_id)
    .maybeSingle();

  if (fetchError || !stake) {
    return NextResponse.json({ error: 'Stake not found' }, { status: 404 });
  }

  if (stake.user_handle !== user_handle) {
    return NextResponse.json({ error: 'Unauthorized: not your stake' }, { status: 403 });
  }

  if (stake.status !== 'active') {
    return NextResponse.json(
      { error: `Cannot unstake: stake status is "${stake.status}"` },
      { status: 400 }
    );
  }

  // Mark as unstaked
  const { error: updateError } = await supabase
    .from('npgx_stakes')
    .update({
      status: 'unstaked',
      unstaked_at: new Date().toISOString(),
    })
    .eq('id', stake_id);

  if (updateError) {
    console.error('[staking/unstake] Update failed:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Update member summary
  await supabase.rpc('update_npgx_member_staking_summary', {
    p_user_handle: user_handle,
  });

  console.log(`[staking/unstake] Unstaked: ${stake_id} for ${user_handle} (${stake.amount_npgx} $NPGX)`);

  return NextResponse.json({
    success: true,
    message: `Unstaked ${stake.amount_npgx} $NPGX. Future dividends will not be allocated to this stake.`,
  });
}

/**
 * CLAIM DIVIDENDS: Claim pending dividends (KYC required)
 */
async function handleClaimDividends(supabase: any, body: StakingRequest) {
  const { user_handle, bsv_address } = body;

  // Check KYC status
  const { data: member, error: memberError } = await supabase
    .from('npgx_members')
    .select('id, kyc_status, bsv_address')
    .eq('user_handle', user_handle)
    .maybeSingle();

  if (!member) {
    console.warn(`[staking/claim] Member not found: ${user_handle}`, memberError);
    return NextResponse.json({ error: 'Member not found. Please stake first.' }, { status: 404 });
  }

  if (member.kyc_status !== 'verified') {
    return NextResponse.json(
      {
        error: `Cannot claim dividends: KYC status is "${member.kyc_status}". Complete Veriff verification first.`,
        kyc_status: member.kyc_status,
      },
      { status: 403 }
    );
  }

  const payment_address = bsv_address || member.bsv_address;
  if (!payment_address) {
    return NextResponse.json(
      { error: 'No BSV address registered. Please provide bsv_address.' },
      { status: 400 }
    );
  }

  // Find unclaimed allocations
  const { data: allocations } = await supabase
    .from('npgx_dividend_allocations')
    .select('id, amount_allocated_sat, payment_status')
    .eq('user_handle', user_handle)
    .eq('payment_status', 'pending');

  if (!allocations || allocations.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No pending dividends to claim.',
      pending_amount_sat: 0,
    });
  }

  const total_pending = allocations.reduce((sum: number, a: any) => sum + a.amount_allocated_sat, 0);

  // Create claim records (actual payment is handled by admin/cron)
  for (const allocation of allocations) {
    await supabase.from('npgx_dividend_claims').insert({
      allocation_id: allocation.id,
      user_handle,
      status: 'pending',
      claimed_at: new Date().toISOString(),
    });
  }

  console.log(
    `[staking/claim] ${allocations.length} dividend allocations claimed for ${user_handle} (${total_pending} sats)`
  );

  // Send claim confirmation email
  try {
    const { data: memberData } = await supabase
      .from('npgx_members')
      .select('email, email_notifications_enabled')
      .eq('user_handle', user_handle)
      .maybeSingle();

    if (memberData?.email && memberData?.email_notifications_enabled !== false) {
      const btc = (total_pending / 100000000).toFixed(8);
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; }
              .container { padding: 20px; background: #0a0a0a; }
              .card { background: #1a1a1a; border-radius: 8px; padding: 30px; border: 1px solid #333; }
              h2 { color: #ef4444; margin-top: 0; }
              p { color: #d1d5db; }
              strong { color: #f5f5f5; }
              .amount { font-size: 32px; font-weight: bold; color: #22c55e; margin: 20px 0; }
              .status { font-size: 12px; padding: 4px 8px; border-radius: 4px; background: #422006; color: #fbbf24; }
              .footer { font-size: 12px; color: #6b7280; margin-top: 30px; border-top: 1px solid #333; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <h2>Dividend Claim Submitted</h2>
                <p>Hi <strong>${user_handle}</strong>,</p>
                <p>Your dividend claim has been submitted and is being processed:</p>
                <div class="amount">${btc} BSV</div>
                <p><strong>To:</strong> ${payment_address}</p>
                <p>Status: <span class="status">PENDING PAYMENT</span></p>
                <p>Your dividend will be sent to the address above within 24 hours. You'll receive a confirmation email when the payment is complete.</p>
                <div class="footer">
                  <p>NPGX Staking System</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      await sendEmail({
        to: memberData.email,
        subject: `Dividend Claim Submitted -- ${btc} BSV`,
        html,
      });
      console.log(`[staking/claim] Sent claim confirmation email to ${memberData.email}`);
    }
  } catch (emailErr) {
    const emailMsg = emailErr instanceof Error ? emailErr.message : 'Email send failed';
    console.warn(`[staking/claim] Email notification error (non-fatal): ${emailMsg}`);
  }

  return NextResponse.json({
    success: true,
    message: `Claimed ${allocations.length} dividend allocation(s). Will be sent to ${payment_address} shortly.`,
    pending_amount_sat: total_pending,
    allocation_count: allocations.length,
  });
}

/**
 * GET /api/staking
 * Retrieve staking status for the user
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const user_handle = url.searchParams.get('user_handle');

    if (!user_handle) {
      return NextResponse.json({ error: 'user_handle query parameter is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get member info
    const { data: member } = await supabase
      .from('npgx_members')
      .select('*')
      .eq('user_handle', user_handle)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get stakes
    const { data: stakes } = await supabase
      .from('npgx_stakes')
      .select('*')
      .eq('user_handle', user_handle)
      .order('staked_at', { ascending: false });

    // Get pending allocations
    const { data: pending_allocations } = await supabase
      .from('npgx_dividend_allocations')
      .select('*')
      .eq('user_handle', user_handle)
      .eq('payment_status', 'pending');

    return NextResponse.json({
      user_handle,
      member,
      stakes: stakes || [],
      pending_dividends_sat: (pending_allocations || []).reduce((sum, a) => sum + a.amount_allocated_sat, 0),
      pending_allocations_count: (pending_allocations || []).length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch staking status';
    console.error('[staking/GET] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
