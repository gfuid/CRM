import { useEffect, useState } from 'react';
import { loadMembers } from '../../lib/hooks';

/** Company members for pickers and filters, with the load error kept (not swallowed). */
export default function useMemberList(enabled = true) {
  const [state, setState] = useState({ members: [], loading: enabled, error: null });

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    loadMembers()
      .then((members) => alive && setState({ members: members || [], loading: false, error: null }))
      .catch((error) => alive && setState({ members: [], loading: false, error }));
    return () => {
      alive = false;
    };
  }, [enabled]);

  return state;
}
