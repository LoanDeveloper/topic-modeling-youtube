/**
 * usePolling Hook
 *
 * Generic polling hook for real-time updates.
 * Calls a callback function at regular intervals, with optional immediate execution.
 *
 * @example
 * ```typescript
 * const fetchData = async () => {
 *   const data = await api.getData();
 *   setData(data);
 * };
 *
 * usePolling(fetchData, 1000, isActive);
 * ```
 */

import { useEffect, useRef } from 'react';

/**
 * Polling hook that executes a callback at regular intervals
 *
 * @param callback - Function to execute. Can be async.
 * @param interval - Interval in milliseconds between executions
 * @param enabled - Whether polling is enabled (default: true)
 */
export function usePolling(
  callback: () => void | Promise<void>,
  interval: number,
  enabled: boolean = true
) {
  const savedCallback = useRef(callback);

  // Update the saved callback if the dependency changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the polling interval
  useEffect(() => {
    if (!enabled) return;

    // Execute immediately on mount/enable
    const tick = () => {
      savedCallback.current();
    };
    tick();

    // Set up interval for subsequent calls
    const id = setInterval(tick, interval);

    // Cleanup interval on unmount or disable
    return () => clearInterval(id);
  }, [interval, enabled]);
}
