import { useCallback } from "react";
import { useDebounce } from "./use-debounce";

/**
 * useSaveInLocalStorage hook
 * Provides a debounced function to save data to localStorage for a specific key,
 * preventing excessive writes when called repeatedly.
 *
 * @param key - The localStorage key to save to
 * @param delay - The delay in milliseconds for debouncing (default: 300ms)
 * @returns A debounced save function that only takes the value
 */
export function useSaveInLocalStorage(key: string, delay: number = 300) {
  const saveToStorage = useCallback(
    (value: any) => {
      try {
        if (typeof window !== "undefined") {
          if (value === null || value === undefined) {
            localStorage.removeItem(key);
          } else {
            const serializedValue =
              typeof value === "string" ? value : JSON.stringify(value);
            localStorage.setItem(key, serializedValue);
          }
        }
      } catch (error) {
        console.warn(`Failed to save to localStorage for key "${key}":`, error);
      }
    },
    [key]
  );

  const debouncedSave = useDebounce(saveToStorage, delay);

  return delay > 0 ? debouncedSave : saveToStorage;
}
