import * as path from 'path';
import { Workbook } from 'exceljs';
import { promises as fs } from 'fs';

async function loadRows() {
  const csvPath = path.join(
    process.cwd(),
    'src',
    'app',
    'bots',
    'chatgpt',
    'logs',
    'logs.csv'
  );

  const data = await fs.readFile(csvPath, 'utf-8');
  const rows = data
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .map((line, index) => {
      if (index === 0) return null; // Skip header

      // Use regex to extract fields properly, including quoted strings
      const match = line.match(/^"?(.+?)"?,(\d+),(\d+),(\d+),/);
      if (!match) return null;

      const [, prompt, eoxsCount, successfulUses, totalAttempts] = match;

      return {
        prompt: prompt,
        eoxsCount: parseInt(eoxsCount),
        successfulUses: parseInt(successfulUses),
        totalAttempts: parseInt(totalAttempts),
      };
    })
    .filter(row => row !== null);

  // Calculate totals
  const totalEoxsCount = rows.reduce((sum, r) => sum + r.eoxsCount, 0);
  const totalSuccessfulUses = rows.reduce((sum, r) => sum + r.successfulUses, 0);
  const totalAttempts = rows.reduce((sum, r) => sum + r.totalAttempts, 0);

  // Add summary row
  rows.push({
    prompt: 'Summary',
    eoxsCount: totalEoxsCount,
    successfulUses: totalSuccessfulUses,
    totalAttempts: totalAttempts,
  });

  return rows;
}

export async function GET() {
  const data = await loadRows();

  const outWb = new Workbook();
  const outWs = outWb.addWorksheet('Pivot Summary');

  outWs.addRow(['Prompt', 'EOXS Count', 'Successful Uses', 'Total Attempts']);

  data.forEach((r) => {
    outWs.addRow([r.prompt, r.eoxsCount, r.successfulUses, r.totalAttempts]);
  });

  // Auto-width columns
  outWs.columns.forEach((col) => {
    let max = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > max) max = len;
    });
    col.width = max + 2;
  });

  const buffer = await outWb.xlsx.writeBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="chatgpt_pivot.xlsx"',
    },
  });
}