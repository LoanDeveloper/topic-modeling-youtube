/**
 * useChannels Hook
 *
 * Manages channel data fetching and state.
 * Provides hooks for fetching channel lists and individual channel details.
 *
 * @example
 * ```typescript
 * // Get all channels
 * const { channels, loading, error, refresh } = useChannels();
 *
 * // Get specific channel details
 * const { detail, loading, error } = useChannelDetail('@youtube');
 * ```
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ChannelStats, ChannelDetail, FilesStatsResponse } from '@/types';

/**
 * Hook for fetching and managing all channel data
 *
 * @returns Object with channels list, loading state, error state, and refresh function
 */
export function useChannels() {
  const [channels, setChannels] = useState<ChannelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all channels from API
   */
  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: FilesStatsResponse = await api.getFilesStats();
      setChannels(data.files || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load channels';
      setError(errorMessage);
      console.error('Failed to load channels:', err);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch channels on component mount
   */
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  return {
    channels,
    loading,
    error,
    refresh: fetchChannels,
  };
}

/**
 * Hook for fetching and managing individual channel details
 *
 * @param folder - Channel folder name (or null to skip loading)
 * @returns Object with channel detail, loading state, and error state
 */
export function useChannelDetail(folder: string | null) {
  const [detail, setDetail] = useState<ChannelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch details for a specific channel
   */
  useEffect(() => {
    if (!folder) {
      setDetail(null);
      setError(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data: ChannelDetail = await api.getFileDetail(folder);
        setDetail(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load channel details';
        setError(errorMessage);
        console.error('Failed to load channel details:', err);
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [folder]);

  return {
    detail,
    loading,
    error,
  };
}

/**
 * Hook for getting channel info before extraction
 *
 * @returns Object with channel info fetch function
 */
export function useChannelInfo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch channel info (preview before extraction)
   *
   * @param channel - Channel handle, ID, or URL
   * @returns Channel information
   */
  const fetchChannelInfo = useCallback(async (channel: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getChannelInfo(channel);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch channel info';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    fetchChannelInfo,
    loading,
    error,
  };
}
