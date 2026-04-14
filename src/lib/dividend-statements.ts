/**
 * Dividend Statement Generation
 * Creates PDF reports of dividend history for users
 */

import { createAdminClient } from './supabase-admin';

export interface DividendRecord {
  batch_id: string;
  amount_sat: number;
  allocation_date: string;
  payment_date?: string;
  txid?: string;
  status: 'pending' | 'sent' | 'confirmed' | 'failed';
}

export interface DividendStatement {
  user_handle: string;
  generated_at: string;
  period_start: string;
  period_end: string;
  total_staked: number;
  total_dividends_received: number;
  total_dividends_pending: number;
  records: DividendRecord[];
  summary: {
    distributions_received: number;
    average_distribution: number;
    earliest_distribution: string;
    latest_distribution: string;
  };
}

/**
 * Fetch dividend statement data for user
 */
export async function generateDividendStatement(
  user_handle: string,
  start_date?: Date,
  end_date?: Date
): Promise<DividendStatement | null> {
  const supabase = createAdminClient();

  // Get member data
  const { data: member } = await supabase
    .from('npgx_members')
    .select('total_npgx_staked, total_dividends_received_sat')
    .eq('user_handle', user_handle)
    .maybeSingle();

  if (!member) {
    return null;
  }

  // Get pending allocations
  const { data: pending_allocations } = await supabase
    .from('npgx_dividend_allocations')
    .select('amount_allocated_sat')
    .eq('user_handle', user_handle)
    .eq('payment_status', 'pending');

  const pending_total = (pending_allocations || []).reduce(
    (sum, a) => sum + a.amount_allocated_sat,
    0
  );

  // Get paid allocations
  let query = supabase
    .from('npgx_dividend_allocations')
    .select(
      `
      amount_allocated_sat,
      payment_txid,
      payment_sent_at,
      npgx_dividend_distributions (
        batch_id,
        created_at
      )
    `
    )
    .eq('user_handle', user_handle)
    .eq('payment_status', 'sent')
    .order('payment_sent_at', { ascending: false });

  if (start_date) {
    query = query.gte('payment_sent_at', start_date.toISOString());
  }

  if (end_date) {
    query = query.lte('payment_sent_at', end_date.toISOString());
  }

  const { data: paid_allocations } = await query;

  // Build records
  const records: DividendRecord[] = (paid_allocations || []).map((alloc: any) => ({
    batch_id: alloc.npgx_dividend_distributions?.batch_id || 'unknown',
    amount_sat: alloc.amount_allocated_sat,
    allocation_date: alloc.npgx_dividend_distributions?.created_at || '',
    payment_date: alloc.payment_sent_at,
    txid: alloc.payment_txid,
    status: 'sent',
  }));

  const startDate = start_date || new Date(new Date().getFullYear(), 0, 1);
  const endDate = end_date || new Date();

  const statement: DividendStatement = {
    user_handle,
    generated_at: new Date().toISOString(),
    period_start: startDate.toISOString().split('T')[0],
    period_end: endDate.toISOString().split('T')[0],
    total_staked: member.total_npgx_staked,
    total_dividends_received: member.total_dividends_received_sat,
    total_dividends_pending: pending_total,
    records,
    summary: {
      distributions_received: records.length,
      average_distribution:
        records.length > 0
          ? Math.round(records.reduce((sum, r) => sum + r.amount_sat, 0) / records.length)
          : 0,
      earliest_distribution: records.length > 0 ? records[records.length - 1].allocation_date : '',
      latest_distribution: records.length > 0 ? records[0].payment_date || '' : '',
    },
  };

  return statement;
}

/**
 * Render dividend statement as HTML (for PDF conversion)
 */
