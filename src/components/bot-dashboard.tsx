"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle, StopCircle, Loader2, Bot as BotIcon, Zap } from "lucide-react";
import { TimerDisplay } from './timer-display';
import { BotSelectionModal } from './bot-selection-modal';
import { LogsTable } from './logs-table';
import type { LogEntry, BotType } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BotDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotType | null>(null);
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Scheduler state
  const [isSchedulerDialogOpen, setIsSchedulerDialogOpen] = useState(false);
  const [selectedBotForSchedule, setSelectedBotForSchedule] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false); // Loading state

  const { toast } = useToast();

  // Fetch logs on mount
  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch('/api/logs');
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Fetch logs error:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Could not fetch session logs.",
        variant: "destructive",
      });
      setLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Timer logic
  useEffect(() => {
    if (isBotRunning && startTime) {
      const intervalId = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
      setTimerIntervalId(intervalId);
      return () => clearInterval(intervalId);
    } else if (!isBotRunning && timerIntervalId) {
      clearInterval(timerIntervalId);
      setTimerIntervalId(null);
    }
  }, [isBotRunning, startTime]);

  // Start bot
  const handleStartBot = async (botType: BotType) => {
    if (isBotRunning || isStarting) return;
    setIsStarting(true);
    try {
      const response = await fetch(`/api/bots/${botType}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botType }),
      });
  
      let data;
      const contentType = response.headers.get('content-type');
  
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Non-JSON response received: ${text.slice(0, 100)}...`);
      }
  
      if (!response.ok) {
        throw new Error(data.message || `Failed to start ${botType} bot`);
      }
  
      setSelectedBot(botType);
      setIsBotRunning(true);
      const now = Date.now();
      setStartTime(now);
      setElapsedTime(0);
      setIsModalOpen(false);
  
    } catch (error) {
      console.error("Start bot error:", error);
      toast({
        title: "Error Starting Bot",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Stop bot
  const handleStopBot = async () => {
    if (!isBotRunning || !selectedBot || !startTime || isStopping) return;
    setIsStopping(true);
    const endTime = Date.now();
  
    try {
      // Stop the bot
      const stopResponse = await fetch(`/api/bots/${selectedBot}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botType: selectedBot }),
      });
  
      if (!stopResponse.ok) {
        const stopData = await stopResponse.json();
        throw new Error(stopData.message || `Failed to stop ${selectedBot} bot`);
      }
  
      // Log session to global logs endpoint
      const logResponse = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botType: selectedBot,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          durationMs: endTime - startTime,
        }),
      });
  
      if (!logResponse.ok) {
        const logData = await logResponse.json();
        throw new Error(logData.message || 'Failed to save session log');
      }
  
      fetchLogs(); // Refresh UI
    } catch (error) {
      console.error("Stop bot / log error:", error);
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsBotRunning(false);
      setSelectedBot(null);
      setStartTime(null);
      setIsStopping(false);
    }
  };

  // Schedule bot run
  const handleScheduleSubmit = async () => {
    if (!selectedBotForSchedule || !scheduleStartTime || !scheduleEndTime) {
      toast({
        title: "Validation Error",
        description: "Please fill all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsScheduling(true);
    try {
      const response = await fetch('/api/bots/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botName: selectedBotForSchedule,
          startTime: scheduleStartTime,
          endTime: scheduleEndTime,
          timezone: 'Asia/Kolkata',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule bot run');
      }

      toast({
        title: "Scheduled",
        description: `${selectedBotForSchedule === 'chatgpt' ? 'ChatGPT' : 'Perplexity'} bot will start at ${scheduleStartTime} IST.`,
      });

      setIsSchedulerDialogOpen(false);
    } catch (error) {
      console.error("Scheduling error:", error);
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const getBotDisplayName = (botType: BotType | null) => {
    if (botType === 'chatgpt') return 'ChatGPT';
    if (botType === 'perplexity') return 'Perplexity AI';
    return '';
  };

  const getBotIcon = (botType: BotType | null) => {
    if (botType === 'chatgpt') return <BotIcon className="inline-block mr-1 h-5 w-5" />;
    if (botType === 'perplexity') return <Zap className="inline-block mr-1 h-5 w-5" />;
    return null;
  };

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center bg-background text-foreground">
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Bot Dashboard</h1>
        <p className="text-md sm:text-lg text-muted-foreground">Manage and monitor your AI bot sessions.</p>
      </header>

      <Card className="w-full max-w-2xl mb-8 shadow-xl bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl flex items-center justify-between">
            Bot Control
            {isBotRunning && selectedBot && (
              <Badge variant="secondary" className="text-sm ml-auto py-1 px-2.5 bg-accent text-accent-foreground">
                {getBotIcon(selectedBot)}
                Running: {getBotDisplayName(selectedBot)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 p-4 sm:p-6">
          <TimerDisplay elapsedTime={elapsedTime} />
          <div className="flex flex-wrap gap-4 justify-center">
            {!isBotRunning ? (
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#A3BFFA] hover:bg-[#8EADDD] text-gray-800 font-semibold py-3 px-6 text-lg rounded-lg shadow-md transition-transform duration-150 hover:scale-105"
                disabled={isStarting}
              >
                {isStarting ? (
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                ) : (
                  <PlayCircle className="mr-2 h-6 w-6" />
                )}
                {isStarting ? 'Starting...' : 'Start Bot'}
              </Button>
            ) : (
              <Button
                onClick={handleStopBot}
                className="bg-[#FF7875] hover:bg-[#F0625E] text-white font-semibold py-3 px-6 text-lg rounded-lg shadow-md transition-transform duration-150 hover:scale-105"
                disabled={isStopping}
              >
                {isStopping ? (
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                ) : (
                  <StopCircle className="mr-2 h-6 w-6" />
                )}
                {isStopping ? 'Stopping...' : 'Stop Bot'}
              </Button>
            )}

            {/* Schedule Run Button */}
            <Dialog open={isSchedulerDialogOpen} onOpenChange={setIsSchedulerDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-[#A3BFFA] hover:bg-[#8EADDD] text-gray-800 font-semibold py-3 px-6 text-lg rounded-lg shadow-md transition-transform duration-150 hover:scale-105"
                >
                  <Zap className="mr-2 h-6 w-6" />
                  Schedule Run
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Schedule Bot Run</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Bot Selection */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="bot" className="text-right">Bot</label>
                    <Select onValueChange={setSelectedBotForSchedule}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a bot" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chatgpt">ChatGPT</SelectItem>
                        <SelectItem value="perplexity">Perplexity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Time */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="startTime" className="text-right">Start Time (IST)</label>
                    <input
                      id="startTime"
                      type="datetime-local"
                      value={scheduleStartTime}
                      onChange={(e) => setScheduleStartTime(e.target.value)}
                      className="col-span-3 border p-2 rounded"
                    />
                  </div>

                  {/* End Time */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="endTime" className="text-right">End Time (IST)</label>
                    <input
                      id="endTime"
                      type="datetime-local"
                      value={scheduleEndTime}
                      onChange={(e) => setScheduleEndTime(e.target.value)}
                      className="col-span-3 border p-2 rounded"
                    />
                  </div>
                </div>
                <Button onClick={handleScheduleSubmit} disabled={isScheduling}>
                  {isScheduling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : 'Schedule'}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <BotSelectionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSelectBot={handleStartBot} 
      />

      <LogsTable logs={logs} isLoading={isLoadingLogs} refreshLogs={fetchLogs} />
    </div>
  );
}