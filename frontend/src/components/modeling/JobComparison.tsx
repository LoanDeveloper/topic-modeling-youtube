/**
 * JobComparison Component
 *
 * Allows users to compare multiple modeling jobs side by side.
 * Shows key metrics, topics, and performance indicators for comparison.
 *
 * @example
 * ```typescript
 * <JobComparison jobIds={['job1', 'job2']} />
 * ```
 */

import { useEffect, useState } from 'react';
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
import { Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { ModelingResult } from '@/types';

interface JobComparisonProps {
  jobIds: string[];
  onRemoveJob?: (jobId: string) => void;
}

export function JobComparison({ jobIds, onRemoveJob }: JobComparisonProps) {
  const [results, setResults] = useState<Map<string, ModelingResult>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (jobIds.length === 0) return;

      setIsLoading(true);
      setError(null);

      try {
        const resultsMap = new Map<string, ModelingResult>();

        for (const jobId of jobIds) {
          try {
            const result = await api.modelingResults(jobId);
            if (result.success) {
              resultsMap.set(jobId, result);
            }
          } catch (err) {
            console.error(`Failed to fetch result for job ${jobId}:`, err);
          }
        }

        setResults(resultsMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch results');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [jobIds]);

  if (jobIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>Select jobs from the history to compare them side by side.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Comparison</CardTitle>
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
          <CardTitle>Job Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-destructive">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const resultsList = Array.from(results.values());

  if (resultsList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>No results available for the selected jobs.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Comparison ({resultsList.length} jobs)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Metric</TableHead>
                {resultsList.map((result) => (
                  <TableHead key={result.job_id} className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-xs">
                        {result.job_id.slice(0, 8)}...
                      </span>
                      {onRemoveJob && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveJob(result.job_id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Algorithm */}
              <TableRow>
                <TableCell className="font-medium">Algorithm</TableCell>
                {resultsList.map((result) => (
                  <TableCell key={result.job_id} className="text-center">
                    <Badge variant="outline">{result.algorithm.toUpperCase()}</Badge>
                  </TableCell>
                ))}
              </TableRow>

              {/* Number of Topics */}
              <TableRow>
                <TableCell className="font-medium">Topics</TableCell>
                {resultsList.map((result) => (
                  <TableCell key={result.job_id} className="text-center">
                    {result.num_topics}
                  </TableCell>
                ))}
              </TableRow>

              {/* Total Comments */}
              <TableRow>
                <TableCell className="font-medium">Total Comments</TableCell>
                {resultsList.map((result) => (
                  <TableCell key={result.job_id} className="text-center">
                    {result.total_comments.toLocaleString()}
                  </TableCell>
                ))}
              </TableRow>

              {/* Valid Comments */}
              <TableRow>
                <TableCell className="font-medium">Valid Comments</TableCell>
                {resultsList.map((result) => (
                  <TableCell key={result.job_id} className="text-center">
                    {result.valid_comments.toLocaleString()}
                  </TableCell>
                ))}
              </TableRow>

              {/* Channels */}
              <TableRow>
                <TableCell className="font-medium">Channels</TableCell>
                {resultsList.map((result) => (
                  <TableCell key={result.job_id} className="text-center">
                    <div className="text-xs truncate max-w-[150px]">
                      {result.channels.join(', ')}
                    </div>
                  </TableCell>
                ))}
              </TableRow>

              {/* Diversity */}
              <TableRow>
                <TableCell className="font-medium">Diversity</TableCell>
                {resultsList.map((result) => (
                  <TableCell key={result.job_id} className="text-center">
                    {result.diversity.toFixed(3)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Coherence (if available) */}
              {resultsList.some((r) => r.model_info.coherence) && (
                <TableRow>
                  <TableCell className="font-medium">Coherence</TableCell>
                  {resultsList.map((result) => (
                    <TableCell key={result.job_id} className="text-center">
                      {result.model_info.coherence
                        ? result.model_info.coherence.toFixed(3)
                        : 'N/A'}
                    </TableCell>
                  ))}
                </TableRow>
              )}

              {/* Vocabulary Size */}
              <TableRow>
                <TableCell className="font-medium">Vocabulary Size</TableCell>
                {resultsList.map((result) => (
                  <TableCell key={result.job_id} className="text-center">
                    {result.model_info.vocabulary_size?.toLocaleString() || 'N/A'}
                  </TableCell>
                ))}
              </TableRow>

              {/* N-gram Range */}
              <TableRow>
                <TableCell className="font-medium">N-gram Range</TableCell>
                {resultsList.map((result) => (
                  <TableCell key={result.job_id} className="text-center">
                    [{result.model_info.n_gram_range.join(', ')}]
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Top Topics Comparison */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Top Topics Comparison</h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${resultsList.length}, 1fr)` }}>
            {resultsList.map((result) => (
              <Card key={result.job_id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-mono">
                    {result.job_id.slice(0, 8)}...
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.topics.slice(0, 3).map((topic) => (
                      <div key={topic.id} className="space-y-1">
                        <div className="text-sm font-medium">{topic.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {topic.words.slice(0, 5).map(([word]) => word).join(', ')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {topic.document_count} comments
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
