import { NextResponse } from 'next/server';
import { scheduleJob } from 'node-schedule';
import { parse, isValid } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

// Interface for scheduled tasks
interface ScheduledTask {
  id: string;
  botName: string;
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
  timezone: string;
  startJobId?: string;
  endJobId?: string;
}

const scheduledTasks: ScheduledTask[] = [];
const IST_TIMEZONE = 'Asia/Kolkata';

// Function to trigger bot start
async function triggerBotStart(botName: string) {
  console.log(`[Scheduler] Attempting to start bot: ${botName}`);
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const response = await fetch(`${appUrl}/api/bots/${botName}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text(); // Get raw HTML/text
      console.error(`[Scheduler] Non-OK response: ${response.status} ${response.statusText}`, text);
      return;
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      console.error(`[Scheduler] Failed to parse JSON. Raw response:`, text);
      return;
    }

    console.log(`[Scheduler] Successfully triggered start for ${botName}`, data);

  } catch (error) {
    console.error(`[Scheduler] Error triggering start for ${botName}:`, error);
  }
}

// Function to trigger bot stop
async function triggerBotStop(botName: string) {
  console.log(`[Scheduler] Attempting to stop bot: ${botName}`);
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const response = await fetch(`${appUrl}/api/bots/${botName}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text(); // Get raw HTML/text
      console.error(`[Scheduler] Non-OK response: ${response.status} ${response.statusText}`, text);
      return;
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      console.error(`[Scheduler] Failed to parse JSON. Raw response:`, text);
      return;
    }

    console.log(`[Scheduler] Successfully triggered stop for ${botName}`, data);

  } catch (error) {
    console.error(`[Scheduler] Error triggering stop for ${botName}:`, error);
  }
}

// POST handler for scheduling bot runs
export async function POST(request: Request) {
  try {
    const { botName, startTime: startTimeString, endTime: endTimeString, timezone } = await request.json();

    console.log('[Scheduler] Received scheduling request:', { botName, startTimeString, endTimeString, timezone });

    if (!botName || !startTimeString || !endTimeString || timezone !== IST_TIMEZONE) {
      console.log('[Scheduler] Missing or invalid parameters');
      return NextResponse.json({ error: 'Invalid or missing parameters, or unsupported timezone' }, { status: 400 });
    }

    const dateFormat = 'yyyy-MM-dd\'T\'HH:mm';
    const startTimeLocal = parse(startTimeString, dateFormat, new Date());
    const endTimeLocal = parse(endTimeString, dateFormat, new Date());

    console.log('[Scheduler] Parsed startTimeLocal:', startTimeLocal, 'and endTimeLocal:', endTimeLocal);

    if (!isValid(startTimeLocal) || !isValid(endTimeLocal)) {
      console.log('[Scheduler] Invalid date or time format');
      return NextResponse.json({ error: 'Invalid date or time format received. Expected YYYY-MM-DDTHH:mm' }, { status: 400 });
    }

    const startTimeIST = toZonedTime(startTimeLocal, IST_TIMEZONE);
    const endTimeIST = toZonedTime(endTimeLocal, IST_TIMEZONE);

    console.log('[Scheduler] Converted to IST - startTimeIST:', startTimeIST, 'and endTimeIST:', endTimeIST);

    const startTimeUTC = startTimeIST;
    const endTimeUTC = endTimeIST;

    console.log('[Scheduler] UTC values - startTimeUTC:', startTimeUTC, 'and endTimeUTC:', endTimeUTC);

    if (startTimeUTC >= endTimeUTC) {
      console.log('[Scheduler] Start time is not before end time');
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }

    const nowUTC = new Date();
    if (endTimeUTC < nowUTC) {
      console.log('[Scheduler] End time is in the past');
      return NextResponse.json({ error: 'End time is in the past' }, { status: 400 });
    }

    const newTask: ScheduledTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      botName,
      startTime: startTimeUTC,
      endTime: endTimeUTC,
      status: 'pending',
      timezone,
    };

    scheduledTasks.push(newTask);

    console.log(`[Scheduler] Task added to queue: ${newTask.id}`);
    console.log(`[Scheduler] Scheduled to run ${formatInTimeZone(newTask.startTime, IST_TIMEZONE, 'yyyy-MM-dd HH:mm z')} to ${formatInTimeZone(newTask.endTime, IST_TIMEZONE, 'yyyy-MM-dd HH:mm z')}`);

    // Schedule start job
    console.log('[Scheduler] Scheduling start job for', newTask.startTime);
    const startJob = scheduleJob(newTask.startTime, async () => {
      console.log(`[Scheduler] Triggering START for task: ${newTask.id} (${newTask.botName}) at ${new Date().toISOString()}`);
      const taskIndex = scheduledTasks.findIndex(t => t.id === newTask.id);
      if (taskIndex > -1) {
        scheduledTasks[taskIndex].status = 'running';
      }
      console.log('[Scheduler] Calling triggerBotStart');
      await triggerBotStart(newTask.botName);
      console.log('[Scheduler] triggerBotStart completed');
    });

    if (startJob) {
      newTask.startJobId = startJob.name;
      console.log(`[Scheduler] node-schedule start job created with ID: ${startJob.name}`);
    } else {
      console.error(`[Scheduler] Failed to schedule start job for task ${newTask.id}. Start time might be in the past.`);
      const taskIndex = scheduledTasks.findIndex(t => t.id === newTask.id);
      if (taskIndex > -1) {
        scheduledTasks[taskIndex].status = 'failed';
      }
    }

    // Schedule end job
    console.log('[Scheduler] Scheduling end job for', newTask.endTime);
    const endJob = scheduleJob(newTask.endTime, async () => {
      console.log(`[Scheduler] Triggering STOP for task: ${newTask.id} (${newTask.botName}) at ${new Date().toISOString()}`);
      const taskIndex = scheduledTasks.findIndex(t => t.id === newTask.id);
      if (taskIndex > -1) {
        scheduledTasks[taskIndex].status = 'completed';
      }
      console.log('[Scheduler] Calling triggerBotStop');
      await triggerBotStop(newTask.botName);
      console.log('[Scheduler] triggerBotStop completed');
    });

    if (endJob) {
      newTask.endJobId = endJob.name;
      console.log(`[Scheduler] node-schedule end job created with ID: ${endJob.name}`);
    } else {
      console.warn(`[Scheduler] Failed to schedule end job for task ${newTask.id}. End time might be in the past relative to now.`);
    }

    return NextResponse.json({ message: 'Bot run scheduled successfully', taskId: newTask.id });

  } catch (error) {
    console.error('[Scheduler] Scheduling error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// GET handler to list scheduled tasks
export async function GET() {
  return NextResponse.json(scheduledTasks.map(task => ({
    id: task.id,
    botName: task.botName,
    startTime: formatInTimeZone(task.startTime, IST_TIMEZONE, 'yyyy-MM-dd HH:mm:ss zzz'),
    endTime: formatInTimeZone(task.endTime, IST_TIMEZONE, 'yyyy-MM-dd HH:mm:ss zzz'),
    status: task.status,
    timezone: task.timezone,
    startJobId: task.startJobId,
    endJobId: task.endJobId,
  })));
}