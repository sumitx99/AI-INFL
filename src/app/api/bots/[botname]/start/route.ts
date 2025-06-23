// src/app/api/bots/[botName]/start/route.ts

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ botName: string }> }
) {
  const { botName } = await context.params; 
  console.log('🐛 [start] params.botName =', JSON.stringify(botName));

  // Validate bot name
  if (!botName || !['chatgpt', 'perplexity'].includes(botName)) {
    return NextResponse.json(
      { error: 'Invalid bot name. Must be "chatgpt" or "perplexity"', received: botName },
      { status: 400 }
    );
  }

  try {
    // Base folder for this bot
    const scriptDir = path.join(
      process.cwd(),
      'src',
      'app',
      'bots',
      botName
    );

    // Path to the Python entrypoint
    const scriptPath = path.join(scriptDir, 'main.py');

    // Check that main.py actually exists
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        { error: `Bot script not found: ${scriptPath}` },
        { status: 404 }
      );
    }

    // Spawn the bot process
    const pythonProcess: ChildProcess = spawn('python', [scriptPath], {
      stdio: 'pipe',
      shell: true,
    });

    // Write its PID into a file alongside the script
    const pidFile = path.join(scriptDir, `${botName}.pid`);
    fs.writeFileSync(pidFile, String(pythonProcess.pid), 'utf-8');

    // Log output for debugging
    pythonProcess.stdout?.on('data', (data) => {
      console.log(`[Bot: ${botName}] stdout: ${data.toString()}`);
    });
    pythonProcess.stderr?.on('data', (data) => {
      console.error(`[Bot: ${botName}] stderr: ${data.toString()}`);
    });
    pythonProcess.on('close', (code) => {
      console.log(`[Bot: ${botName}] process exited with code ${code}`);
      // Clean up the PID file when the process ends
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    });

    return NextResponse.json({
      status: 'started',
      bot: botName,
    });
  } catch (error) {
    console.error(`Error starting bot "${botName}":`, error);
    return NextResponse.json(
      { error: 'Failed to start bot', details: (error as Error).message },
      { status: 500 }
    );
  }
}
