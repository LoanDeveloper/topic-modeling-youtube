import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, ZAxis, Cell, Label } from 'recharts';
import { useState } from 'react';

interface InterTopicDistanceProps {
  data: {
    coordinates: [number, number][];
    labels: string[];
    distances: number[][];
  };
  loading?: boolean;
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#6366f1', '#84cc16', '#f97316', '#14b8a6',
  '#f43f5e', '#a855f7', '#0ea5e9', '#22c55e', '#eab308',
];

export function InterTopicDistance({ data, loading = false }: InterTopicDistanceProps) {
  const [hoveredTopic, setHoveredTopic] = useState<number | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inter-Topic Distance Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px]">
            <div className="animate-pulse text-muted-foreground">Loading distance map...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.coordinates || data.coordinates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inter-Topic Distance Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px] text-muted-foreground">
            No distance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.coordinates.map(([x, y], idx) => ({
    x,
    y,
    z: 100, // Size of points
    topic: idx,
    label: data.labels[idx] || `Topic ${idx}`,
  }));

  const getDistance = (topic1: number, topic2: number): number => {
    if (!data.distances || !data.distances[topic1] || !data.distances[topic1][topic2]) {
      // Calculate Euclidean distance from coordinates if distances not provided
      const [x1, y1] = data.coordinates[topic1];
      const [x2, y2] = data.coordinates[topic2];
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    return data.distances[topic1][topic2];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inter-Topic Distance Map</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          2D visualization of topic similarity (closer = more similar)
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis
              type="number"
              dataKey="x"
              name="Dimension 1"
              tick={{ fontSize: 12 }}
            >
              <Label value="Dimension 1" offset={-10} position="insideBottom" />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              name="Dimension 2"
              tick={{ fontSize: 12 }}
            >
              <Label value="Dimension 2" angle={-90} position="insideLeft" />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[400, 800]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const point = payload[0].payload;
                  return (
                    <div className="bg-background border border-border rounded-lg shadow-lg p-4">
                      <p className="font-semibold text-lg mb-2">{point.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Position: ({point.x.toFixed(3)}, {point.y.toFixed(3)})
                      </p>
                      {hoveredTopic !== null && hoveredTopic !== point.topic && (
                        <p className="text-sm mt-2 font-medium">
                          Distance to Topic {hoveredTopic}: {getDistance(point.topic, hoveredTopic).toFixed(3)}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter
              data={chartData}
              onMouseEnter={(data: any) => setHoveredTopic(data.topic)}
              onMouseLeave={() => setHoveredTopic(null)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.topic % COLORS.length]}
                  opacity={hoveredTopic === null || hoveredTopic === entry.topic ? 1 : 0.3}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {chartData.map((point) => (
            <div
              key={point.topic}
              className="flex items-center gap-2 text-sm"
              onMouseEnter={() => setHoveredTopic(point.topic)}
              onMouseLeave={() => setHoveredTopic(null)}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: COLORS[point.topic % COLORS.length] }}
              />
              <span className={hoveredTopic === point.topic ? 'font-semibold' : ''}>
                {point.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Hover over points to see distances between topics. Topics closer together are more similar.</p>
        </div>
      </CardContent>
    </Card>
  );
}
