import { promises as fs } from 'fs';
import * as path from 'path';
import { read, utils } from 'xlsx';

export async function POST() {
  try {
    const filePath = path.join(
      process.cwd(),
      'src',
      'app',
      'api',
      'bots',
      'perplexity',
      'prompt_analysis.xlsx'
    );

    const buffer = await fs.readFile(filePath);
    const workbook = read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = utils.sheet_to_json(worksheet);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to read prompt_analysis.xlsx',
        message: (error as Error).message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}