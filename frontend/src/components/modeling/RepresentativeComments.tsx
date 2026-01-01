'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface RepresentativeCommentsProps {
  comments: string[];
  maxComments?: number;
}

/**
 * RepresentativeComments Component
 * Displays representative comments for a topic with expandable text and professional blockquote styling.
 */
export function RepresentativeComments({
  comments,
  maxComments = 5,
}: RepresentativeCommentsProps) {
  const displayComments = comments.slice(0, maxComments);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedComments(newExpanded);
  };

  const truncateComment = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim();
  };

  const isCommentTruncated = (text: string, maxLength: number = 150): boolean => {
    return text.length > maxLength;
  };

  if (!displayComments || displayComments.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Representative Comments</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground text-sm">
            No representative comments available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Representative Comments</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {displayComments.length} of {comments.length} comments
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-4">
            {displayComments.map((comment, index) => {
              const isExpanded = expandedComments.has(index);
              const isTruncated = isCommentTruncated(comment);
              const displayText = isTruncated
                ? truncateComment(comment)
                : comment;

              return (
                <div key={index} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <blockquote
                        className={cn(
                          'border-l-4 border-primary pl-4 py-1 text-sm leading-relaxed',
                          'text-muted-foreground italic'
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {isExpanded ? comment : displayText}
                          {isTruncated && !isExpanded && '...'}
                        </p>
                      </blockquote>
                      {isTruncated && (
                        <button
                          onClick={() => toggleExpand(index)}
                          className={cn(
                            'text-xs font-medium mt-2 transition-colors',
                            'text-primary hover:text-primary/80',
                            'focus:outline-none focus:underline'
                          )}
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  </div>

                  {index < displayComments.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
