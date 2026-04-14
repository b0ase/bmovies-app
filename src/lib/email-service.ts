/**
 * NPGX Email Service
 * Resend (resend.com) email sending for staking notifications
 *
 * Environment variables:
 * - RESEND_API_KEY: API key from Resend dashboard
 * - EMAIL_FROM: Sender email (e.g., notifications@npgx.website)
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'notifications@npgx.website';
const RESEND_API_URL = 'https://api.resend.com/emails';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  reply_to?: string;
}

export interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send email via Resend
 */
export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, logging instead');
    console.log('[Email] Would send:', payload);
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.reply_to,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Email] Resend API error:', error);
      return { success: false, error };
    }

    const data = (await response.json()) as { id: string };
    console.log(`[Email] Sent to ${payload.to}, ID: ${data.id}`);
    return { success: true, id: data.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Send failed:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Email template: KYC Verification Approved
 */
export function renderKycApprovedEmail(user_handle: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; }
          .container { padding: 20px; background: #0a0a0a; }
          .card { background: #1a1a1a; border-radius: 8px; padding: 30px; border: 1px solid #333; }
          h2 { color: #ef4444; margin-top: 0; }
          p, li { color: #d1d5db; }
          strong { color: #f5f5f5; }
          .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; font-weight: bold; }
          .footer { font-size: 12px; color: #6b7280; margin-top: 30px; border-top: 1px solid #333; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h2>Identity Verification Complete</h2>
            <p>Hi <strong>${user_handle}</strong>,</p>
            <p>Your KYC verification with Veriff has been approved!</p>
            <p>You are now eligible to:</p>
            <ul>
              <li>Receive dividend payments on your $NPGX stakes</li>
              <li>Claim pending dividend allocations</li>
              <li>Participate in governance</li>
            </ul>
            <a href="https://npgx.website/staking?user_handle=${user_handle}" class="button">View Your Dashboard</a>
            <div class="footer">
              <p>Questions? Visit the <a href="https://npgx.website/staking" style="color: #ef4444;">Staking Guide</a></p>
              <p>NPGX Staking System</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Email template: Dividend Allocated
 */
export function renderDividendAllocatedEmail(
  user_handle: string,
  amount_btc: string,
  batch_id: string
): string {
  return `
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
          .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; font-weight: bold; }
          .footer { font-size: 12px; color: #6b7280; margin-top: 30px; border-top: 1px solid #333; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h2>Dividend Allocation Confirmed</h2>
            <p>Hi <strong>${user_handle}</strong>,</p>
            <p>A dividend allocation has been calculated for your staked $NPGX:</p>
            <div class="amount">${amount_btc} BSV</div>
            <p><strong>Batch ID:</strong> ${batch_id}</p>
            <p>This allocation is pending distribution. You'll be notified when payment is sent to your registered address.</p>
            <a href="https://npgx.website/staking?user_handle=${user_handle}" class="button">View Details</a>
            <div class="footer">
              <p>NPGX Staking System</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Email template: Dividend Payment Sent
 */
export function renderDividendPaidEmail(
  user_handle: string,
  amount_btc: string,
  bsv_address: string,
  txid: string
): string {
  const explorer_url = `https://whatsonchain.com/tx/${txid}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; }
          .container { padding: 20px; background: #0a0a0a; }
          .card { background: #1a1a1a; border-radius: 8px; padding: 30px; border: 1px solid #333; }
          h2 { color: #22c55e; margin-top: 0; }
          p { color: #d1d5db; }
          strong { color: #f5f5f5; }
          .amount { font-size: 32px; font-weight: bold; color: #22c55e; margin: 20px 0; }
          .details { background: #111; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: monospace; font-size: 12px; color: #d1d5db; border: 1px solid #333; }
          .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; font-weight: bold; }
          .footer { font-size: 12px; color: #6b7280; margin-top: 30px; border-top: 1px solid #333; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h2>Dividend Payment Received!</h2>
            <p>Hi <strong>${user_handle}</strong>,</p>
            <p>Your dividend has been sent:</p>
            <div class="amount">${amount_btc} BSV</div>
            <div class="details">
              <p><strong>To:</strong> ${bsv_address}</p>
              <p><strong>TX ID:</strong> ${txid}</p>
            </div>
            <p>Check the blockchain for confirmation details:</p>
            <a href="${explorer_url}" class="button">View on Chain</a>
            <div class="footer">
              <p>NPGX Staking System</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Email template: KYC Declined
 */
export function renderKycDeclinedEmail(user_handle: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; }
          .container { padding: 20px; background: #0a0a0a; }
          .card { background: #1a1a1a; border-radius: 8px; padding: 30px; border: 1px solid #333; }
          h2 { color: #f59e0b; margin-top: 0; }
          p, li { color: #d1d5db; }
          strong { color: #f5f5f5; }
          .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; font-weight: bold; }
          .footer { font-size: 12px; color: #6b7280; margin-top: 30px; border-top: 1px solid #333; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h2>KYC Verification -- Please Try Again</h2>
            <p>Hi <strong>${user_handle}</strong>,</p>
            <p>Your KYC verification with Veriff was not approved on the first attempt.</p>
            <p>You can try again with different documents or contact support for assistance.</p>
            <a href="https://npgx.website/staking?user_handle=${user_handle}" class="button">Retry Verification</a>
            <div class="footer">
              <p>NPGX Staking System</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
