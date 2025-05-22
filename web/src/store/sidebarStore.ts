import { create, StateCreator } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';

export type SidebarTab = 'files' | 'inbox' | 'knowledge-base' | 'ai-apps' | null;

interface SidebarStore {
  isExpanded: boolean;
  activeTab: SidebarTab;
  isPageLoading: boolean;
  setExpanded: (expanded: boolean) => void;
  setActiveTab: (tab: SidebarTab) => void;
  setPageLoading: (loading: boolean) => void;
}

type SidebarStorePersist = (
  config: StateCreator<SidebarStore>,
  options: PersistOptions<SidebarStore>
) => StateCreator<SidebarStore>;

export const useSidebarStore = create<SidebarStore>()(
  (persist as SidebarStorePersist)(
    (set) => ({
      isExpanded: true,
      activeTab: 'inbox',
      isPageLoading: false,
      setExpanded: (expanded) => set({ isExpanded: expanded }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setPageLoading: (loading) => set({ isPageLoading: loading }),
    }),
    {
      name: 'sidebar-storage',
    }
  )
); 