import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ScrapeCommentsRequest, SystemInfoResponse } from '@/types';
import { api } from '@/lib/api';

interface ExtractionConfigProps {
  channel: string;
  onStartExtraction: (config: ScrapeCommentsRequest) => void;
  disabled?: boolean;
}

interface FormState {
  videoLimit: string;
  skipExisting: boolean;
  workers: number;
}

const DEFAULT_FORM_STATE: FormState = {
  videoLimit: '',
  skipExisting: false,
  workers: 2,
};

export function ExtractionConfig({
  channel,
  onStartExtraction,
  disabled = false,
}: ExtractionConfigProps) {
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);
  const [systemInfo, setSystemInfo] = useState<SystemInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch system info on mount
  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const info = await api.getSystemInfo();
        setSystemInfo(info);
        // Set default workers to default_workers from system info
        setFormState((prev) => ({
          ...prev,
          workers: info.default_workers,
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system info';
        setError(errorMessage);
        console.error('Failed to fetch system info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemInfo();
  }, []);

  const handleVideoLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow positive integers or empty string
    if (value === '' || /^\d+$/.test(value)) {
      setFormState((prev) => ({ ...prev, videoLimit: value }));
    }
  };

  const handleSkipExistingChange = (checked: boolean) => {
    setFormState((prev) => ({ ...prev, skipExisting: checked }));
  };

  const handleWorkersChange = (value: number[]) => {
    setFormState((prev) => ({ ...prev, workers: value[0] }));
  };

  const handleAddToQueue = async () => {
    if (!channel || !channel.trim()) {
      setError('Channel is required');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const config: ScrapeCommentsRequest = {
        channel: channel.trim(),
        skip_existing: formState.skipExisting,
        workers: formState.workers,
      };

      // Only add limit if provided
      if (formState.videoLimit) {
        config.limit = parseInt(formState.videoLimit, 10);
      }

      onStartExtraction(config);

      // Reset form after successful submission
      setFormState(DEFAULT_FORM_STATE);
      if (systemInfo) {
        setFormState((prev) => ({
          ...prev,
          workers: systemInfo.default_workers,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start extraction';
      setError(errorMessage);
      console.error('Failed to start extraction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extraction Configuration</CardTitle>
          <CardDescription>Configure extraction parameters</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading system info...</span>
        </CardContent>
      </Card>
    );
  }

  const maxWorkers = systemInfo?.max_workers || 4;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extraction Configuration</CardTitle>
        <CardDescription>
          Configure extraction parameters for {channel || 'selected channel'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Video Limit */}
        <div className="space-y-3">
          <Label htmlFor="video-limit">Video Limit (optional)</Label>
          <Input
            id="video-limit"
            type="text"
            inputMode="numeric"
            placeholder="All videos"
            value={formState.videoLimit}
            onChange={handleVideoLimitChange}
            disabled={disabled || isSubmitting}
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to extract comments from all videos, or enter a number to limit extraction.
          </p>
        </div>

        {/* Skip Existing Checkbox */}
        <div className="flex items-center space-x-3">
          <Checkbox
            id="skip-existing"
            checked={formState.skipExisting}
            onCheckedChange={handleSkipExistingChange}
            disabled={disabled || isSubmitting}
          />
          <div className="flex flex-col space-y-1">
            <Label
              htmlFor="skip-existing"
              className="font-medium cursor-pointer"
            >
              Skip already downloaded videos
            </Label>
            <p className="text-xs text-muted-foreground">
              Resume extraction by skipping videos that have already been downloaded.
            </p>
          </div>
        </div>

        {/* Workers Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="workers">Number of Workers</Label>
            <span className="text-sm font-medium">{formState.workers}</span>
          </div>
          <Slider
            id="workers"
            min={1}
            max={maxWorkers}
            step={1}
            value={[formState.workers]}
            onValueChange={handleWorkersChange}
            disabled={disabled || isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            Higher values speed up extraction but may trigger YouTube rate limits. Recommended: 1-2.
            {systemInfo && (
              <> (CPU cores: {systemInfo.cpu_count}, Max: {maxWorkers})</>
            )}
          </p>
        </div>

        {/* Add to Queue Button */}
        <Button
          onClick={handleAddToQueue}
          disabled={disabled || isSubmitting || !channel}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding to queue...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add to Queue
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
