/**
 * JobHistory Component
 *
 * Displays a list of all past modeling jobs with their status and metadata.
 * Allows users to view results, delete jobs, or rerun analysis.
 *
 * @example
 * ```typescript
 * <JobHistory onSelectJob={handleSelectJob} />
 * ```
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useJobHistory } from '@/hooks/useJobHistory';
import { Eye, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { ModelingJob } from '@/types';

interface JobHistoryProps {
  onSelectJob?: (jobId: string) => void;
  onRerunJob?: (job: ModelingJob) => void;
}

export function JobHistory({ onSelectJob, onRerunJob }: JobHistoryProps) {
  const { jobs, isLoading, error, refresh } = useJobHistory();
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    setDeletingJobId(jobId);

    try {
      await api.modelingDeleteJob(jobId);
      await refresh();
    } catch (err) {
      console.error('Failed to delete job:', err);
      alert(`Failed to delete job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingJobId(null);
    }
  };

  const getStatusBadge = (status: ModelingJob['status']) => {
    const variants: Record<typeof status, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      queued: 'secondary',
      running: 'default',
      completed: 'outline',
      error: 'destructive',
    };

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-destructive">
            <p>{error}</p>
            <Button onClick={refresh} variant="outline" className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>No modeling jobs found.</p>
            <p className="text-sm mt-2">Start a new analysis to see it here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Job History</CardTitle>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Algorithm</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-mono text-sm">
                  {job.id.slice(0, 8)}...
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px] truncate">
                    {job.channels.join(', ')}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{job.algorithm.toUpperCase()}</Badge>
                </TableCell>
                <TableCell>{getStatusBadge(job.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(job.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {job.status === 'completed' && onSelectJob && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectJob(job.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {job.status === 'completed' && onRerunJob && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRerunJob(job)}
                        title="Rerun with same settings"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(job.id)}
                      disabled={deletingJobId === job.id}
                    >
                      {deletingJobId === job.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
