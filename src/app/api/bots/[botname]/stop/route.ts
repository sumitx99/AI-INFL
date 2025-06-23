import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ botName: string }> }
) {
  const params = await context.params;
  const { botName } = params;

  // Validate bot name
  if (!botName || !['chatgpt', 'perplexity'].includes(botName)) {
    return NextResponse.json(
      { error: 'Invalid bot name. Must be "chatgpt" or "perplexity"' },
      { status: 400 }
    );
  }

  try {
    // Find the PID file
    const scriptDir = path.join(
      process.cwd(),
      'src',
      'app',
      'bots',
      botName
    );
    const pidFile = path.join(scriptDir, `${botName}.pid`);
    

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
    } catch (killError) {
      console.error(`Failed to kill process with PID ${pid}:`, killError);
      return NextResponse.json(
        { error: `Failed to stop ${botName} bot: ${(killError as Error).message}` },
        { status: 500 }
      );
    }

    // Run analysis script only for perplexity bot
    if (botName === 'perplexity') {
      const scriptDir = path.join(process.cwd(), 'src', 'app', 'bots', 'perplexity');
      console.log('🔄 Running analyze_logs.py …');
      const result = spawnSync('python', ['analyze_logs.py'], {
        cwd: scriptDir,
        stdio: 'pipe'
      });

      if (result.status !== 0) {
        console.error('Python script failed:', result.stderr.toString());
        return NextResponse.json(
          { warning: 'Log analysis script failed.', error: result.stderr.toString() },
          { status: 500 }
        );
      }
      console.log('✅ Log analysis completed:', result.stdout.toString());
    }

    return NextResponse.json({
      status: 'stopped',
      bot: botName,
    });

  } catch (error) {
    console.error(`Error stopping bot "${botName}":`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}