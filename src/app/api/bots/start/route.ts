import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { BotType } from '@/lib/types';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { botType } = (await request.json()) as { botType: BotType };

    if (!botType || (botType !== 'chatgpt' && botType !== 'perplexity')) {
      return NextResponse.json({ message: 'Invalid bot type provided' }, { status: 400 });
    }

    // Determine the path to the appropriate main.py file
    const scriptPath = path.join(process.cwd(), 'src', 'app', 'api', 'bots', botType, 'main.py');

    // Spawn a new process to run the Python script
    const pythonProcess: ChildProcess = spawn('python', [scriptPath], {
      stdio: 'pipe',
      shell: true
    });

    // Store the PID in a file for later termination
    const pidFile = path.join(process.cwd(), 'src', 'app', 'api', 'bots', botType, `${botType}.pid`);
    fs.writeFileSync(pidFile, String(pythonProcess.pid), 'utf-8');

    // Handle process events
    pythonProcess.stdout?.on('data', (data: Buffer) => {
      console.log(`Bot output: ${data.toString()}`);
    });

    pythonProcess.stderr?.on('data', (data: Buffer) => {
      console.error(`Bot error: ${data.toString()}`);
    });

    pythonProcess.on('close', (code: number | null) => {
      console.log(`Bot process exited with code ${code}`);
      // Remove the PID file when the process exits
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    });

    return NextResponse.json({ 
      message: `${botType} bot started successfully.`,
      pid: pythonProcess.pid 
    }, { status: 200 });
  } catch (error) {
    console.error('Error starting bot:', error);
    return NextResponse.json({ message: 'Error starting bot', error: (error as Error).message }, { status: 500 });
  }
}
