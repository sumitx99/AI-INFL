// src/app/api/bots/perplexity/summary/route.ts

import * as path from 'path';
import { promises as fs } from 'fs';
import { Workbook } from 'exceljs';

export async function GET() {
  try {
    // 1) Locate the Excel pivot file
    const xlsxPath = path.join(
      process.cwd(),
      'src',
      'app',
      'bots',
      'perplexity',
      'prompt_analysis.xlsx'
    );
    console.log('🔍 summary reading Excel:', xlsxPath);

    // 2) Load via ExcelJS
    const workbook = new Workbook();
    await workbook.xlsx.readFile(xlsxPath);
    const ws = workbook.worksheets[0];

    // 3) Read header row
    const headerRow = ws.getRow(1).values as Array<string | undefined>;
    // ExcelJS rows are 1-based; .values[0] is unused
    const [ , c1, c2, c3, c4, c5 ] = headerRow;
    console.log('📑 Detected headers:', c1, c2, c3, c4, c5);

    // 4) Validate exactly these column names
    if (
      c1 !== 'prompt' ||
      c2 !== 'No' ||
      c3 !== 'Yes' ||
      c4 !== 'Total' ||
      c5 !== 'EOXS_Percentage'
    ) {
      throw new Error(
        `Unexpected headers: ${[c1, c2, c3, c4, c5].join(', ')}`
      );
    }

    // 5) Extract data rows
    const rows: Array<{
      prompt: string;
      No: number;
      Yes: number;
      Total: number;
      EOXS_Percentage: number;
    }> = [];
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // skip header
      const [ , prompt, No, Yes, Total, EOXS ] = row.values as any[];
      rows.push({
        prompt: String(prompt),
        No: Number(No),
        Yes: Number(Yes),
        Total: Number(Total),
        EOXS_Percentage: Number(EOXS),
      });
    });

    // 6) Build CSV text
    const outLines = [
      ['prompt', 'No', 'Yes', 'Total', 'EOXS_Percentage'],
      ...rows.map(r => [
        `"${r.prompt.replace(/"/g, '""')}"`,
        r.No.toString(),
        r.Yes.toString(),
        r.Total.toString(),
        r.EOXS_Percentage.toString(),
      ]),
    ].map(cols => cols.join(','));
    const csv = outLines.join('\r\n');

    // 7) Return CSV download
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="pivot_summary.csv"',
      },
    });
  } catch (err) {
    console.error('❌ summary error:', err);
    const msg = (err as Error).message;
    return new Response(`Error generating CSV: ${msg}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}