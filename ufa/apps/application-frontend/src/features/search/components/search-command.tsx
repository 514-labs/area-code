"use client";

import * as React from "react";
import {
  SearchIcon,
  FileIcon,
  DatabaseIcon,
  Clock,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import {
  Command,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@workspace/ui/components/command";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import {
  useDebouncedSearch,
  useRecentSearches,
  usePrefetchSearch,
} from "../hooks/use-search";
import type { SearchResult } from "../types/search";

interface SearchCommandProps {
  className?: string;
  onSelect?: (result: SearchResult) => void;
  placeholder?: string;
}

export function SearchCommand({
  className,
  onSelect,
  placeholder = "Search documents...",
}: SearchCommandProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Keep track of displayed results separately to prevent flashing
  const [displayedResults, setDisplayedResults] = React.useState<
    SearchResult[]
  >([]);
  const [hasSearchedOnce, setHasSearchedOnce] = React.useState(false);

  const { recentSearches, addRecentSearch } = useRecentSearches();
  const prefetchSearch = usePrefetchSearch();

  // Use debounced search with React Query
  const {
    data: results = [],
    isLoading,
    error,
    isDebouncing,
  } = useDebouncedSearch(
    inputValue,
    {},
    {
      debounceMs: 300,
      // Ensure search is enabled for any non-empty input
      enabled: inputValue.trim().length > 0,
    }
  );

  // Update displayed results when new results arrive
  React.useEffect(() => {
    if (results.length > 0) {
      // Got real hits – show them
      setDisplayedResults(results);
      if (inputValue.trim().length > 0) {
        setHasSearchedOnce(true);
      }
    } else if (
      !isLoading &&
      !isDebouncing &&
      inputValue.trim().length > 0 &&
      displayedResults.length === 0
    ) {
      // Only show "no results" if we aren't already displaying something
      setDisplayedResults(results);
      setHasSearchedOnce(true);
    }
  }, [results, isLoading, isDebouncing, inputValue, displayedResults.length]);

  // Clear displayed results when input is cleared
  React.useEffect(() => {
    if (inputValue.trim().length === 0) {
      setDisplayedResults([]);
      setHasSearchedOnce(false);
    }
  }, [inputValue]);

  // Show loading state only if actively loading (not while debouncing with existing results)
  const isSearching = isLoading;

  // Show dropdown when focused and has content or results
  const showDropdown =
    isFocused && (inputValue.length > 0 || recentSearches.length > 0);

  const handleSelect = (result: SearchResult) => {
    // Add to recent searches
    addRecentSearch(result.name);

    // Call custom handler
    onSelect?.(result);

    // Clear input and close dropdown
    setInputValue("");
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleRecentSearch = (searchTerm: string) => {
    setInputValue(searchTerm);
    setIsFocused(true);
    inputRef.current?.focus();
    // Prefetch results for better UX
    prefetchSearch({ q: searchTerm, size: 8 });
  };

  const handleInputChange = React.useCallback(
    (value: string) => {
      setInputValue(value);

      // Prefetch on longer queries for instant results
      if (value.length >= 3) {
        prefetchSearch({ q: value, size: 8 });
      }
    },
    [prefetchSearch]
  );

  const handleClear = () => {
    setInputValue("");
    inputRef.current?.focus();
  };

  // Keyboard shortcut to focus search
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && isFocused) {
        inputRef.current?.blur();
        setIsFocused(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isFocused]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getResultIcon = (result: SearchResult) => {
    return result.type === "foo" ? (
      <FileIcon className="h-4 w-4 text-blue-500" />
    ) : (
      <DatabaseIcon className="h-4 w-4 text-green-500" />
    );
  };

  const getStatusBadge = (result: SearchResult) => {
    if (result.type === "foo" && result.metadata?.status) {
      const status = result.metadata.status;
      const variant = status === "active" ? "default" : "secondary";
      return (
        <Badge variant={variant} className="text-xs">
          {status}
        </Badge>
      );
    }
    if (result.type === "bar" && result.metadata?.isEnabled !== undefined) {
      const variant = result.metadata.isEnabled ? "default" : "secondary";
      return (
        <Badge variant={variant} className="text-xs">
          {result.metadata.isEnabled ? "enabled" : "disabled"}
        </Badge>
      );
    }
    return null;
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {inputValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted/50 z-10"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {!inputValue && (
          <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground z-10">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </div>

      {/* Results Dropdown */}
      {showDropdown && (
        <div
          className={cn(
            "absolute top-full left-0 z-50 mt-1 rounded-md border bg-popover p-0 text-popover-foreground shadow-md w-full"
          )}
        >
          <Command shouldFilter={false} className="max-h-[300px]">
            <CommandList>
              {(isSearching ||
                isDebouncing ||
                (hasSearchedOnce && displayedResults.length === 0) ||
                error) && (
                <CommandEmpty>
                  {isSearching || isDebouncing ? (
                    <div className="flex items-center justify-center gap-2 py-6">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Searching...</span>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>Search failed</span>
                    </div>
                  ) : hasSearchedOnce && displayedResults.length === 0 ? (
                    "No results found."
                  ) : null}
                </CommandEmpty>
              )}

              {/* Recent Searches */}
              {!inputValue && recentSearches.length > 0 && (
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((searchTerm) => (
                    <CommandItem
                      key={searchTerm}
                      onSelect={() => handleRecentSearch(searchTerm)}
                      className="flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      {searchTerm}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Search Results */}
              {displayedResults.length > 0 && (
                <CommandGroup heading={`Results (${displayedResults.length})`}>
                  {displayedResults.map((result) => (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      onSelect={() => handleSelect(result)}
                      className="flex items-start gap-3"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getResultIcon(result)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {result.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {result.type}
                          </Badge>
                          {getStatusBadge(result)}
                        </div>
                        {result.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {result.description}
                          </p>
                        )}
                        {result.metadata && (
                          <div className="flex items-center gap-2 mt-1">
                            {result.type === "foo" &&
                              result.metadata.priority && (
                                <span className="text-xs text-muted-foreground">
                                  Priority: {result.metadata.priority}
                                </span>
                              )}
                            {result.type === "bar" &&
                              result.metadata.value !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  Value: {result.metadata.value}
                                </span>
                              )}
                            {result.score > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Score: {result.score.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for adding keyboard shortcut to focus search
 */
export function useSearchShortcut(inputRef: React.RefObject<HTMLInputElement>) {
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [inputRef]);
}
