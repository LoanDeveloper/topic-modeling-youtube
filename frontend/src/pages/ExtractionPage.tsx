import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChannelSearch } from "@/components/extraction/ChannelSearch";
import { ExtractionConfig } from "@/components/extraction/ExtractionConfig";
import { ExtractionQueue } from "@/components/extraction/ExtractionQueue";
import { useExtraction } from "@/hooks/useExtraction";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { ChannelInfoResponse, ScrapeCommentsRequest } from "@/types";

export function ExtractionPage() {
  const [channel, setChannel] = useState<string>("");

  const { startExtraction, error: extractionError } = useExtraction();

  const handleChannelSelect = (info: ChannelInfoResponse) => {
    setChannel(info.channel_id);
  };

  const handleStartExtraction = async (config: ScrapeCommentsRequest) => {
    await startExtraction(config);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comment Extraction"
        description="Extract YouTube comments from channels for analysis"
      />

      {/* Channel Search */}
      <ChannelSearch onChannelSelect={handleChannelSelect} />

      {/* Extraction Configuration */}
      {channel && (
        <ExtractionConfig
          channel={channel}
          onStartExtraction={handleStartExtraction}
        />
      )}

      {/* Error Display */}
      {extractionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{extractionError}</AlertDescription>
        </Alert>
      )}

      {/* Extraction Queue */}
      <ExtractionQueue />
    </div>
  );
}
