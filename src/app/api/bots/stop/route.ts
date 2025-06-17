import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { BotType } from '@/lib/types';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { botType } = (await request.json()) as { botType: BotType };
    
    if (!botType || (botType !== 'chatgpt' && botType !== 'perplexity')) {
      return NextResponse.json({ message: 'Invalid bot type provided' }, { status: 400 });
    }

    // Find the PID file
    const pidFile = path.join(process.cwd(), 'src', 'app', 'api', 'bots', botType, `${botType}.pid`);
    if (!fs.existsSync(pidFile)) {
      return NextResponse.json({ message: `No running ${botType} bot found.` }, { status: 404 });
    }
    const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'));
    if (isNaN(pid)) {
      return NextResponse.json({ message: 'Invalid PID file.' }, { status: 500 });
    }

    // Try to kill the process
    try {
      process.kill(pid);
      fs.unlinkSync(pidFile);
      return NextResponse.json({ message: `${botType} bot stopped successfully.` }, { status: 200 });
    } catch (err) {
      return NextResponse.json({ message: `Failed to stop ${botType} bot: ${(err as Error).message}` }, { status: 500 });
    }
  } catch (error) {
    console.error('Error stopping bot:', error);
    return NextResponse.json({ message: 'Error stopping bot', error: (error as Error).message }, { status: 500 });
  }
}
