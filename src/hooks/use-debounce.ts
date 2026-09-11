"use client";

import { useState, useEffect } from "react";

/**
 * Debounce hook for search inputs.
 * Delays updating the debounced value until the specified delay has passed
 * since the last change.
 *
 * Usage:
 *   const [search, setSearch] = useState("");
 *   const debouncedSearch = useDebounce(search, 300);
 *   // Use debouncedSearch for filtering, search for the input value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(function() {
    const timer = setTimeout(function() {
      setDebouncedValue(value);
    }, delay);

    return function() {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
