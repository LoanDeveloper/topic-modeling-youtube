# ExtractionConfig Component Usage

## Overview
The `ExtractionConfig` component provides a form for configuring YouTube comment extraction parameters.

## Props

```typescript
interface ExtractionConfigProps {
  channel: string;                    // Channel name/ID to extract from
  onStartExtraction: (config: ScrapeCommentsRequest) => void;  // Callback when submission succeeds
  disabled?: boolean;                 // Optional: disable form while processing
}
```

## Features

1. **Video Limit Input**
   - Optional number input for limiting videos
   - Accepts positive integers only
   - Empty = extract all videos

2. **Skip Existing Checkbox**
   - Resume extraction by skipping already downloaded videos
   - Useful for interrupted extractions

3. **Workers Slider**
   - Controls parallel extraction workers (1 to max_workers)
   - Default: system's default_workers value
   - Shows CPU core count and max workers for reference
   - Higher values speed up extraction but may trigger rate limits

4. **Add to Queue Button**
   - Disabled until channel is provided
   - Shows loading state during submission
   - Calls onStartExtraction callback with complete config

## Usage Example

```tsx
import { ExtractionConfig } from '@/components/extraction';
import { useExtraction } from '@/hooks';
import { useState } from 'react';

export function ExtractionTab() {
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const { startExtraction } = useExtraction();

  const handleStartExtraction = async (config) => {
    try {
      await startExtraction(config);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div className="space-y-6">
      {/* Channel search component */}
      
      <ExtractionConfig
        channel={selectedChannel}
        onStartExtraction={handleStartExtraction}
        disabled={false}
      />
    </div>
  );
}
```

## Form State

The component manages internal state for:
- `videoLimit`: Optional video count limit
- `skipExisting`: Boolean flag for skipping downloaded videos
- `workers`: Number of parallel workers

## API Integration

- Fetches `SystemInfo` on mount to determine max workers
- Creates `ScrapeCommentsRequest` with configured parameters
- Only includes `limit` in request if video limit is provided

## Error Handling

- Displays alert if channel is not provided
- Fetches system info with error handling
- Displays submission errors in red alert
- Includes helpful explanatory text for each field
