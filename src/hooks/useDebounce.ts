import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const validDelay = Math.max(0, Math.min(delay, 10000));
    const timer = setTimeout(() => setDebounced(value), validDelay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
