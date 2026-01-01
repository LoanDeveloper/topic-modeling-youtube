/**
 * useExtraction Hook
 *
 * Manages extraction state with real-time polling.
 * Provides functions to start, stop, and monitor YouTube comment extraction.
 *
 * @example
 * ```typescript
 * const { status, isExtracting, startExtraction, stopExtraction } = useExtraction();
 *
 * const handleStart = async () => {
 *   await startExtraction({
 *     channel: '@youtube',
 *     workers: 2,
 *   });
 * };
 * ```
 */

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { usePolling } from './usePolling';
import type { ExtractionStatusResponse, ScrapeCommentsRequest, ScrapeCommentsResponse } from '@/types';

/**
 * Hook for managing extraction state and operations
 *
 * @returns Object with status, control functions, and refresh capability
 */
export function useExtraction() {
  const [status, setStatus] = useState<ExtractionStatusResponse | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current extraction status from API
   */
  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getExtractionStatus();
      setStatus(data);
      setIsExtracting(data.active);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch extraction status';
      setError(errorMessage);
      console.error('Failed to fetch extraction status:', err);
    }
  }, []);

  /**
   * Poll for extraction status updates when extraction is active
   */
  usePolling(fetchStatus, 1000, isExtracting);

  /**
   * Start a new extraction job
   *
   * @param config - Extraction configuration
   * @returns Response with job IDs and queue info
   */
  const startExtraction = useCallback(
    async (config: ScrapeCommentsRequest): Promise<ScrapeCommentsResponse> => {
      try {
        setError(null);
        const result = await api.scrapeComments(config);
        setIsExtracting(true);
        // Fetch status immediately after starting
        await fetchStatus();
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start extraction';
        setError(errorMessage);
        throw err;
      }
    },
    [fetchStatus]
  );

  /**
   * Request graceful stop of current extraction
   */
  const stopExtraction = useCallback(async () => {
    try {
      setError(null);
      await api.stopExtraction();
      setIsExtracting(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop extraction';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Clear completed/errored jobs from queue
   */
  const clearQueue = useCallback(async () => {
    try {
      setError(null);
      await api.clearQueue();
      await fetchStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear queue';
      setError(errorMessage);
      throw err;
    }
  }, [fetchStatus]);

  return {
    status,
    isExtracting,
    error,
    startExtraction,
    stopExtraction,
    clearQueue,
    refresh: fetchStatus,
  };
}
