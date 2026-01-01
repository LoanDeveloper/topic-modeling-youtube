import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, Database, Languages, Calendar, Sparkles } from 'lucide-react';
import { useChannels } from '@/hooks';
import { api } from '@/lib/api';
import type { ModelingSelectDataResponse } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DataSelectorProps {
  selectedChannels: string[];
  onChannelsChange: (channels: string[]) => void;
}

/**
 * DataSelector Component
 *
 * Multi-select dropdown for choosing channels for topic modeling.
 * Features a data preview showing statistics about selected channels.
 *
 * Features:
 * - Multi-select dropdown using Command component
 * - Search/filter channels
 * - Selected count badge
 * - Checkmarks on selected items
 * - Preview button to fetch data statistics
 * - Preview card showing:
 *   - Total comments
 *   - Language distribution
 *   - Date range
 *   - Recommended topic count
 */
export function DataSelector({ selectedChannels, onChannelsChange }: DataSelectorProps) {
  const [open, setOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ModelingSelectDataResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { channels, loading: loadingChannels } = useChannels();

  /**
   * Toggle channel selection
   */
  const toggleChannel = (channelFolder: string) => {
    const newSelection = selectedChannels.includes(channelFolder)
      ? selectedChannels.filter((c) => c !== channelFolder)
      : [...selectedChannels, channelFolder];
    onChannelsChange(newSelection);
  };

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    onChannelsChange([]);
    setPreviewData(null);
    setPreviewError(null);
  };

  /**
   * Fetch preview data for selected channels
   */
  const fetchPreview = async () => {
    if (selectedChannels.length === 0) {
      return;
    }

    try {
      setLoadingPreview(true);
      setPreviewError(null);
      const response = await api.modelingSelectData({
        channels: selectedChannels,
      });
      setPreviewData(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load preview';
      setPreviewError(errorMessage);
      console.error('Failed to load preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  /**
   * Clear preview when selection changes
   */
  useEffect(() => {
    setPreviewData(null);
    setPreviewError(null);
  }, [selectedChannels]);

  /**
   * Format date timestamp
   */
  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Format large numbers with K/M suffix
   */
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
  };

  /**
   * Get display text for the multi-select button
   */
  const getButtonText = (): string => {
    if (selectedChannels.length === 0) {
      return 'Select channels...';
    }
    if (selectedChannels.length === 1) {
      const channel = channels.find((c) => c.folder === selectedChannels[0]);
      return channel?.channel_name || selectedChannels[0];
    }
    return `${selectedChannels.length} channels selected`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Multi-select Dropdown */}
      <Card>
        <CardHeader>
          <CardTitle>Select Data Sources</CardTitle>
          <CardDescription>
            Choose one or more channels to analyze with topic modeling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropdown */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
                disabled={loadingChannels}
              >
                <span className="truncate">{getButtonText()}</span>
                <div className="flex items-center gap-2">
                  {selectedChannels.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedChannels.length}
                    </Badge>
                  )}
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search channels..." />
                <CommandList>
                  <CommandEmpty>No channels found.</CommandEmpty>
                  <CommandGroup>
                    {channels.map((channel) => {
                      const isSelected = selectedChannels.includes(channel.folder);
                      return (
                        <CommandItem
                          key={channel.folder}
                          value={channel.channel_name}
                          onSelect={() => toggleChannel(channel.folder)}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className={cn(
                                'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                                isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'opacity-50 [&_svg]:invisible'
                              )}
                            >
                              <Check className="h-3 w-3" />
                            </div>
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-medium">
                                {channel.channel_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatNumber(channel.comment_count)} comments • {channel.video_count} videos
                              </span>
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={clearSelection}
              disabled={selectedChannels.length === 0}
              className="flex-1"
            >
              Clear Selection
            </Button>
            <Button
              onClick={fetchPreview}
              disabled={selectedChannels.length === 0 || loadingPreview}
              className="flex-1 gap-2"
            >
              {loadingPreview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading Preview...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Preview Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Error */}
      {previewError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <span className="text-sm">{previewError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Data Card */}
      {previewData && !loadingPreview && (
        <Card className="border-primary/50 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Preview
            </CardTitle>
            <CardDescription>
              Statistics for {previewData.channels.length} selected channel(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Comments */}
              <div className="flex flex-col space-y-2 rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Database className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Comments</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatNumber(previewData.total_comments)}
                </p>
              </div>

              {/* Recommended Topics */}
              <div className="flex flex-col space-y-2 rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-medium">Recommended Topics</span>
                </div>
                <p className="text-2xl font-bold">
                  {previewData.recommended_topics}
                </p>
              </div>
            </div>

            {/* Language Distribution */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Languages className="h-4 w-4" />
                Language Distribution
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(previewData.language_distribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([lang, count]) => {
                    const percentage = ((count / previewData.total_comments) * 100).toFixed(1);
                    return (
                      <Badge key={lang} variant="secondary" className="gap-1">
                        <span className="font-mono text-xs uppercase">{lang}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{percentage}%</span>
                        <span className="text-muted-foreground text-xs">
                          ({formatNumber(count)})
                        </span>
                      </Badge>
                    );
                  })}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4" />
                Date Range
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {formatDate(previewData.date_range.start)}
                </span>
                <span>→</span>
                <span>
                  {formatDate(previewData.date_range.end)}
                </span>
              </div>
            </div>

            {/* Selected Channels List */}
            <div className="space-y-3 pt-4 border-t">
              <div className="text-sm font-semibold">Selected Channels</div>
              <div className="flex flex-wrap gap-2">
                {previewData.channels.map((channelFolder) => {
                  const channel = channels.find((c) => c.folder === channelFolder);
                  return (
                    <Badge key={channelFolder} variant="outline">
                      {channel?.channel_name || channelFolder}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loadingPreview && (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading data preview...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!previewData && !loadingPreview && !previewError && selectedChannels.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Database className="h-8 w-8 opacity-50" />
            <p className="text-sm">Click "Preview Data" to see statistics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
