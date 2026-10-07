import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Saving state for a dialog, plus a close handler that does nothing while saving.
 * The shared Modal keeps the Escape handler from its first render, so `close` is stable
 * and reads the latest saving flag and onClose through refs.
 */
export function useBusyDialog(onClose) {
  const [busy, setBusyState] = useState(false);
  const busyRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const setBusy = useCallback((value) => {
    busyRef.current = value;
    setBusyState(value);
  }, []);

  const close = useCallback(() => {
    if (!busyRef.current) onCloseRef.current?.();
  }, []);

  return { busy, setBusy, close };
}
