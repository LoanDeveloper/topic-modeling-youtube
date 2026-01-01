import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell } from 'recharts';
import { useMemo } from 'react';

interface TopicHeatmapProps {
  data: {
    documents: number[];
    topics: number[];
    probabilities: number[][];
  };
  loading?: boolean;
}

export function TopicHeatmap({ data, loading = false }: TopicHeatmapProps) {
  const chartData = useMemo(() => {
    if (!data || !data.probabilities || data.probabilities.length === 0) {
      return [];
    }

    const result: Array<{ x: number; y: number; z: number }> = [];

    // Sample documents if too many (max 100 for performance)
    const maxDocuments = 100;
    const documentStep = Math.max(1, Math.floor(data.documents.length / maxDocuments));
    const sampledDocIndices = data.documents.filter((_, i) => i % documentStep === 0).slice(0, maxDocuments);

    sampledDocIndices.forEach((docIdx, sampledIdx) => {
      data.topics.forEach((topicIdx) => {
        if (data.probabilities[docIdx] && data.probabilities[docIdx][topicIdx] !== undefined) {
          result.push({
            x: topicIdx,
            y: sampledIdx,
            z: data.probabilities[docIdx][topicIdx],
          });
        }
      });
    });

    return result;
  }, [data]);

  // Color scale function
  const getColor = (probability: number) => {
    const intensity = Math.floor(probability * 255);
    return `rgb(${255 - intensity}, ${255 - intensity * 0.5}, 255)`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document-Topic Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-pulse text-muted-foreground">Loading heatmap...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.probabilities || data.probabilities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document-Topic Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No distribution data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document-Topic Distribution</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Heatmap showing probability distribution across topics and documents
          {data.documents.length > 100 && ` (sampled from ${data.documents.length} documents)`}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
          >
            <XAxis
              type="number"
              dataKey="x"
              name="Topic"
              domain={[0, Math.max(...data.topics)]}
              label={{ value: 'Topic', position: 'insideBottom', offset: -10 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Document"
              label={{ value: 'Document (sampled)', angle: -90, position: 'insideLeft' }}
            />
            <ZAxis type="number" dataKey="z" range={[50, 400]} name="Probability" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                      <p className="font-semibold">Topic {data.x}</p>
                      <p className="text-sm">Document: {data.y}</p>
                      <p className="text-sm">Probability: {(data.z * 100).toFixed(2)}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter data={chartData} shape="square">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.z)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
