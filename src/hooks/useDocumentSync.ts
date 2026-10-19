import { useEffect, useSyncExternalStore } from 'react';
import { useData } from '@/store/budget';
import { useUI } from '@/store/ui';

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => matchMedia(query).matches,
  );
}

/** Pushes theme and density onto <html>, and mirrors the theme for the pre-paint script in index.html. */
export function useDocumentSync() {
  const { theme, density } = useData((d) => d.display);
  const title = useData((d) => d.settings.title);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    root.dataset.density = density;
    document.title = title;
    try {
      localStorage.setItem('budget:theme', theme);
    } catch {
      /* storage blocked: it's only a paint hint */
    }
  }, [theme, density, title, systemDark]);
}

/** Tracks which category section is in the middle of the screen, for the header links. */
export function useScrollSpy() {
  const sectionKey = useData((d) => d.categories.map((c) => c.id).join());
  const filter = useData((d) => d.display.filter);
  const search = useUI((s) => s.search);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) useUI.setState({ activeCategory: (entry.target as HTMLElement).dataset.categoryId ?? null });
        }
      },
      { rootMargin: '-35% 0px -60% 0px' },
    );
    document.querySelectorAll('[data-category-id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionKey, filter, search]);
}