export function renderDividendStatementHTML(statement: DividendStatement): string {
  const formatBtc = (sats: number) => (sats / 100000000).toFixed(8);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();
  const formatNpgx = (amount: number) => (amount / 1e6).toFixed(2);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #e5e7eb; background: #0a0a0a; }
          .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
          header { border-bottom: 2px solid #ef4444; padding-bottom: 20px; margin-bottom: 30px; }
          h1 { font-size: 28px; color: #ef4444; margin-bottom: 5px; }
          .meta { font-size: 12px; color: #9ca3af; }
          .section { margin-bottom: 30px; }
          .section h2 { font-size: 18px; margin-bottom: 15px; color: #f5f5f5; border-bottom: 1px solid #333; padding-bottom: 10px; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px; }
          .summary-card { background: #1a1a1a; padding: 15px; border-radius: 6px; border: 1px solid #333; }
          .summary-card .label { font-size: 12px; color: #9ca3af; text-transform: uppercase; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #ef4444; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1a1a1a; padding: 12px; text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #9ca3af; }
          td { padding: 12px; border-bottom: 1px solid #333; }
          tr:last-child td { border-bottom: none; }
          .amount { text-align: right; font-family: monospace; }
          .status { font-size: 12px; padding: 4px 8px; border-radius: 4px; background: #166534; color: #86efac; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>NPGX Dividend Statement</h1>
            <div class="meta">
              <p><strong>User:</strong> ${statement.user_handle}</p>
              <p><strong>Period:</strong> ${statement.period_start} to ${statement.period_end}</p>
              <p><strong>Generated:</strong> ${formatDate(statement.generated_at)}</p>
            </div>
          </header>

          <div class="section">
            <h2>Summary</h2>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="label">Total $NPGX Staked</div>
                <div class="value">${formatNpgx(statement.total_staked)}M</div>
              </div>
              <div class="summary-card">
                <div class="label">Dividends Received</div>
                <div class="value">${formatBtc(statement.total_dividends_received)} BSV</div>
              </div>
              <div class="summary-card">
                <div class="label">Pending Dividends</div>
                <div class="value">${formatBtc(statement.total_dividends_pending)} BSV</div>
              </div>
              <div class="summary-card">
                <div class="label">Distributions Received</div>
                <div class="value">${statement.summary.distributions_received}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Dividend Distribution History</h2>
            <table>
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Amount</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${statement.records
                  .map(
                    (record) => `
                  <tr>
                    <td>${record.batch_id}</td>
                    <td class="amount">${formatBtc(record.amount_sat)} BSV</td>
                    <td>${record.payment_date ? formatDate(record.payment_date) : '--'}</td>
                    <td><span class="status">${record.status}</span></td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p><strong>NPGX Staking System</strong></p>
            <p>This statement is generated automatically from on-chain records. For questions, visit npgx.website/staking</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Render dividend statement as CSV (for spreadsheet imports)
 */
export function renderDividendStatementCSV(statement: DividendStatement): string {
  const lines: string[] = [
    `NPGX Dividend Statement - ${statement.user_handle}`,
    `Generated: ${new Date(statement.generated_at).toLocaleString()}`,
    `Period: ${statement.period_start} to ${statement.period_end}`,
    '',
    'SUMMARY',
    `Total $NPGX Staked,${statement.total_staked}`,
    `Total Dividends Received (sats),${statement.total_dividends_received}`,
    `Total Dividends Pending (sats),${statement.total_dividends_pending}`,
    `Distributions Received,${statement.summary.distributions_received}`,
    '',
    'DISTRIBUTION HISTORY',
    'Batch ID,Amount (sats),Allocation Date,Payment Date,Transaction ID,Status',
    ...statement.records.map(
      (r) =>
        `"${r.batch_id}",${r.amount_sat},"${r.allocation_date}","${r.payment_date || ''}","${r.txid || ''}",${r.status}`
    ),
  ];

  return lines.join('\n');
}

/**
 * Create downloadable filename
 */
export function getStatementFilename(user_handle: string, format: 'pdf' | 'csv'): string {
  const date = new Date().toISOString().split('T')[0];
  const extension = format === 'pdf' ? 'pdf' : 'csv';
  return `${user_handle}_npgx_dividend_statement_${date}.${extension}`;
}
