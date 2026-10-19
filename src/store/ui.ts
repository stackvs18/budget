import { create } from 'zustand';

export type SettingsTab = 'money' | 'income' | 'categories' | 'priorities' | 'display' | 'data';

/** View state that isn't worth saving to data.json. */
interface UIStore {
  search: string;
  settingsOpen: boolean;
  settingsTab: SettingsTab;
  activeCategory: string | null;
  expandedItem: string | null;
  /** Bumped to ask the add-item bar to take focus. */
  addFocus: number;
}

export const useUI = create<UIStore>()(() => ({
  search: '',
  settingsOpen: false,
  settingsTab: 'money',
  activeCategory: null,
  expandedItem: null,
  addFocus: 0,
}));

export const openSettings = (tab: SettingsTab = 'money') => useUI.setState({ settingsOpen: true, settingsTab: tab });
export const focusAddBar = () => useUI.setState((s) => ({ addFocus: s.addFocus + 1 }));

export function scrollToCategory(id: string) {
  document.getElementById(`cat-${id}`)?.scrollIntoView({ block: 'start' });
}
