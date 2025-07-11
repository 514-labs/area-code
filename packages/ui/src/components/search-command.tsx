"use client";

import * as React from "react";
import {
  SearchIcon,
  FileIcon,
  DatabaseIcon,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
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
  size?: "sm" | "md" | "lg";
}

export function SearchCommand({
  className,
  onSelect,
  placeholder = "Search documents...",
  size = "md",
}: SearchCommandProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

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
      enabled: open, // Only search when popover is open
    }
  );

  // Show loading state if debouncing or loading
  const isSearching = isDebouncing || isLoading;

  const handleSelect = (result: SearchResult) => {
    // Add to recent searches
    addRecentSearch(result.name);

    // Call custom handler
    onSelect?.(result);

    // Close popover and clear input
    setOpen(false);
    setInputValue("");
  };

  const handleRecentSearch = (searchTerm: string) => {
    setInputValue(searchTerm);
    // Prefetch results for better UX
    prefetchSearch({ q: searchTerm, size: 8 });
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);

    // Prefetch on longer queries for instant results
    if (value.length >= 3) {
      prefetchSearch({ q: value, size: 8 });
    }
  };

  // Keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
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

  const sizeClasses = {
    sm: "w-[250px]",
    md: "w-[300px]",
    lg: "w-[400px]",
  };

  const popoverSizeClasses = {
    sm: "w-[300px]",
    md: "w-[400px]",
    lg: "w-[500px]",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            sizeClasses[size],
            "justify-between text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <SearchIcon className="h-4 w-4" />
            <span className="truncate">{placeholder}</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(popoverSizeClasses[size], "p-0")}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search documents, projects, and more..."
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <CommandEmpty>
              {isSearching ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center gap-2 py-6 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Search failed</span>
                </div>
              ) : (
                "No results found."
              )}
            </CommandEmpty>

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
            {results.length > 0 && !isSearching && (
              <CommandGroup heading={`Results (${results.length})`}>
                {results.map((result) => (
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
      </PopoverContent>
    </Popover>
  );
}

/**
 * Hook for adding keyboard shortcut to open search
 */
export function useSearchShortcut(onToggle: () => void) {
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onToggle();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onToggle]);
}
