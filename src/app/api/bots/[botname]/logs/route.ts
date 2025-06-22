import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csvtojson from 'csvtojson';

// Helper function to get the log file path
function getLogFilePath(botName: string): string {
  const scriptDir = path.join(process.cwd(), 'bots', botName);
  return path.join(scriptDir, 'logs', 'logs.csv');
}

// GET function to return all logs for a bot
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ botName: string }> }
) {
  const params = await context.params;
  const { botName } = params;

  // Validate bot name
  if (!botName || !['chatgpt', 'perplexity'].includes(botName)) {
    return NextResponse.json({ error: 'Invalid bot name' }, { status: 400 });
  }

  const logFilePath = getLogFilePath(botName);

  if (!fs.existsSync(logFilePath)) {
     // Return an empty array and 200 status if file not found, as it's not an error
    return NextResponse.json([], { status: 200 });
  }

  try {
    const logs = await csvtojson().fromFile(logFilePath);
    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error(`Error reading log file ${logFilePath}:`, error);
    return NextResponse.json({ error: 'Error reading log file' }, { status: 500 });
  }
}

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

  // Path to CSV file - using helper function now
  const logFilePath  = getLogFilePath(botName);

  if (!fs.existsSync(logFilePath)) {
    // Also return 404 for POST if file not found, as a time range on a non-existent file is invalid
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

  return NextResponse.json({ logs: filteredLogs }, { status: 200 });
}