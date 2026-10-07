import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

/**
 * Loads data with loading / error / reload. `deps` re-run the loader.
 * Stale responses (from an older request) are ignored.
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

  return {
    ...state,
    reload: run,
    setData: (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
  };
}

// Team members change rarely; share one request across the app for a minute
let membersCache = { at: 0, promise: null };

export const loadMembers = (force = false) => {
  if (force || !membersCache.promise || Date.now() - membersCache.at > 60000) {
    membersCache = { at: Date.now(), promise: api.members().catch((e) => { membersCache.promise = null; throw e; }) };
  }
  return membersCache.promise;
};

export function useMembers() {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    let alive = true;
    loadMembers()
      .then((m) => alive && setMembers(m))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return members;
}

export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
