import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { Topic } from '@/types';
import { cn } from '@/lib/utils';

interface TopicsListProps {
  topics: Topic[];
  selectedTopicId?: number;
  onSelectTopic: (topicId: number) => void;
}

export function TopicsList({ topics, selectedTopicId, onSelectTopic }: TopicsListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter topics based on search query
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) {
      return topics;
    }

    const query = searchQuery.toLowerCase();
    return topics.filter((topic) => {
      // Search in topic label
      if (topic.label.toLowerCase().includes(query)) {
        return true;
      }

      // Search in keywords
      return topic.words.some(([word]) => word.toLowerCase().includes(query));
    });
  }, [topics, searchQuery]);

  // Get opacity based on word weight
  const getWordOpacity = (weight: number, maxWeight: number): number => {
    if (maxWeight === 0) return 0.5;
    // Map weight to opacity range 0.4-1.0
    const normalized = weight / maxWeight;
    return 0.4 + normalized * 0.6;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Topics</CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {filteredTopics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? 'No topics found matching your search.'
                : 'No topics available.'}
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredTopics.map((topic) => {
                const maxWeight = Math.max(...topic.words.map(([, w]) => w));
                const isSelected = selectedTopicId === topic.id;

                return (
                  <AccordionItem
                    key={topic.id}
                    value={`topic-${topic.id}`}
                    className={cn(
                      'border rounded-lg mb-2 transition-all duration-200',
                      isSelected && 'border-primary bg-primary/5'
                    )}
                  >
                    <AccordionTrigger
                      className={cn(
                        'px-4 hover:no-underline hover:bg-accent/50 rounded-t-lg',
                        isSelected && 'text-primary font-medium'
                      )}
                      onClick={(e) => {
                        // Allow accordion toggle
                        e.stopPropagation();
                      }}
                    >
                      <div
                        className="flex items-center justify-between w-full pr-2 cursor-pointer"
                        onClick={(e) => {
                          // Select topic when clicking on the content area
                          e.stopPropagation();
                          onSelectTopic(topic.id);
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm font-medium truncate">
                            {topic.label}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="ml-2 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTopic(topic.id);
                          }}
                        >
                          {topic.document_count} docs
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground font-medium">
                          Top Keywords:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {topic.words.slice(0, 5).map(([word, weight], idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                              style={{
                                opacity: getWordOpacity(weight, maxWeight),
                              }}
                            >
                              {word}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
