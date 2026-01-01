import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataOverview } from "@/components/data/DataOverview";
import { ChannelTable } from "@/components/data/ChannelTable";
import { ChannelDetail } from "@/components/data/ChannelDetail";
import { useChannels } from "@/hooks/useChannels";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function DataPage() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const { error, refresh } = useChannels();

  const handleSelectChannel = (channelFolder: string) => {
    setSelectedChannel(channelFolder);
  };

  const handleBackToTable = () => {
    setSelectedChannel(null);
    refresh(); // Refresh data when returning to table
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Management"
        description="View and manage extracted YouTube comments"
      />

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Show overview and table when no channel selected */}
      {!selectedChannel && (
        <>
          {/* Data Overview Stats */}
          <DataOverview />

          <Separator />

          {/* Channel Table */}
          <ChannelTable onSelectChannel={handleSelectChannel} />
        </>
      )}

      {/* Show channel detail when selected */}
      {selectedChannel && (
        <ChannelDetail folder={selectedChannel} onClose={handleBackToTable} />
      )}
    </div>
  );
}
