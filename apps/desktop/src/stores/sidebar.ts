import { create } from "zustand";
import { SidebarState } from "@vaultkeeper/types";

interface SidebarStore {
  left: SidebarState;
  setLeftCollapsed: (collapsed: boolean) => void;
  setRightCollapsed: (collapsed: boolean) => void;
  setActiveLeftPanel: (panel: SidebarState["activeLeftPanel"]) => void;
  setActiveRightPanel: (panel: SidebarState["activeRightPanel"]) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  left: {
    leftCollapsed: false,
    rightCollapsed: true,
    activeLeftPanel: "files",
    activeRightPanel: "backlinks",
    leftWidth: 260,
    rightWidth: 280,
  },

  setLeftCollapsed: (collapsed) =>
    set((state) => ({
      left: { ...state.left, leftCollapsed: collapsed },
    })),

  setRightCollapsed: (collapsed) =>
    set((state) => ({
      left: { ...state.left, rightCollapsed: collapsed },
    })),

  setActiveLeftPanel: (panel) =>
    set((state) => ({
      left: { ...state.left, activeLeftPanel: panel },
    })),

  setActiveRightPanel: (panel) =>
    set((state) => ({
      left: { ...state.left, activeRightPanel: panel },
    })),

  toggleLeftPanel: () =>
    set((state) => ({
      left: { ...state.left, leftCollapsed: !state.left.leftCollapsed },
    })),

  toggleRightPanel: () =>
    set((state) => ({
      left: { ...state.left, rightCollapsed: !state.left.rightCollapsed },
    })),
}));
