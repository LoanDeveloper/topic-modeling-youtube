/**
 * ExtractionQueue Component
 *
 * Displays real-time extraction progress and queue status.
 * Shows current extraction progress bar, queue table with status badges,
 * and provides controls for stopping extraction and clearing the queue.
 */

import { AlertCircle, Loader2, StopCircle, Trash2 } from 'lucide-react';
import { useExtraction } from '@/hooks/useExtraction';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { QueueItem } from '@/types';

export function ExtractionQueue() {
  const { status, isExtracting, error, stopExtraction, clearQueue } = useExtraction();

  // Calculate progress percentage
  const progressPercentage =
    status && status.videos_total && status.videos_total > 0
      ? (status.videos_completed / status.videos_total) * 100
      : 0;

  // Check if there are any completed or errored jobs
  const hasCompletedOrErrored = status?.queue.some(
    (item) => item.status === 'completed' || item.status === 'error'
  );

  // Check if queue is empty
  const isQueueEmpty = !status?.queue || status.queue.length === 0;

  /**
   * Get badge variant based on queue item status
   */
  const getStatusBadge = (item: QueueItem) => {
    switch (item.status) {
      case 'queued':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Queued
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">{item.status}</Badge>;
    }
  };

  /**
   * Get result message from queue item
   */
  const getResultMessage = (item: QueueItem): string => {
    if (!item.result) return '-';

    const { result } = item;

    if (result.error) {
      return result.error;
    }

    if (result.message) {
      return result.message;
    }

    if (result.success) {
      const parts = [];
      if (result.total_videos !== undefined) {
        parts.push(`${result.total_videos} videos`);
      }
      if (result.total_comments !== undefined) {
        parts.push(`${result.total_comments} comments`);
      }
      if (result.stopped) {
        parts.push('(stopped)');
      }
      if (result.rate_limited) {
        parts.push('(rate limited)');
      }
      return parts.length > 0 ? parts.join(', ') : 'Success';
    }

    return 'Completed';
  };

  /**
   * Handle stop extraction
   */
  const handleStop = async () => {
    try {
      await stopExtraction();
    } catch (err) {
      console.error('Failed to stop extraction:', err);
    }
  };

  /**
   * Handle clear queue
   */
  const handleClearQueue = async () => {
    try {
      await clearQueue();
    } catch (err) {
      console.error('Failed to clear queue:', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extraction Queue</CardTitle>
        <CardDescription>
          Monitor real-time extraction progress and manage the queue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Current Extraction Progress */}
        {isExtracting && status?.active && (
          <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Processing {status.current_channel}
                </p>
                <p className="text-xs text-muted-foreground">
                  Video {status.videos_completed}/{status.videos_total}
                  {status.current_video && ` - ${status.current_video}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{status.comments_extracted.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">comments extracted</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>
        )}

        {/* Queue Table */}
        {!isQueueEmpty ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {status.queue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.channel}</TableCell>
                    <TableCell>{getStatusBadge(item)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getResultMessage(item)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Loader2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No extraction jobs</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start a new extraction to see progress here
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {!isQueueEmpty && (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStop}
              disabled={!isExtracting || status?.stop_requested}
            >
              <StopCircle className="mr-2 h-4 w-4" />
              {status?.stop_requested ? 'Stopping...' : 'Stop Extraction'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearQueue}
              disabled={!hasCompletedOrErrored}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Queue
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
