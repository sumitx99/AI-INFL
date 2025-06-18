import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest, { params }: { params: { botName: string } }) {
  const botName = params.botName;

  // Validate bot name
  if (!botName || !['chatgpt', 'perplexity'].includes(botName)) {
    return NextResponse.json(
      { error: 'Invalid bot name. Must be "chatgpt" or "perplexity"' },
      { status: 400 }
    );
  }

  try {
    // Find the PID file
    const pidFile = path.join(process.cwd(), 'src', 'app', 'api', 'bots', botName, `${botName}.pid`);

    if (!fs.existsSync(pidFile)) {
      return NextResponse.json(
        { error: `No running ${botName} bot found.` },
        { status: 404 }
      );
    }

    const pidData = fs.readFileSync(pidFile, 'utf-8');
    const pid = parseInt(pidData.trim(), 10);

    if (isNaN(pid)) {
      return NextResponse.json(
        { error: 'Invalid PID in file.' },
        { status: 500 }
      );
    }

    // Try to kill the process
    try {
      process.kill(pid);
      fs.unlinkSync(pidFile); // Remove the PID file after stopping
      return NextResponse.json(
        { success: true, message: `${botName} bot stopped successfully.` },
        { status: 200 }
      );
    } catch (killError) {
      console.error(`Failed to kill process with PID ${pid}:`, killError);
      return NextResponse.json(
        { error: `Failed to stop ${botName} bot: ${(killError as Error).message}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error(`Error stopping bot "${botName}":`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}