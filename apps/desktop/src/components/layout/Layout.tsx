import { Sidebar } from "../sidebar/Sidebar";
import { EditorArea } from "../editor/EditorArea";
import { RightPanel } from "../panels/RightPanel";
import { useSidebarStore } from "@stores/sidebar";
import { StatusBar } from "./StatusBar";

export function Layout() {
  const { left } = useSidebarStore();

  return (
    <div className="flex flex-1 overflow-hidden" role="main">
      <div
        className={`transition-all duration-200 ${left.leftCollapsed ? "w-0" : "w-sidebar"} overflow-hidden`}
        aria-hidden={left.leftCollapsed}
      >
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 min-w-0">
            <EditorArea />
          </div>

          <div
            className={`transition-all duration-200 ${left.rightCollapsed ? "w-0" : "w-72"} overflow-hidden`}
            aria-hidden={left.rightCollapsed}
          >
            <RightPanel />
          </div>
        </div>

        <StatusBar />
      </div>
    </div>
  );
}
