"use client";
import React, { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, Search, ListChecks, RefreshCw, Trash2 } from "lucide-react";
import type { LogEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LogsTableProps {
  logs: LogEntry[];
  isLoading: boolean;
  refreshLogs: () => void;
}

type SortKey = keyof LogEntry;

export function LogsTable({ logs, isLoading, refreshLogs }: LogsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null);

  const filteredLogs = useMemo(() => {
    let searchableLogs = [...logs];
    if (searchTerm) {
      searchableLogs = searchableLogs.filter((log) =>
        Object.values(log).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    return searchableLogs;
  }, [logs, searchTerm]);

  const sortedLogs = useMemo(() => {
    let sortableLogs = [...filteredLogs];
    if (sortConfig !== null) {
      sortableLogs.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableLogs;
  }, [filteredLogs, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'ascending' ? (
      <ArrowUpDown className="ml-2 h-4 w-4" />
    ) : (
      <ArrowUpDown className="ml-2 h-4 w-4" />
    );
  };

  const columns: { key: SortKey; label: string; sortable: boolean }[] = [
    { key: 'botType', label: 'Bot Type', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'startTime', label: 'Start Time', sortable: true },
    { key: 'endTime', label: 'End Time', sortable: true },
    { key: 'duration', label: 'Duration', sortable: true },
  ];

  const formatDisplayTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleDeleteLogs = async () => {
    if (!window.confirm('Are you sure you want to delete all session logs?')) return;
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete logs');
      refreshLogs();
    } catch (err) {
      alert('Error deleting logs: ' + (err as Error).message);
    }
  };

  return (
    <div className="w-full max-w-4xl mt-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-between font-headline">
            <div className="flex items-center">
              <ListChecks className="mr-2 h-6 w-6 text-primary" />
              Session Logs
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">PIVOT</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Download Pivot Table</AlertDialogTitle>
                    <AlertDialogDescription>
                      Click below to download the Perplexity pivot table as Excel.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <a
                        href="/bots/perplexity/summary"
                        download="perplexity-pivot.xlsx"
                        className="inline-block w-35 text-center"
                      >
                        Perplexity Pivot (Excel)
                      </a>
                    </AlertDialogAction>
                    <AlertDialogAction asChild>
                      <a
                        href="/bots/chatgpt"
                        download="chatgpt-pivot.xlsx"
                        className="inline-block w-45 text-center"
                      >
                        Chatgpt Pivot (Excel)
                      </a>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={refreshLogs} variant="outline" size="sm" aria-label="Refresh logs">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={handleDeleteLogs} variant="destructive" size="sm" aria-label="Delete all logs">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <div className="flex items-center py-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10 w-full bg-background border-border focus:ring-ring"
                aria-label="Search session logs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] rounded-md border border-border">
            <Table>
              <TableCaption className="py-4 text-muted-foreground">
                {isLoading ? "Loading logs..." : (sortedLogs.length === 0 ? "No bot session logs found." : "A list of your recent bot sessions.")}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key} className="text-foreground font-semibold">
                      {col.sortable ? (
                        <Button variant="ghost" onClick={() => requestSort(col.key)} className="px-0 hover:bg-transparent text-foreground hover:text-accent">
                          {col.label}
                          {getSortIcon(col.key)}
                        </Button>
                      ) : col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {columns.map((col) => (
                        <TableCell key={col.key}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sortedLogs.length > 0 ? (
                  sortedLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium text-foreground">{log.botType}</TableCell>
                      <TableCell className="text-muted-foreground">{log.date}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDisplayTime(log.startTime)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDisplayTime(log.endTime)}</TableCell>
                      <TableCell className="text-muted-foreground">{log.duration}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  !isLoading && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                        No results found.
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}