/**
 * CRON: Automated Dividend Distribution
 * GET /api/cron/dividends
 *
 * Runs on schedule (via Vercel Cron) to:
 * 1. Check for pending distributions
 * 2. Calculate allocations for new revenue
 * 3. Send BSV to verified stakers
 *
 * Requires: CRON_SECRET for authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendEmail, renderDividendAllocatedEmail } from '@/lib/email-service';

const CRON_SECRET = process.env.CRON_SECRET || '';

/**
 * Verify cron authorization
 * Vercel sends 'Authorization: Bearer <cron secret>' header
 */
function verifyCronAuth(request: NextRequest): boolean {
  if (!CRON_SECRET) {
    console.warn('[cron/dividends] CRON_SECRET not configured');
    return false;
  }

  const authHeader = request.headers.get('authorization') || '';
  const expected = `Bearer ${CRON_SECRET}`;
  return authHeader === expected;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron authorization
    if (!verifyCronAuth(request)) {
      console.error('[cron/dividends] Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    console.log('[cron/dividends] Starting dividend distribution check...');

    // 1. Check for pending revenue in pool
    const { data: pendingRevenue, error: revenueError } = await supabase
      .from('npgx_revenue_pool')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (revenueError) {
      throw new Error(`Failed to fetch pending revenue: ${revenueError.message}`);
    }

    if (!pendingRevenue || pendingRevenue.length === 0) {
      console.log('[cron/dividends] No pending revenue to distribute');
      return NextResponse.json({
        status: 'success',
        message: 'No pending revenue',
        distributions_processed: 0,
      });
    }

    console.log(`[cron/dividends] Found ${pendingRevenue.length} pending revenue record(s)`);

    let distributions_processed = 0;
    const results: any[] = [];

    // 2. For each pending revenue, create distribution and allocations
    for (const revenue of pendingRevenue) {
      try {
        const batch_id = `dividend-${new Date().toISOString().split('T')[0]}-${revenue.id.slice(0, 8)}`;

        console.log(`[cron/dividends] Processing revenue: ${revenue.id} -> batch ${batch_id}`);

        // Create distribution record
        const { data: distribution, error: distError } = await supabase
          .from('npgx_dividend_distributions')
          .insert({
            batch_id,
            batch_number: 1,
            source_amount_sat: revenue.amount_sat,
            source_reference: revenue.source_reference || `revenue-${revenue.id.slice(0, 8)}`,
            snapshot_timestamp: new Date().toISOString(),
            status: 'calculated',
          })
          .select()
          .single();

        if (distError) {
          console.error(`[cron/dividends] Distribution creation failed: ${distError.message}`);
          results.push({
            revenue_id: revenue.id,
            status: 'failed',
            error: distError.message,
          });
          continue;
        }

        console.log(`[cron/dividends] Created distribution: ${distribution.id}`);

        // Call RPC to calculate allocations
        const { data: allocation_result, error: rpcError } = await supabase.rpc(
          'calculate_npgx_dividend_allocations',
          {
            p_distribution_id: distribution.id,
            p_source_amount_sat: revenue.amount_sat,
          }
        );

        if (rpcError) {
          console.error(`[cron/dividends] RPC calculation failed: ${rpcError.message}`);
          results.push({
            revenue_id: revenue.id,
            distribution_id: distribution.id,
            status: 'failed',
            error: rpcError.message,
          });
          continue;
        }

        const { allocation_count, total_distributed_sat } = allocation_result[0] || {
          allocation_count: 0,
          total_distributed_sat: 0,
        };

        // Update distribution with results
        const { error: updateError } = await supabase
          .from('npgx_dividend_distributions')
          .update({
            total_recipients: allocation_count,
            total_distributed_sat,
            undistributed_sat: revenue.amount_sat - total_distributed_sat,
            updated_at: new Date().toISOString(),
          })
          .eq('id', distribution.id);

        if (updateError) {
          console.error(`[cron/dividends] Update distribution failed: ${updateError.message}`);
        }

        // Mark revenue as allocated
        await supabase
          .from('npgx_revenue_pool')
          .update({
            status: 'allocated',
            allocated_to_distribution_id: distribution.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', revenue.id);

        console.log(
          `[cron/dividends] Distribution complete: ${allocation_count} allocations, ${total_distributed_sat} sats`
        );

        // Send allocation notification emails
        try {
          const { data: allocations } = await supabase
            .from('npgx_dividend_allocations')
            .select('user_handle, amount_allocated_sat')
            .eq('distribution_id', distribution.id)
            .limit(100);

          if (allocations) {
            for (const alloc of allocations) {
              const { data: member } = await supabase
                .from('npgx_members')
                .select('email, email_notifications_enabled')
                .eq('user_handle', alloc.user_handle)
                .maybeSingle();

              if (
                member?.email &&
                member?.email_notifications_enabled !== false
              ) {
                const btc = (alloc.amount_allocated_sat / 100000000).toFixed(8);
                const html = renderDividendAllocatedEmail(
                  alloc.user_handle,
                  btc,
                  batch_id
                );
                await sendEmail({
                  to: member.email,
                  subject: `Dividend Allocation Confirmed -- ${btc} BSV`,
                  html,
                });
                console.log(
                  `[cron/dividends] Sent allocation email to ${member.email}`
                );
              }
            }
          }
        } catch (emailErr) {
          const emailMsg =
            emailErr instanceof Error ? emailErr.message : 'Email send failed';
          console.warn(
            `[cron/dividends] Email notification error (non-fatal): ${emailMsg}`
          );
        }

        results.push({
          revenue_id: revenue.id,
          distribution_id: distribution.id,
          status: 'success',
          allocation_count,
          total_distributed_sat,
        });

        distributions_processed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[cron/dividends] Error processing revenue ${revenue.id}: ${message}`);
        results.push({
          revenue_id: revenue.id,
          status: 'failed',
          error: message,
        });
      }
    }

    console.log(
      `[cron/dividends] Dividend distribution check complete: ${distributions_processed} distributions processed`
    );

    return NextResponse.json({
      status: 'success',
      message: `Processed ${distributions_processed} dividend distribution(s)`,
      distributions_processed,
      results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron/dividends] Fatal error:', msg);
    return NextResponse.json(
      {
        status: 'error',
        error: msg,
      },
      { status: 500 }
    );
  }
}
