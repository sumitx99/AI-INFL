import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(
  req: NextRequest,
  context: { params: { botname: string } }
) {
  const botname = context.params.botname;
  console.log('🐛 [start] params.botname =', JSON.stringify(botname));

  // Validate bot name
  if (!botname || !['chatgpt', 'perplexity'].includes(botname)) {
    return NextResponse.json(
      { error: 'Invalid bot name. Must be "chatgpt" or "perplexity"', received: botname },
      { status: 400 }
    );
  }

  try {
    // Determine the path to the appropriate main.py file
    const scriptPath = path.join(
      process.cwd(),
      'src',
      'app',
      'api',
      'bots',
      botname,
      'main.py'
    );

    // Check if main.py exists
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        { error: `Bot script not found: ${scriptPath}` },
        { status: 404 }
      );
    }

    // Spawn a new process to run the Python script
    const pythonProcess: ChildProcess = spawn('python', [scriptPath], {
      stdio: 'pipe',
      shell: true,
    });

    // Store the PID in a file for later termination
    const pidFile = path.join(
      process.cwd(),
      'src',
      'app',
      'api',
      'bots',
      botname,
      `${botname}.pid`
    );
    fs.writeFileSync(pidFile, String(pythonProcess.pid), 'utf-8');

    // Handle process output
    pythonProcess.stdout?.on('data', (data) => {
      console.log(`[Bot: ${botname}] stdout: ${data.toString()}`);
    });
    pythonProcess.stderr?.on('data', (data) => {
      console.error(`[Bot: ${botname}] stderr: ${data.toString()}`);
    });
    pythonProcess.on('close', (code) => {
      console.log(`[Bot: ${botname}] process exited with code ${code}`);
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    });

    return NextResponse.json({
      status: 'started',
      bot: botname,
      // pid: pythonProcess.pid,
    });
  } catch (error) {
    console.error(`Error starting bot "${botname}":`, error);
    return NextResponse.json(
      { error: 'Failed to start bot', details: (error as Error).message },
      { status: 500 }
    );
  }
}
