
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

  const { toast } = useToast();

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
      setLogs([]); // Set to empty array on error
    } finally {
      setIsLoadingLogs(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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


  const handleStartBot = async (botType: BotType) => {
    if (isBotRunning || isStarting) return;
    setIsStarting(true);
    try {
      const response = await fetch('/api/bots/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botType }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to start ${botType} bot`);
      }
      
      setSelectedBot(botType);
      setIsBotRunning(true);
      const now = Date.now();
      setStartTime(now);
      setElapsedTime(0); // Reset elapsed time
      setIsModalOpen(false);
      // Removed success toast for starting bot as per PRD
      // toast({
      //   title: "Bot Started",
      //   description: `${botType === 'chatgpt' ? 'ChatGPT' : 'Perplexity AI'} bot has been started.`,
      // });
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

  const handleStopBot = async () => {
    if (!isBotRunning || !selectedBot || !startTime || isStopping) return;
    setIsStopping(true);
    const endTime = Date.now();

    try {
      // Stop the bot first
      const stopResponse = await fetch('/api/bots/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botType: selectedBot }),
      });
       if (!stopResponse.ok) {
        const errorData = await stopResponse.json();
        throw new Error(errorData.message || `Failed to stop ${selectedBot} bot`);
      }

      // Then log the session
      const logResponse = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botType: selectedBot,
          startTime: startTime,
          endTime: endTime,
        }),
      });
      if (!logResponse.ok) {
         const errorData = await logResponse.json();
        throw new Error(errorData.message || 'Failed to log session');
      }
      
      // Removed success toast for stopping bot as per PRD
      // toast({
      //   title: "Bot Stopped",
      //   description: `${selectedBot === 'chatgpt' ? 'ChatGPT' : 'Perplexity AI'} bot stopped and session logged.`,
      // });

      fetchLogs(); // Refresh logs after successful logging

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
      // Elapsed time will be naturally frozen by timer clearing
      setIsStopping(false);
    }
  };
  
  const getBotDisplayName = (botType: BotType | null) => {
    if (botType === 'chatgpt') return 'ChatGPT';
    if (botType === 'perplexity') return 'Perplexity AI';
    return '';
  }

  const getBotIcon = (botType: BotType | null) => {
    if (botType === 'chatgpt') return <BotIcon className="inline-block mr-1 h-5 w-5" />;
    if (botType === 'perplexity') return <Zap className="inline-block mr-1 h-5 w-5" />;
    return null;
  }


  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center bg-background text-foreground">
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 font-headline">Bot Dashboard</h1>
        <p className="text-md sm:text-lg text-muted-foreground">Manage and monitor your AI bot sessions.</p>
      </header>

      <Card className="w-full max-w-2xl mb-8 shadow-xl bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl flex items-center justify-between font-headline">
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
          {!isBotRunning ? (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#A3BFFA] hover:bg-[#8EADDD] text-gray-800 font-semibold py-3 px-6 text-lg rounded-lg shadow-md transition-transform duration-150 hover:scale-105 w-full sm:w-auto"
              aria-label="Start a new bot session"
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
              className="bg-[#FF7875] hover:bg-[#F0625E] text-white font-semibold py-3 px-6 text-lg rounded-lg shadow-md transition-transform duration-150 hover:scale-105 w-full sm:w-auto"
              aria-label="Stop current bot session"
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
