/**
 * GET /api/staking/statements
 * Download dividend statement as PDF or CSV
 *
 * Query params:
 * - user_handle: required
 * - format: 'pdf' | 'csv' (default: csv)
 * - start_date: optional (YYYY-MM-DD)
 * - end_date: optional (YYYY-MM-DD)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDividendStatement, renderDividendStatementHTML, renderDividendStatementCSV, getStatementFilename } from '@/lib/dividend-statements';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const user_handle = url.searchParams.get('user_handle');
    const format = (url.searchParams.get('format') || 'csv') as 'pdf' | 'csv';
    const start_date_str = url.searchParams.get('start_date');
    const end_date_str = url.searchParams.get('end_date');

    if (!user_handle) {
      return NextResponse.json({ error: 'user_handle is required' }, { status: 400 });
    }

    if (!['pdf', 'csv'].includes(format)) {
      return NextResponse.json({ error: 'format must be pdf or csv' }, { status: 400 });
    }

    // Parse dates
    let start_date: Date | undefined;
    let end_date: Date | undefined;

    if (start_date_str) {
      start_date = new Date(start_date_str);
      if (isNaN(start_date.getTime())) {
        return NextResponse.json(
          { error: 'start_date must be YYYY-MM-DD format' },
          { status: 400 }
        );
      }
    }

    if (end_date_str) {
      end_date = new Date(end_date_str);
      if (isNaN(end_date.getTime())) {
        return NextResponse.json(
          { error: 'end_date must be YYYY-MM-DD format' },
          { status: 400 }
        );
      }
    }

    // Generate statement
    const statement = await generateDividendStatement(user_handle, start_date, end_date);

    if (!statement) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`[statements] Generated ${format} for ${user_handle}`);

    // Format based on requested type
    if (format === 'csv') {
      const csv = renderDividendStatementCSV(statement);
      const filename = getStatementFilename(user_handle, 'csv');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === 'pdf') {
      const html = renderDividendStatementHTML(statement);
      const filename = getStatementFilename(user_handle, 'pdf');

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to generate statement';
    console.error('[statements] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
