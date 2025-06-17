import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { LogEntry } from '@/lib/types';

const SESSION_LOGS_PATH = path.join(process.cwd(), 'src', 'app', 'api', 'logs', 'session_logs.json');

// Ensure the logs directory exists
function ensureLogsDir() {
  const dir = path.dirname(SESSION_LOGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Read session logs from file
function readSessionLogs(): LogEntry[] {
  ensureLogsDir();
  if (!fs.existsSync(SESSION_LOGS_PATH)) return [];
  try {
    const content = fs.readFileSync(SESSION_LOGS_PATH, 'utf-8');
    return JSON.parse(content) as LogEntry[];
  } catch {
    return [];
  }
}

// Write session logs to file
function writeSessionLogs(logs: LogEntry[]) {
  ensureLogsDir();
  fs.writeFileSync(SESSION_LOGS_PATH, JSON.stringify(logs, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const logsData = readSessionLogs();
    return NextResponse.json(logsData);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ message: 'Error fetching logs', error: (error as Error).message }, { status: 500 });
  }
}

interface PostRequestBody {
  botType: 'chatgpt' | 'perplexity';
  startTime: number;
  endTime: number;
}

export async function POST(request: NextRequest) {
  try {
    const { botType, startTime, endTime } = (await request.json()) as PostRequestBody;
    if (!botType || !startTime || !endTime) {
      return NextResponse.json({ message: 'Missing required log data' }, { status: 400 });
    }
    const newId = Date.now().toString() + Math.random().toString(36).substring(2,7);
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const durationMs = Math.max(0, endDate.getTime() - startDate.getTime());
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const newLog: LogEntry = {
      id: newId,
      botType: botType === 'chatgpt' ? 'ChatGPT' : 'Perplexity AI',
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      duration: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      date: startDate.toLocaleDateString('en-CA'),
    };
    const logsData = readSessionLogs();
    logsData.unshift(newLog);
    // Keep logsData array from growing too large
    if (logsData.length > 100) {
      writeSessionLogs(logsData.slice(0, 100));
    } else {
      writeSessionLogs(logsData);
    }
    return NextResponse.json({ message: 'Log saved successfully', log: newLog }, { status: 201 });
  } catch (error) {
    console.error('Error saving log:', error);
    return NextResponse.json({ message: 'Error saving log', error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    writeSessionLogs([]);
    return NextResponse.json({ message: 'All session logs deleted.' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting logs:', error);
    return NextResponse.json({ message: 'Error deleting logs', error: (error as Error).message }, { status: 500 });
  }
}
