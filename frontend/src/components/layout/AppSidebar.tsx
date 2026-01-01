import { Download, Database, Brain } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const navigation = [
  {
    name: "Extraction",
    href: "/",
    icon: Download,
  },
  {
    name: "Data",
    href: "/data",
    icon: Database,
  },
  {
    name: "Modeling",
    href: "/modeling",
    icon: Brain,
  },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Logo/Title */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <h1 className="text-xl font-semibold text-foreground">
          YouTube Topic Modeling
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <Separator className="my-2" />

      {/* Footer */}
      <div className="p-4">
        <p className="text-xs text-muted-foreground">
          Extract, analyze, and model YouTube comments
        </p>
      </div>
    </div>
  );
}
