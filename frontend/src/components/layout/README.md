# Layout Components

This directory contains the main layout components for the YouTube Topic Modeling application.

## Components

### AppSidebar

The main navigation sidebar component with dark theme styling.

**Features:**
- Logo/title: "YouTube Topic Modeling"
- Navigation items with icons:
  - Extraction (Download icon) - `/`
  - Data (Database icon) - `/data`
  - Modeling (Brain icon) - `/modeling`
- Active state highlighting with primary color
- Responsive hover states
- Footer with app description

**Usage:**
```tsx
import { AppSidebar } from "@/components/layout/AppSidebar";

<AppSidebar />
```

### MainLayout

The main layout wrapper that includes the sidebar and content area.

**Features:**
- Dark mode enabled by default (`className="dark"`)
- Sidebar on the left
- Scrollable main content area
- Responsive padding
- Includes Toaster from sonner for notifications

**Props:**
- `children: React.ReactNode` - Content to render in the main area

**Usage:**
```tsx
import { MainLayout } from "@/components/layout/MainLayout";

<MainLayout>
  <YourPageContent />
</MainLayout>
```

### PageHeader

A reusable page header component for consistent page titles.

**Features:**
- Large title with bold tracking
- Optional description text
- Optional actions slot for buttons/controls
- Separator for visual division

**Props:**
- `title: string` - Page title (required)
- `description?: string` - Optional page description
- `actions?: ReactNode` - Optional action buttons or controls

**Usage:**
```tsx
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

<PageHeader
  title="Comment Extraction"
  description="Extract YouTube comments from channels for analysis"
  actions={
    <Button>New Extraction</Button>
  }
/>
```

## Styling

All components use:
- Tailwind CSS with shadcn/ui design system
- Dark theme colors from `index.css`
- Responsive design with mobile support
- lucide-react icons
- clsx + tailwind-merge for conditional classes (via `cn()` utility)

## Navigation

Navigation uses `react-router-dom` with the following routes:
- `/` - Extraction page
- `/data` - Data management page
- `/modeling` - Topic modeling page

Active states are automatically highlighted based on the current route.
