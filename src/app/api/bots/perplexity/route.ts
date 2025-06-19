// src/app/api/bots/perplexity/route.ts
import * as path from 'path';
import { Workbook } from 'exceljs';
import { promises as fs } from 'fs';

async function loadRows() {
  // 1) Read the existing pivot Excel from disk
  const xlsxPath = path.join(
    process.cwd(),
    'src',
    'app',
    'api',
    'bots',
    'perplexity',
    'prompt_analysis.xlsx'
  );
  const wb = new Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.worksheets[0];

  // 2) Extract each row into a JS array
  const rows: Array<{
    prompt: string;
    No: number;
    Yes: number;
    Total: number;
    EOXS_Percentage: number;
  }> = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // skip header
    const [ , p, n, y, t, pct ] = row.values as any[];
    rows.push({
      prompt: String(p),
      No: Number(n),
      Yes: Number(y),
      Total: Number(t),
      EOXS_Percentage: Number(pct),
    });
  });

  // 3) Compute Grand Totals
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

  return rows;
}

export async function GET() {
  // 1) Load and augment the data
  const data = await loadRows();

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
  outWs.columns.forEach((col) => {
    let max = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > max) max = len;
    });
    col.width = max + 2;
  });

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
}
