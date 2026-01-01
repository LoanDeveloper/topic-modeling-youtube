'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Topic } from '@/types';
import { TopicKeywords } from './TopicKeywords';
import { RepresentativeComments } from './RepresentativeComments';

/**
 * Props for TopicDetailPanel component
 */
interface TopicDetailPanelProps {
  topic: Topic | null;
  open: boolean;
  onClose: () => void;
}

/**
 * TopicDetailPanel Component
 * Displays comprehensive details about a selected topic in a right-side sheet panel
 * Includes keywords, representative comments, and statistics
 */
export const TopicDetailPanel: React.FC<TopicDetailPanelProps> = ({
  topic,
  open,
  onClose,
}) => {
  if (!topic) return null;

  // Calculate statistics
  const totalWordWeight = topic.words.reduce((sum, [_, weight]) => sum + weight, 0);
  const avgWeight = totalWordWeight / (topic.words.length || 1);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-hidden flex flex-col">
        {/* Header Section */}
        <SheetHeader className="space-y-1 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <SheetTitle className="text-2xl font-bold break-words">
                Topic {topic.id}
              </SheetTitle>
              <SheetDescription className="mt-2 text-base font-medium text-foreground">
                {topic.label}
              </SheetDescription>
            </div>
          </div>
          <Separator className="mt-4" />
        </SheetHeader>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 overflow-hidden -mx-6">
          <div className="px-6 space-y-6">
            {/* Document Count Card */}
            <Card className="bg-secondary/50 border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{topic.document_count}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Comments associated with this topic
                </p>
              </CardContent>
            </Card>

            <Separator />

            {/* Keywords Section - Using TopicKeywords Component */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground">Top Keywords</h3>
              {topic.words.length > 0 ? (
                <TopicKeywords words={topic.words} maxWords={10} />
              ) : (
                <p className="text-sm text-muted-foreground italic">No keywords available</p>
              )}
            </div>

            <Separator />

            {/* Representative Comments Section - Using RepresentativeComments Component */}
            <div className="space-y-3">
              <RepresentativeComments comments={topic.representative_comments} maxComments={3} />
            </div>

            <Separator />

            {/* Statistics Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground">Statistics</h3>
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-secondary/50 border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      Word Count
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{topic.words.length}</div>
                  </CardContent>
                </Card>

                <Card className="bg-secondary/50 border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      Avg Weight
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{avgWeight.toFixed(3)}</div>
                  </CardContent>
                </Card>

                <Card className="bg-secondary/50 border-0 col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      Total Weight
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalWordWeight.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom padding for scroll area */}
            <div className="h-4" />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default TopicDetailPanel;
