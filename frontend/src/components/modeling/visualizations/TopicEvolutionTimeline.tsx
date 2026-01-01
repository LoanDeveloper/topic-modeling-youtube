import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface TopicEvolutionTimelineProps {
  data: {
    dates: string[];
    topicCounts: { [topicId: number]: number[] };
  };
  loading?: boolean;
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#6366f1', '#84cc16', '#f97316', '#14b8a6',
];

export function TopicEvolutionTimeline({ data, loading = false }: TopicEvolutionTimelineProps) {
  const [visibleTopics, setVisibleTopics] = useState<Set<number>>(new Set());

  const chartData = useMemo(() => {
    if (!data || !data.dates || !data.topicCounts) {
      return [];
    }

    return data.dates.map((date, idx) => {
      const point: any = { date };
      Object.keys(data.topicCounts).forEach((topicId) => {
        point[`topic_${topicId}`] = data.topicCounts[Number(topicId)][idx] || 0;
      });
      return point;
    });
  }, [data]);

  const topicIds = useMemo(() => {
    if (!data || !data.topicCounts) return [];
    return Object.keys(data.topicCounts).map(Number).sort((a, b) => a - b);
  }, [data]);

  // Initialize visible topics (show first 5 by default)
  useMemo(() => {
    if (topicIds.length > 0 && visibleTopics.size === 0) {
      setVisibleTopics(new Set(topicIds.slice(0, 5)));
    }
  }, [topicIds, visibleTopics.size]);

  const toggleTopic = (topicId: number) => {
    setVisibleTopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Topic Evolution Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px]">
            <div className="animate-pulse text-muted-foreground">Loading timeline...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.dates || data.dates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Topic Evolution Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px] text-muted-foreground">
            No timeline data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Topic Evolution Over Time</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Track how topic prevalence changes over time
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-muted/30 rounded-lg">
          <Label className="text-sm font-semibold mb-2 block">Toggle Topics:</Label>
          <div className="flex flex-wrap gap-4">
            {topicIds.map((topicId) => (
              <div key={topicId} className="flex items-center space-x-2">
                <Checkbox
                  id={`topic-${topicId}`}
                  checked={visibleTopics.has(topicId)}
                  onCheckedChange={() => toggleTopic(topicId)}
                />
                <label
                  htmlFor={`topic-${topicId}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  style={{ color: COLORS[topicId % COLORS.length] }}
                >
                  Topic {topicId}
                </label>
              </div>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              label={{ value: 'Topic Count', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            {topicIds.map((topicId) =>
              visibleTopics.has(topicId) ? (
                <Line
                  key={topicId}
                  type="monotone"
                  dataKey={`topic_${topicId}`}
                  name={`Topic ${topicId}`}
                  stroke={COLORS[topicId % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  animationDuration={500}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Use the checkboxes above to show/hide topics. Showing {visibleTopics.size} of {topicIds.length} topics.</p>
        </div>
      </CardContent>
    </Card>
  );
}
