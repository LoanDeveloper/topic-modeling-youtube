/**
 * useJobHistory Hook
 *
 * Fetches and manages the list of all modeling jobs.
 *
 * @example
 * ```typescript
 * const { jobs, isLoading, error, refresh } = useJobHistory();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ModelingJob } from '@/types';

export function useJobHistory() {
  const [jobs, setJobs] = useState<ModelingJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.modelingJobs();
      setJobs(response.jobs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch jobs';
      setError(errorMessage);
      console.error('Failed to fetch jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    isLoading,
    error,
    refresh: fetchJobs,
  };
}
