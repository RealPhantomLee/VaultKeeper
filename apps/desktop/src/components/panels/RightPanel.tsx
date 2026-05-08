import { BacklinksPanel } from "../sidebar/BacklinksPanel";
import { TagsPanel } from "../sidebar/TagsPanel";
import { useSidebarStore } from "@stores/sidebar";
import { cn } from "@utils/cn";
import {
  Link,
  Hash,
  ListTree,
  PanelRightClose,
  Settings,
} from "lucide-react";

const panelComponents = {
  backlinks: BacklinksPanel,
  tags: TagsPanel,
  outline: () => <div className="p-4 text-foreground-muted text-sm">Outline</div>,
  properties: () => <div className="p-4 text-foreground-muted text-sm">Properties</div>,
  sync: () => <div className="p-4 text-foreground-muted text-sm">Sync Status</div>,
} as const;

const panelIcons = {
  backlinks: Link,
  tags: Hash,
  outline: ListTree,
  properties: Settings,
  sync: Link,
} as const;

export function RightPanel() {
  const { left, toggleRightPanel, setActiveRightPanel } = useSidebarStore();
  const ActivePanel = panelComponents[left.activeRightPanel];

  return (
    <div className="h-full flex flex-col border-l border-border bg-background-secondary">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Right Panel</h2>
        <button
          onClick={toggleRightPanel}
          className="p-1 rounded hover:bg-background-hover text-foreground-muted"
          aria-label="Close right panel"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-border">
        {(["backlinks", "tags", "outline", "properties"] as const).map((panel) => {
          const Icon = panelIcons[panel];
          const isActive = left.activeRightPanel === panel;
          return (
            <button
              key={panel}
              onClick={() => setActiveRightPanel(panel)}
              className={cn(
                "flex-1 flex justify-center py-2 border-b-2 transition-colors",
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-foreground-muted hover:text-foreground",
              )}
              aria-label={panel}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto">
        <ActivePanel />
      </div>
    </div>
  );
}
