import React, { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AutocompleteOption {
  id: string;
  name: string;
  category?: string;
  location?: string;
}

interface AutocompleteProps {
  placeholder?: string;
  value?: AutocompleteOption | null;
  onChange?: (option: AutocompleteOption | null) => void;
  onCustomEntry?: (text: string) => void;
  searchEndpoint: string; // e.g., "/api/universities/search" or "/api/majors/search"
  label?: string;
  allowCustomEntry?: boolean;
  disabled?: boolean;
  testId?: string;
}

export function Autocomplete({
  placeholder = "Type to search...",
  value,
  onChange,
  onCustomEntry,
  searchEndpoint,
  label,
  allowCustomEntry = true,
  disabled = false,
  testId,
}: AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.name || "");
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Update input value when value prop changes
  useEffect(() => {
    if (value?.name) {
      setInputValue(value.name);
    }
  }, [value?.id]);

  // Fetch search results
  const { data: searchResults = [], isLoading: isFetching } = useQuery({
    queryKey: ["autocomplete-search", searchEndpoint, searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 1) return [];

      try {
        console.log(`[Autocomplete] Fetching from ${searchEndpoint}?q=${searchQuery}`);
        const response = await fetch(
          `${searchEndpoint}?q=${encodeURIComponent(searchQuery)}`
        );
        if (!response.ok) {
          console.error(`[Autocomplete] API error: ${response.status}`);
          return [];
        }
        const data = await response.json();
        console.log(`[Autocomplete] Got ${data.length} results`);
        return data;
      } catch (error) {
        console.error('[Autocomplete] Fetch error:', error);
        return [];
      }
    },
    enabled: searchQuery.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Handle input change - update display value immediately, debounce search query
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      console.log(`[Autocomplete] Input changed: "${newValue}"`);
      setInputValue(newValue);
      
      // Clear any pending debounce timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Only open and search if user is typing (not empty)
      if (newValue.length > 0) {
        setOpen(true);
        // Debounce the search query update
        debounceTimerRef.current = setTimeout(() => {
          console.log(`[Autocomplete] Setting search query: "${newValue}"`);
          setSearchQuery(newValue);
        }, 300);
      } else {
        setSearchQuery("");
        setOpen(false);
      }
    },
    []
  );

  // Handle option selection
  const handleSelect = (option: AutocompleteOption) => {
    setInputValue(option.name);
    setSearchQuery("");
    setOpen(false);
    onChange?.(option);
    inputRef.current?.focus();
  };

  // Handle custom entry - save to database
  const handleCustomEntry = async () => {
    if (inputValue.trim()) {
      try {
        // Determine the endpoint based on searchEndpoint
        const endpoint = searchEndpoint.includes('universities') 
          ? '/api/courses/universities'
          : '/api/courses/majors';
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: inputValue.trim(),
            category: searchEndpoint.includes('majors') ? undefined : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save entry');
        }

        const savedEntry: AutocompleteOption = await response.json();
        onCustomEntry?.(inputValue.trim());
        onChange?.(savedEntry);
        setSearchQuery("");
        setOpen(false);
      } catch (error) {
        // Fallback: still call onCustomEntry even if save fails
        onCustomEntry?.(inputValue.trim());
        setSearchQuery("");
        setOpen(false);
      }
    }
  };

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue("");
    setSearchQuery("");
    onChange?.(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  // Handle focus
  const handleFocus = () => {
    if (inputValue.length > 0) {
      setOpen(true);
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (
      e.key === "Enter" &&
      allowCustomEntry &&
      inputValue.trim() &&
      searchResults.length === 0
    ) {
      e.preventDefault();
      handleCustomEntry();
    }
  };

  // Show custom entry option if user is typing and there are no results
  const showCustomEntry =
    allowCustomEntry &&
    inputValue.trim() &&
    searchResults.length === 0 &&
    searchQuery.length > 0;

  // Show dropdown if we have results or can show custom entry
  const showDropdown = open && (searchResults.length > 0 || showCustomEntry);
  
  // Debug logging
  if (inputValue.length > 0 && !showDropdown) {
    console.log(`[Autocomplete] Debug: open=${open}, results=${searchResults.length}, showCustomEntry=${showCustomEntry}, searchQuery="${searchQuery}"`);
  }

  return (
    <div className="w-full">
      {label && (
        <label className="text-sm font-medium text-foreground mb-2 block">
          {label}
        </label>
      )}

      <div className="relative w-full">
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            data-testid={testId}
            className="pr-10"
            autoComplete="off"
          />
          {inputValue && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
            <ScrollArea className="h-auto max-h-[300px]">
              <div className="p-2">
                {searchResults.map((option: AutocompleteOption) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "flex items-start justify-between gap-2 mb-1"
                    )}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{option.name}</div>
                      {(option.category || option.location) && (
                        <div className="text-xs text-muted-foreground">
                          {option.category || option.location}
                        </div>
                      )}
                    </div>
                    {value?.id === option.id && (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                    )}
                  </button>
                ))}

                {showCustomEntry && (
                  <>
                    <div className="my-2 border-t border-border" />
                    <button
                      type="button"
                      onClick={handleCustomEntry}
                      className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                    >
                      <span className="text-xs">
                        Add "{inputValue}" as new entry
                      </span>
                    </button>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
