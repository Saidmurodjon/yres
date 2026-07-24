import { useEffect, useState } from "react";

/** Delays updating the returned value until `value` stops changing for `delayMs` — used to avoid firing a server request on every keystroke (ui-guidelines.md's high-frequency-event debounce rule). */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
