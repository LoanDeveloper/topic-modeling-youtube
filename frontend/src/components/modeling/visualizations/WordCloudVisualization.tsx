import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface WordCloudVisualizationProps {
  topics: Array<{
    topic_number: number;
    words: string[];
    weights: number[];
  }>;
  loading?: boolean;
}

export function WordCloudVisualization({ topics, loading = false }: WordCloudVisualizationProps) {
  const [selectedWord, setSelectedWord] = useState<{ word: string; weight: number } | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Topic Word Clouds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px]">
            <div className="animate-pulse text-muted-foreground">Loading word clouds...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Topic Word Clouds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px] text-muted-foreground">
            No topic data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Topic Word Clouds</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Top words for each topic sized by importance
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={`topic-${topics[0].topic_number}`} className="w-full">
          <TabsList className="grid w-full overflow-x-auto" style={{ gridTemplateColumns: `repeat(${Math.min(topics.length, 10)}, 1fr)` }}>
            {topics.slice(0, 10).map((topic) => (
              <TabsTrigger key={topic.topic_number} value={`topic-${topic.topic_number}`}>
                Topic {topic.topic_number}
              </TabsTrigger>
            ))}
          </TabsList>

          {topics.map((topic) => (
            <TabsContent key={topic.topic_number} value={`topic-${topic.topic_number}`}>
              <div className="relative min-h-[400px] bg-muted/30 rounded-lg p-8">
                <div className="flex flex-wrap justify-center items-center gap-4">
                  {topic.words.map((word, idx) => {
                    const weight = topic.weights[idx];
                    const maxWeight = Math.max(...topic.weights);
                    const minWeight = Math.min(...topic.weights);
                    const normalizedSize = ((weight - minWeight) / (maxWeight - minWeight)) * 3 + 1;

                    // Color palette
                    const colors = [
                      'text-blue-600',
                      'text-purple-600',
                      'text-pink-600',
                      'text-indigo-600',
                      'text-cyan-600',
                      'text-teal-600',
                    ];
                    const color = colors[idx % colors.length];

                    return (
                      <button
                        key={`${word}-${idx}`}
                        onClick={() => setSelectedWord({ word, weight })}
                        className={`${color} font-semibold hover:opacity-70 transition-opacity cursor-pointer`}
                        style={{ fontSize: `${normalizedSize}rem` }}
                        aria-label={`Word: ${word}, weight: ${weight.toFixed(4)}`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>

                {selectedWord && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <Badge variant="secondary" className="text-sm">
                      <span className="font-semibold">{selectedWord.word}</span>
                      <span className="ml-2 text-muted-foreground">
                        Weight: {selectedWord.weight.toFixed(4)}
                      </span>
                    </Badge>
                  </div>
                )}
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                <p>Click on any word to see its weight. Larger words have higher importance in this topic.</p>
              </div>
            </TabsContent>
          ))}

          {topics.length > 10 && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              Showing first 10 topics. Total topics: {topics.length}
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
