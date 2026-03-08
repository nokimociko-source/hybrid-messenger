import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * A hook that returns a debounced version of the provided value or a debounced callback.
 */
export function useDebounce<T>(valueOrCallback: T, delayOrOptions: number | { wait: number; immediate?: boolean }): any {
  const isCallback = typeof valueOrCallback === 'function';

  if (isCallback) {
    const callback = valueOrCallback as (...args: any[]) => any;
    const wait = typeof delayOrOptions === 'number' ? delayOrOptions : delayOrOptions.wait;
    const immediate = typeof delayOrOptions === 'number' ? false : !!delayOrOptions.immediate;

    const timeoutRef = useRef<any>(null);
    const callbackRef = useRef(callback);

    useEffect(() => {
      callbackRef.current = callback;
    }, [callback]);

    // Use useMemo to persist the debounced function across renders
    return useMemo(() => {
      const debounced = (...args: any[]) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        if (immediate && !timeoutRef.current) {
          callbackRef.current(...args);
        }

        timeoutRef.current = setTimeout(() => {
          if (!immediate) {
            callbackRef.current(...args);
          }
          timeoutRef.current = null;
        }, wait);
      };

      (debounced as any).cancel = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };

      return debounced;
    }, [wait, immediate]);
  } else {
    const value = valueOrCallback;
    const delay = delayOrOptions as number;
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  }
}
