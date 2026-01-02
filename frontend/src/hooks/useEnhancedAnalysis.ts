/**
 * useEnhancedAnalysis Hook
 *
 * Fetches enhanced analysis data (sentiment, coherence, inter-topic distances)
 * for a completed modeling job.
 *
 * @example
 * ```typescript
 * const { data, isLoading, error } = useEnhancedAnalysis(jobId);
 * ```
 */

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface SentimentData {
  topic_id: number;
  avg_sentiment: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface CoherenceData {
  overall_coherence: number;
  per_topic_coherence: Array<{
    topic_id: number;
    coherence_score: number;
  }>;
}

export interface InterTopicDistanceData {
  method: 'umap' | 'tsne' | 'pca';
  coordinates: Array<{
    topic_id: number;
    x: number;
    y: number;
  }>;
}

export interface EnhancedAnalysisData {
  sentiment?: SentimentData[];
  coherence?: CoherenceData;
  inter_topic_distances?: InterTopicDistanceData;
  preprocessing_stats?: {
    original_documents: number;
    processed_documents: number;
    avg_length_original: number;
    avg_length_processed: number;
    total_vocabulary: number;
    language_distribution?: { [lang: string]: number };
  };
}

export function useEnhancedAnalysis(jobId: string | null | undefined) {
  const [data, setData] = useState<EnhancedAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setData(null);
      return;
    }

    const fetchEnhancedAnalysis = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.modelingEnhanced(jobId);
        setData(response as EnhancedAnalysisData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch enhanced analysis';
        setError(errorMessage);
        console.error('Failed to fetch enhanced analysis:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnhancedAnalysis();
  }, [jobId]);

  return { data, isLoading, error };
}
