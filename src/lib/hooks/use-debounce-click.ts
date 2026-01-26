import { useCallback, useRef } from 'react';

/**
 * Wraps a click handler to prevent double-clicks/double-taps.
 * Ignores clicks within the debounce period after the last click.
 */
export function useDebounceClick<T extends (...args: unknown[]) => unknown>(
  handler: T,
  delay: number = 400
): T {
  const lastClickRef = useRef<number>(0);
  const pendingRef = useRef<boolean>(false);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();

      // If we're in the debounce period, ignore
      if (now - lastClickRef.current < delay) {
        return;
      }

      // If already processing, ignore
      if (pendingRef.current) {
        return;
      }

      lastClickRef.current = now;

      // Handle async handlers
      const result = handler(...args);

      if (result instanceof Promise) {
        pendingRef.current = true;
        result.finally(() => {
          pendingRef.current = false;
        });
      }

      return result;
    }) as T,
    [handler, delay]
  );
}
