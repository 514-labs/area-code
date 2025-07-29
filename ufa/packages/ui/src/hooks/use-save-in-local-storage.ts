import { useCallback } from "react";
import { useDebounce } from "./use-debounce";

/**
 * useSaveInLocalStorage hook
 * Provides a debounced function to save data to localStorage,
 * preventing excessive writes when called repeatedly.
 *
 * @param delay - The delay in milliseconds for debouncing (default: 300ms)
 * @returns A debounced save function
 */
export function useSaveInLocalStorage(delay: number = 300) {
  const saveToStorage = useCallback((key: string, value: any) => {
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
  }, []);

  const debouncedSave = useDebounce(saveToStorage, delay);

  return debouncedSave;
}
