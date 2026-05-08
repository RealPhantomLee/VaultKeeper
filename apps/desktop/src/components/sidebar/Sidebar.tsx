import { FileTree } from "./FileTree";
import { SearchPanel } from "./SearchPanel";
import { GraphPanel } from "./GraphPanel";
import { BacklinksPanel } from "./BacklinksPanel";
import { TagsPanel } from "./TagsPanel";
import { useSidebarStore } from "@stores/sidebar";
import { cn } from "@utils/cn";
import {
  Files,
  Search,
  GitGraph,
  Link,
  Hash,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  MoreHorizontal,
} from "lucide-react";

const panelIcons = {
  files: Files,
  search: Search,
  graph: GitGraph,
  backlinks: Link,
  tags: Hash,
  outline: MoreHorizontal,
} as const;

const panelComponents = {
  files: FileTree,
  search: SearchPanel,
  graph: GraphPanel,
  backlinks: BacklinksPanel,
  tags: TagsPanel,
  outline: () => <div className="p-4 text-foreground-muted">Outline</div>,
} as const;

export function Sidebar() {
  const { left, toggleLeftPanel, setActiveLeftPanel } = useSidebarStore();
  const ActivePanel = panelComponents[left.activeLeftPanel];

  return (
    <div
      className="h-full flex flex-col border-r border-border bg-background-secondary"
      role="navigation"
      aria-label="Sidebar"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground truncate">VaultKeeper</h2>
        <button
          onClick={toggleLeftPanel}
          className="p-1 rounded hover:bg-background-hover text-foreground-muted"
          aria-label={left.leftCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-border" role="tablist" aria-label="Sidebar panels">
        {(["files", "search", "graph", "backlinks", "tags"] as const).map((panel) => {
          const Icon = panelIcons[panel];
          const isActive = left.activeLeftPanel === panel;
          return (
            <button
              key={panel}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${panel}`}
              onClick={() => setActiveLeftPanel(panel)}
              className={cn(
                "flex-1 flex justify-center py-2 border-b-2 transition-colors",
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-foreground-muted hover:text-foreground",
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="sr-only">{panel}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`panel-${left.activeLeftPanel}`}
        role="tabpanel"
        className="flex-1 overflow-auto"
      >
        <ActivePanel />
      </div>
    </div>
  );
}
