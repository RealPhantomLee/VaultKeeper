import { useState } from "react";
import { useVaultStore } from "@stores/vault";
import { useEditorStore } from "@stores/editor";
import { cn } from "@utils/cn";
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
  noteId?: string;
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  for (const path of paths) {
    const parts = path.split("/");
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!map.has(currentPath)) {
        const node: TreeNode = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "folder",
        };
        if (isFile) {
          node.noteId = path;
        } else {
          node.children = [];
        }
        map.set(currentPath, node);

        if (i === 0) {
          root.push(node);
        } else {
          const parentPath = parts.slice(0, i).join("/");
          const parent = map.get(parentPath);
          if (parent?.children) {
            parent.children.push(node);
          }
        }
      }
    }
  }

  return root;
}

function TreeNodeComponent({
  node,
  depth = 0,
}: {
  node: TreeNode;
  depth?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { notes } = useVaultStore();
  const { state, openNote } = useEditorStore();

  if (node.type === "file") {
    const note = node.noteId ? notes.get(node.noteId) : null;
    const isActive = state.activeNoteId === node.noteId;

    return (
      <button
        onClick={() => node.noteId && openNote(node.noteId)}
        className={cn(
          "w-full flex items-center gap-1.5 px-2 py-1 text-sm rounded hover:bg-background-hover",
          isActive && "bg-background-active text-accent",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        aria-label={`Open ${node.name}`}
      >
        <FileText className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
        <span className="truncate">{node.name.replace(/\.md$/, "")}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-sm rounded hover:bg-background-hover"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.name} folder`}
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isExpanded && node.children && (
        <div>
          {node.children
            .sort((a, b) => {
              if (a.type === "folder" && b.type === "file") return -1;
              if (a.type === "file" && b.type === "folder") return 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <TreeNodeComponent key={child.path} node={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const { notes } = useVaultStore();
  const paths = Array.from(notes.values())
    .filter((n) => !n.isDeleted)
    .map((n) => n.path);

  const tree = buildTree(paths);

  return (
    <div className="p-2" role="tree" aria-label="File tree">
      {tree
        .sort((a, b) => {
          if (a.type === "folder" && b.type === "file") return -1;
          if (a.type === "file" && b.type === "folder") return 1;
          return a.name.localeCompare(b.name);
        })
        .map((node) => (
          <TreeNodeComponent key={node.path} node={node} />
        ))}

      {tree.length === 0 && (
        <div className="p-4 text-center text-foreground-muted text-sm">
          No notes yet. Create one with Ctrl+N
        </div>
      )}
    </div>
  );
}
