
import * as path from 'path';
import { Workbook } from 'exceljs';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';

async function loadRows() {
  // 1) Read the existing pivot Excel from disk
  const xlsxPath = path.join(
    process.cwd(),
    'bots',
    'perplexity',
    'prompt_analysis.xlsx'
  );
  const wb = new Workbook();
  
  // Check if the file exists before reading
  try {
    await wb.xlsx.readFile(xlsxPath);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.warn(`[Pivot API] prompt_analysis.xlsx not found at ${xlsxPath}`);
      return []; // Return empty array if file not found
    } else {
      throw error; // Re-throw other errors
    }
  }

  const ws = wb.worksheets[0];

  // 2) Extract each row into a JS array
  const rows: Array<{
    prompt: string;
    No: number;
    Yes: number;
    Total: number;
    EOXS_Percentage: number;
  }> = [];

  if (!ws) {
    console.warn(`[Pivot API] No worksheets found in ${xlsxPath}`);
    return []; // Return empty array if no worksheet
  }

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // skip header
    const [ , p, n, y, t, pct ] = row.values as any[];

    // Basic validation to ensure row has expected number of values
    if (row.values && Array.isArray(row.values) && row.values.length >= 6) {
       rows.push({
        prompt: String(p || ''),
        No: Number(n || 0),
        Yes: Number(y || 0),
        Total: Number(t || 0),
        EOXS_Percentage: Number(pct || 0),
      });
    }
  });

  // 3) Compute Grand Totals (only if there are rows)
  if (rows.length > 0) {
    const grand = rows.reduce(
      (acc, r) => {
        acc.No    += r.No;
        acc.Yes   += r.Yes;
        acc.Total += r.Total;
        return acc;
      },
      { No: 0, Yes: 0, Total: 0 }
    );
    const grandPct = grand.Total > 0
      ? Math.round((grand.Yes / grand.Total) * 100)
      : 0;

    // 4) Append the Grand Total row
    rows.push({
      prompt: 'Grand Total',
      No: grand.No,
      Yes: grand.Yes,
      Total: grand.Total,
      EOXS_Percentage: grandPct,
    });
  }

  return rows;
}

export async function GET() {
  try {
    // 1) Load and augment the data
    const data = await loadRows();

    // If no data, return a 200 with an empty Excel file or a message
    if (data.length === 0 || (data.length === 1 && data[0].prompt === 'Grand Total' && data[0].Total === 0)) {
         console.log('[Pivot API] No data to generate Excel. Returning empty file.');
         const emptyWb = new Workbook();
         emptyWb.addWorksheet('Pivot Summary');
         const emptyBuffer = await emptyWb.xlsx.writeBuffer();

         return new Response(emptyBuffer, {
            status: 200,
            headers: {
              'Content-Type':
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition':
                'attachment; filename="pivot_summary_with_totals.xlsx"',
            },
          });
    }

    // 2) Build a new workbook
    const outWb = new Workbook();
    const outWs = outWb.addWorksheet('Pivot Summary');

    // 3) Add header row
    outWs.addRow(['Prompt', 'No', 'Yes', 'Total', 'EOXS %']);

    // 4) Add data rows
    data.forEach((r) => {
      outWs.addRow([r.prompt, r.No, r.Yes, r.Total, r.EOXS_Percentage]);
    });

    // 5) Auto‐width columns
    if (outWs && outWs.columns) {
        outWs.columns.forEach((col) => {
            let max = 10;
            if (typeof col.eachCell === 'function'){
              col.eachCell({ includeEmpty: true }, (cell) => {
                  const len = String(cell.value ?? '').length;
                  if (len > max) max = len;
              });
            }
            col.width = max + 2;
        });
    }

    // 6) Serialize to a buffer
    const buffer = await outWb.xlsx.writeBuffer();

    // 7) Return it as an .xlsx download
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="pivot_summary_with_totals.xlsx"',
      },
    });

  } catch (error) {
    console.error('[Pivot API] Error generating Excel file:', error);
    return NextResponse.json({ error: 'Failed to generate Excel file' }, { status: 500 });
  }
}
