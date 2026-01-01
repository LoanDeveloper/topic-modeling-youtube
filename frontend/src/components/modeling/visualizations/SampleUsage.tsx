/**
 * Sample Usage Component
 *
 * This file demonstrates how to use all visualization components together.
 * Copy and adapt this code for your actual implementation.
 */

import { useState, useEffect } from 'react';
import {
  TopicHeatmap,
  WordCloudVisualization,
  TopicEvolutionTimeline,
  InterTopicDistance,
  SentimentAnalysis,
  CoherenceScores,
  PreprocessingStats,
} from './index';

// Sample data structures - replace with your actual API calls
const sampleData = {
  preprocessing: {
    original_documents: 5000,
    processed_documents: 4750,
    avg_length_original: 45.2,
    avg_length_processed: 32.8,
    total_vocabulary: 8432,
    language_distribution: {
      en: 4200,
      es: 350,
      fr: 200,
    },
  },

  topics: [
    {
      topic_number: 0,
      words: ['machine', 'learning', 'data', 'model', 'training', 'algorithm', 'neural', 'network'],
      weights: [0.089, 0.076, 0.065, 0.054, 0.048, 0.042, 0.038, 0.035],
    },
    {
      topic_number: 1,
      words: ['video', 'content', 'channel', 'creator', 'youtube', 'platform', 'upload', 'watch'],
      weights: [0.092, 0.078, 0.067, 0.056, 0.051, 0.045, 0.039, 0.033],
    },
    // Add more topics...
  ],

  heatmap: {
    documents: Array.from({ length: 100 }, (_, i) => i),
    topics: [0, 1, 2, 3, 4],
    probabilities: Array.from({ length: 100 }, () =>
      Array.from({ length: 5 }, () => Math.random())
    ),
  },

  timeline: {
    dates: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'],
    topicCounts: {
      0: [45, 52, 48, 61, 55, 58],
      1: [38, 42, 51, 48, 53, 49],
      2: [52, 48, 45, 42, 48, 51],
      3: [35, 41, 38, 45, 42, 47],
      4: [41, 38, 42, 39, 44, 42],
    },
  },

  distance: {
    coordinates: [
      [0.2, 0.8],
      [0.7, 0.3],
      [0.4, 0.5],
      [0.8, 0.7],
      [0.3, 0.2],
    ] as [number, number][],
    labels: ['Topic 0', 'Topic 1', 'Topic 2', 'Topic 3', 'Topic 4'],
    distances: [
      [0, 0.8, 0.5, 0.9, 0.6],
      [0.8, 0, 0.6, 0.5, 0.9],
      [0.5, 0.6, 0, 0.4, 0.3],
      [0.9, 0.5, 0.4, 0, 0.7],
      [0.6, 0.9, 0.3, 0.7, 0],
    ],
  },

  sentiments: [
    { topic_number: 0, avg_sentiment: 0.45, positive_count: 250, neutral_count: 180, negative_count: 70 },
    { topic_number: 1, avg_sentiment: 0.12, positive_count: 180, neutral_count: 220, negative_count: 100 },
    { topic_number: 2, avg_sentiment: -0.23, positive_count: 120, neutral_count: 200, negative_count: 180 },
    { topic_number: 3, avg_sentiment: 0.65, positive_count: 300, neutral_count: 150, negative_count: 50 },
    { topic_number: 4, avg_sentiment: -0.08, positive_count: 150, neutral_count: 250, negative_count: 100 },
  ],

  coherence: {
    coherence_score: 0.68,
    per_topic_coherence: [0.72, 0.65, 0.58, 0.75, 0.68],
    coherence_type: 'c_v',
  },
};

export function SampleUsage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<typeof sampleData | null>(null);

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      setLoading(true);

      // Replace with your actual API call
      // const response = await fetch('/api/topic-modeling-results');
      // const result = await response.json();

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setData(sampleData);
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Topic Modeling Results</h1>
        <p className="text-muted-foreground">
          Comprehensive visualization of topic modeling analysis
        </p>
      </div>

      {/* Preprocessing Statistics */}
      <section>
        <PreprocessingStats
          stats={data?.preprocessing || sampleData.preprocessing}
          loading={loading}
        />
      </section>

      {/* Word Clouds */}
      <section>
        <WordCloudVisualization
          topics={data?.topics || sampleData.topics}
          loading={loading}
        />
      </section>

      {/* Two-column layout for heatmap and coherence */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopicHeatmap
          data={data?.heatmap || sampleData.heatmap}
          loading={loading}
        />
        <CoherenceScores
          coherence={data?.coherence || sampleData.coherence}
          loading={loading}
        />
      </section>

      {/* Timeline */}
      <section>
        <TopicEvolutionTimeline
          data={data?.timeline || sampleData.timeline}
          loading={loading}
        />
      </section>

      {/* Distance Map */}
      <section>
        <InterTopicDistance
          data={data?.distance || sampleData.distance}
          loading={loading}
        />
      </section>

      {/* Sentiment Analysis */}
      <section>
        <SentimentAnalysis
          sentiments={data?.sentiments || sampleData.sentiments}
          loading={loading}
        />
      </section>
    </div>
  );
}

// Example of fetching real data from API
export async function fetchTopicModelingResults(modelId: string) {
  try {
    const response = await fetch(`/api/topic-modeling/${modelId}/results`);
    if (!response.ok) {
      throw new Error('Failed to fetch topic modeling results');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching topic modeling results:', error);
    throw error;
  }
}

// Example of transforming backend data to component format
export function transformBackendData(backendData: any) {
  return {
    preprocessing: {
      original_documents: backendData.preprocessing?.original_count || 0,
      processed_documents: backendData.preprocessing?.processed_count || 0,
      avg_length_original: backendData.preprocessing?.avg_original_length || 0,
      avg_length_processed: backendData.preprocessing?.avg_processed_length || 0,
      total_vocabulary: backendData.vocabulary_size || 0,
      language_distribution: backendData.language_stats || {},
    },
    topics: backendData.topics?.map((topic: any) => ({
      topic_number: topic.id,
      words: topic.top_words,
      weights: topic.word_weights,
    })) || [],
    heatmap: {
      documents: backendData.document_indices || [],
      topics: backendData.topic_indices || [],
      probabilities: backendData.doc_topic_matrix || [],
    },
    timeline: {
      dates: backendData.timeline?.dates || [],
      topicCounts: backendData.timeline?.counts || {},
    },
    distance: {
      coordinates: backendData.topic_coordinates || [],
      labels: backendData.topic_labels || [],
      distances: backendData.distance_matrix || [],
    },
    sentiments: backendData.sentiment_analysis || [],
    coherence: {
      coherence_score: backendData.coherence?.overall || 0,
      per_topic_coherence: backendData.coherence?.per_topic || [],
      coherence_type: backendData.coherence?.type || 'c_v',
    },
  };
}
