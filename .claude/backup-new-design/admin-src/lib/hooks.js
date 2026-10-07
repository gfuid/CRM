import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data with loading / error / reload. `deps` re-run the loader.
 * Stale responses (from an older request) are ignored. Errors are kept in `error`
 * so the page can show them (ErrorState) instead of hiding them.
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const reqId = useRef(0);

  const run = useCallback(async ({ quiet = false } = {}) => {
    const id = ++reqId.current;
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loader();
      if (id === reqId.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (id === reqId.current) setState((s) => ({ ...s, error, loading: false }));
      return undefined;
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run();
  }, [run]);

  const setData = useCallback(
    (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
    []
  );

  return { ...state, reload: run, setData };
}

export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
