import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ botName: string }> }
) {
  const params = await context.params;
  const { botName } = params;

  // Validate bot name
  if (!botName || !['chatgpt', 'perplexity'].includes(botName)) {
    return NextResponse.json({ error: 'Invalid bot name' }, { status: 400 });
  }

  let startTime: string | number | Date;
  let endTime: string | number | Date;

  try {
    const body = await req.json();
    startTime = body.startTime;
    endTime = body.endTime;
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!startTime || !endTime) {
    return NextResponse.json({ error: 'Missing start or end time' }, { status: 400 });
  }

  // Path to CSV file
  const logFilePath = path.join(
    process.cwd(),
    'src',
    'app',
    'api',
    'bots',
    botName,
    'logs',
    'logs.csv'
  );

  if (!fs.existsSync(logFilePath)) {
    return NextResponse.json({ error: 'Log file not found' }, { status: 404 });
  }

  // Read CSV
  const data = fs.readFileSync(logFilePath, 'utf-8');
  const lines = data.split('\n').filter(Boolean);
  const headers = lines[0].split(',');
  const rows = lines.slice(1);

  // Parse and filter logs by timestamp
  const filteredLogs = rows
    .map((row) => {
      const values = row.split(',');
      const timestamp = values[0];

      if (!timestamp) return null;

      const time = new Date(timestamp).getTime();
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();

      if (time >= start && time <= end) {
        return headers.reduce((acc, header, index) => {
          acc[header] = values[index];
          return acc;
        }, {} as Record<string, string>);
      }

      return null;
    })
    .filter(Boolean);

  return NextResponse.json({ logs: filteredLogs });
}