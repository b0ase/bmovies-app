/**
 * POST /api/staking/kyc/veriff/webhook
 * Receives Veriff decision webhook
 * Updates member KYC status and flags eligibility for dividend claims
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendEmail, renderKycApprovedEmail, renderKycDeclinedEmail } from '@/lib/email-service';

const VERIFF_WEBHOOK_SECRET = process.env.VERIFF_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify HMAC signature
    if (VERIFF_WEBHOOK_SECRET) {
      const signature = request.headers.get('x-hmac-signature') || '';
      const expected = createHmac('sha256', VERIFF_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (signature.toLowerCase() !== expected.toLowerCase()) {
        console.error('[staking-kyc-webhook] HMAC mismatch');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const verification = payload.verification;

    if (!verification?.id || !verification?.status) {
      console.warn('[staking-kyc-webhook] Missing verification data');
      return NextResponse.json({ ok: true });
    }

    const sessionId = verification.id;
    const status = verification.status;

    console.log(`[staking-kyc-webhook] Decision: session=${sessionId} status=${status}`);

    const supabase = createAdminClient();

    // Look up our session record
    const { data: session } = await supabase
      .from('npgx_kyc_sessions')
      .select('id, user_handle, status')
      .eq('veriff_session_id', sessionId)
      .maybeSingle();

    if (!session) {
      console.warn(`[staking-kyc-webhook] Unknown session: ${sessionId}`);
      return NextResponse.json({ ok: true });
    }

    // Already processed
    if (session.status === 'approved') {
      return NextResponse.json({ ok: true });
    }

    // Scrub sensitive data
    const safePayload = {
      status,
      person: verification.person
        ? {
            firstName: verification.person.firstName,
            lastName: verification.person.lastName,
            dateOfBirth: verification.person.dateOfBirth,
          }
        : null,
      document: verification.document
        ? {
            type: verification.document.type,
            country: verification.document.country,
            numberSuffix: verification.document.number
              ? verification.document.number.slice(-4)
              : null,
          }
        : null,
      decisionTime: new Date().toISOString(),
    };

    // Update session
    await supabase
      .from('npgx_kyc_sessions')
      .update({
        status,
        decision_payload: safePayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (status === 'approved') {
      // Update member KYC status
      const { error: updateError } = await supabase
        .from('npgx_members')
        .update({
          kyc_status: 'verified',
          kyc_provider: 'veriff',
          kyc_session_id: sessionId,
          kyc_verified_at: new Date().toISOString(),
          first_name: safePayload.person?.firstName,
          last_name: safePayload.person?.lastName,
          date_of_birth: safePayload.person?.dateOfBirth,
          document_type: safePayload.document?.type,
          document_country: safePayload.document?.country,
        })
        .eq('user_handle', session.user_handle);

      if (updateError) {
        console.error('[staking-kyc-webhook] Failed to update member:', updateError);
      } else {
        console.log(
          `[staking-kyc-webhook] KYC approved for ${session.user_handle} -- now eligible for dividend claims`
        );

        // Send KYC approval email
        const { data: member } = await supabase
          .from('npgx_members')
          .select('email')
          .eq('user_handle', session.user_handle)
          .maybeSingle();

        if (member?.email) {
          const html = renderKycApprovedEmail(session.user_handle);
          await sendEmail({
            to: member.email,
            subject: 'Identity Verification Complete -- NPGX Staking',
            html,
          });
          console.log(`[staking-kyc-webhook] Sent approval email to ${member.email}`);
        }
      }
    } else if (status === 'declined') {
      await supabase
        .from('npgx_members')
        .update({
          kyc_status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('user_handle', session.user_handle);

      console.log(`[staking-kyc-webhook] KYC declined for ${session.user_handle}`);

      // Send KYC decline email
      const { data: member } = await supabase
        .from('npgx_members')
        .select('email')
        .eq('user_handle', session.user_handle)
        .maybeSingle();

      if (member?.email) {
        const html = renderKycDeclinedEmail(session.user_handle);
        await sendEmail({
          to: member.email,
          subject: 'KYC Verification -- Please Try Again',
          html,
        });
        console.log(`[staking-kyc-webhook] Sent decline email to ${member.email}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Webhook processing failed';
    console.error('[staking-kyc-webhook] Error:', msg);
    // Always return 200 to prevent Veriff retries on our errors
    return NextResponse.json({ ok: true });
  }
}
