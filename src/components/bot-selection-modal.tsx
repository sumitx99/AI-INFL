"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Bot, Zap } from "lucide-react"; // Zap for Perplexity, Bot for ChatGPT
import type { BotType } from '@/lib/types';

interface BotSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBot: (botType: BotType) => void;
}

export function BotSelectionModal({ isOpen, onClose, onSelectBot }: BotSelectionModalProps) {
  const handleSelect = (botType: BotType) => {
    onSelectBot(botType);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-center">Select a Bot</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground pt-2">
            Choose which AI bot you want to run.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button
            variant="outline"
            className="w-full justify-start text-lg py-6 border-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground focus:bg-accent/90 focus:text-accent-foreground"
            onClick={() => handleSelect('chatgpt')}
            aria-label="Run ChatGPT Bot"
          >
            <Bot className="mr-3 h-6 w-6" />
            Run ChatGPT Bot
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-lg py-6 border-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground focus:bg-accent/90 focus:text-accent-foreground"
            onClick={() => handleSelect('perplexity')}
            aria-label="Run Perplexity AI Bot"
          >
            <Zap className="mr-3 h-6 w-6" />
            Run Perplexity AI Bot
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
