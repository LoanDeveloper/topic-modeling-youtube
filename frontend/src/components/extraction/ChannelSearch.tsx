import { useState } from 'react';
import { Search, AlertCircle, Loader2, Users, BarChart3, FileText } from 'lucide-react';
import { useChannelInfo } from '@/hooks';
import type { ChannelInfoResponse } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ChannelSearchProps {
  onChannelSelect?: (channel: ChannelInfoResponse) => void;
}

/**
 * ChannelSearch Component
 *
 * Allows users to search for YouTube channels by handle, ID, or URL
 * and preview channel information before extraction.
 *
 * Features:
 * - Search input for channel handle/ID/URL
 * - Real-time loading state
 * - Channel preview card with key statistics
 * - Formatted subscriber count (e.g., 1.2M)
 * - Error handling with user-friendly messages
 * - Optional callback when channel is selected
 */
export function ChannelSearch({ onChannelSelect }: ChannelSearchProps) {
  const [searchInput, setSearchInput] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<ChannelInfoResponse | null>(null);
  const { fetchChannelInfo, loading, error } = useChannelInfo();

  /**
   * Format subscriber count with units (K, M, B)
   */
  const formatSubscriberCount = (count: number | null): string => {
    if (count === null) {
      return 'N/A';
    }

    if (count >= 1_000_000_000) {
      return `${(count / 1_000_000_000).toFixed(1)}B`;
    }
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1)}K`;
    }
    return count.toString();
  };

  /**
   * Truncate text to specified length with ellipsis
   */
  const truncateText = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  };

  /**
   * Handle search button click or Enter key press
   */
  const handleSearch = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
    }

    if (!searchInput.trim()) {
      return;
    }

    try {
      const channelData = await fetchChannelInfo(searchInput.trim());
      setSelectedChannel(channelData);
      onChannelSelect?.(channelData);
    } catch (err) {
      // Error is already set in the hook
      setSelectedChannel(null);
    }
  };

  /**
   * Clear search and reset state
   */
  const handleClear = () => {
    setSearchInput('');
    setSelectedChannel(null);
  };

  return (
    <div className="w-full space-y-6">
      {/* Search Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Search Channel</CardTitle>
          <CardDescription>
            Enter a YouTube channel handle (@handle), channel ID, or full URL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., @YouTube, UCxxxxxxx, or youtube.com/@YouTube"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={loading || !searchInput.trim()}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Search Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Channel Preview Card */}
      {selectedChannel && !loading && (
        <Card className="border-primary/50 bg-card">
          <CardHeader>
            <div className="flex flex-col gap-2">
              <CardTitle className="text-2xl">{selectedChannel.channel_name}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Channel ID: {selectedChannel.channel_id}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Channel Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              {/* Subscriber Count */}
              <div className="flex flex-col items-center space-y-2 rounded-lg bg-muted/50 p-4">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <Badge variant="secondary" className="mb-2">
                    Subscribers
                  </Badge>
                  <p className="text-xl font-bold">
                    {formatSubscriberCount(selectedChannel.subscriber_count)}
                  </p>
                </div>
              </div>

              {/* Video Count */}
              <div className="flex flex-col items-center space-y-2 rounded-lg bg-muted/50 p-4">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <Badge variant="secondary" className="mb-2">
                    Videos
                  </Badge>
                  <p className="text-xl font-bold">{selectedChannel.video_count}</p>
                </div>
              </div>

              {/* Comment Potential */}
              <div className="flex flex-col items-center space-y-2 rounded-lg bg-muted/50 p-4">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <Badge variant="secondary" className="mb-2">
                    Extractable
                  </Badge>
                  <p className="text-sm font-medium text-foreground">
                    {selectedChannel.video_count > 0 ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {selectedChannel.description && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {truncateText(selectedChannel.description, 200)}
                </p>
              </div>
            )}

            {/* Channel URL */}
            {selectedChannel.channel_url && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Channel URL</h4>
                <a
                  href={selectedChannel.channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {selectedChannel.channel_url}
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleClear} variant="outline" className="flex-1">
                Clear
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={() => onChannelSelect?.(selectedChannel)}
              >
                Use This Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading channel information...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedChannel && !loading && !error && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Search className="h-8 w-8 opacity-50" />
            <p className="text-sm">Enter a channel handle or ID to preview channel information</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
