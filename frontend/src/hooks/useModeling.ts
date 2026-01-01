/**
 * useModeling Hook
 *
 * Manages topic modeling state with job tracking and polling.
 * Provides functions to run modeling jobs and monitor their progress.
 *
 * @example
 * ```typescript
 * const { status, result, isRunning, runModeling } = useModeling();
 *
 * const handleRunModeling = async () => {
 *   const jobId = await runModeling({
 *     channels: ['@youtube'],
 *     algorithm: 'lda',
 *     params: { num_topics: 10 },
 *   });
 * };
 * ```
 */

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { usePolling } from './usePolling';
import type {
  ModelingResult,
  ModelingStatusResponse,
  ModelingRunRequest,
  ModelingRunResponse,
} from '@/types';

/**
 * Hook for managing topic modeling operations and state
 *
 * @param jobId - Optional initial job ID to track
 * @returns Object with status, result, control functions, and refresh capability
 */
export function useModeling(jobId?: string) {
  const [status, setStatus] = useState<ModelingStatusResponse | null>(null);
  const [result, setResult] = useState<ModelingResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | undefined>(jobId);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current modeling job status from API
   */
  const fetchStatus = useCallback(async () => {
    if (!currentJobId) return;

    try {
      const data = await api.modelingStatus(currentJobId);
      setStatus(data);

      const isJobRunning = data.status === 'running' || data.status === 'queued';
      setIsRunning(isJobRunning);

      // If job is completed, fetch results
      if (data.status === 'completed' && data.result) {
        if ('success' in data.result && data.result.success) {
          setResult(data.result as ModelingResult);
        }
        setIsRunning(false);
      }

      // If job encountered error
      if (data.status === 'error') {
        setIsRunning(false);
        if (data.result && 'error' in data.result) {
          setError(data.result.error);
        }
      }

      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch modeling status';
      setError(errorMessage);
      console.error('Failed to fetch modeling status:', err);
    }
  }, [currentJobId]);

  /**
   * Poll for modeling job status updates when job is running
   */
  usePolling(fetchStatus, 1000, isRunning && !!currentJobId);

  /**
   * Start a new modeling job
   *
   * @param config - Modeling configuration
   * @returns Job ID for tracking
   */
  const runModeling = useCallback(
    async (config: ModelingRunRequest): Promise<string> => {
      try {
        setError(null);
        const response: ModelingRunResponse = await api.modelingRun(config);

        if (response.success) {
          setCurrentJobId(response.job_id);
          setIsRunning(true);
          return response.job_id;
        } else {
          throw new Error('Failed to start modeling job');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to run modeling';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  /**
   * Get results of a completed modeling job
   */
  const getResults = useCallback(
    async (jobId: string): Promise<ModelingResult | null> => {
      try {
        setError(null);
        const response = await api.modelingResults(jobId);

        if (response.success) {
          setResult(response);
          return response;
        }
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch results';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  /**
   * Delete a modeling job
   */
  const deleteJob = useCallback(async (jobId?: string) => {
    const idToDelete = jobId || currentJobId;
    if (!idToDelete) return;

    try {
      setError(null);
      await api.modelingDeleteJob(idToDelete);

      if (idToDelete === currentJobId) {
        setCurrentJobId(undefined);
        setStatus(null);
        setResult(null);
        setIsRunning(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete job';
      setError(errorMessage);
      throw err;
    }
  }, [currentJobId]);

  return {
    status,
    result,
    isRunning,
    currentJobId,
    error,
    runModeling,
    getResults,
    deleteJob,
    refresh: fetchStatus,
  };
}
