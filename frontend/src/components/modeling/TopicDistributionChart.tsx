import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Topic } from '@/types';

interface TopicDistributionChartProps {
  topics: Topic[];
}

/**
 * TopicDistributionChart Component
 * Displays a bar chart showing document count per topic with top words on hover
 */
export const TopicDistributionChart: React.FC<TopicDistributionChartProps> = ({ topics }) => {
  // Sort topics by ID for consistent display
  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => a.id - b.id);
  }, [topics]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const labels = sortedTopics.map((topic) => `Topic ${topic.id}`);
    const documentCounts = sortedTopics.map((topic) => topic.document_count);

    // Create hover text with top words
    const hoverTexts = sortedTopics.map((topic) => {
      const topWords = topic.words
        .slice(0, 5)
        .map((word) => `${word[0]} (${(word[1] * 100).toFixed(1)}%)`)
        .join('<br>');

      return (
        `<b>Topic ${topic.id}</b><br>` +
        `Documents: ${topic.document_count}<br>` +
        `<b>Top Words:</b><br>` +
        topWords
      );
    });

    return [
      {
        x: labels,
        y: documentCounts,
        type: 'bar' as const,
        marker: {
          color: '#3b82f6',
        },
        hovertemplate: '%{customdata}<extra></extra>',
        customdata: hoverTexts,
      },
    ];
  }, [sortedTopics]);

  // Plotly layout configuration
  const layout = {
    title: {
      text: 'Topic Distribution',
      font: {
        size: 16,
        color: '#888',
      },
    },
    xaxis: {
      title: {
        text: 'Topics',
        font: {
          size: 12,
          color: '#888',
        },
      },
      tickfont: {
        color: '#888',
      },
      gridcolor: '#2a2a2a',
    },
    yaxis: {
      title: {
        text: 'Document Count',
        font: {
          size: 12,
          color: '#888',
        },
      },
      tickfont: {
        color: '#888',
      },
      gridcolor: '#2a2a2a',
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: {
      l: 60,
      r: 40,
      t: 50,
      b: 60,
    },
    font: {
      family: 'inherit',
    },
  };

  // Plotly configuration
  const config = {
    responsive: true,
    displayModeBar: false,
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Topic Distribution</CardTitle>
        <CardDescription>
          Number of documents assigned to each topic
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
          <Plot
            data={chartData}
            layout={layout}
            config={config}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default TopicDistributionChart;
