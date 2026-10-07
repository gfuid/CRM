import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/** Minimal path router (history API). Paths: /overview, /companies, /notifications, /users, /settings. */
const RouterContext = createContext(null);

const readLocation = () => ({ path: window.location.pathname, search: window.location.search });

export function RouterProvider({ children }) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to, { replace = false, scroll = true } = {}) => {
    const current = window.location.pathname + window.location.search;
    if (to === current) return;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
    setLocation(readLocation());
    if (scroll) window.scrollTo(0, 0);
  }, []);

  const value = useMemo(() => {
    const parts = location.path.split('/').filter(Boolean);
    return {
      path: location.path,
      query: new URLSearchParams(location.search),
      section: parts[0] || 'overview',
      param: parts[1] || null,
      navigate,
    };
  }, [location, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);

/** <Link> that uses client-side navigation. */
export function Link({ to, children, onClick, ...props }) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
