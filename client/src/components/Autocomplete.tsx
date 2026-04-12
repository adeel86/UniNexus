import { useState, useCallback, useRef, useEffect } from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

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
  const [customEntryError, setCustomEntryError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Update input value when value prop changes
  useEffect(() => {
    if (value?.name) {
      setInputValue(value.name);
    }
  }, [value?.id]);

  // Fetch search results
  const { data: searchResults = [] } = useQuery({
    queryKey: ["autocomplete-search", searchEndpoint, searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 1) return [];

      try {
        const response = await apiRequest("GET", `${searchEndpoint}?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        return data;
      } catch (error) {
        return [];
      }
    },
    enabled: searchQuery.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Handle input change - update display value immediately, debounce search query
  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setCustomEntryError(null);
      
      // Clear any pending debounce timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Only open and search if user is typing (not empty)
      if (newValue.length > 0) {
        setOpen(true);
        // Debounce the search query update
        debounceTimerRef.current = setTimeout(() => {
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
          ? '/api/universities'
          : '/api/majors';
        
        const response = await apiRequest("POST", endpoint, {
          name: inputValue.trim(),
          category: searchEndpoint.includes('majors') ? undefined : undefined,
        });

        const savedEntry: AutocompleteOption = await response.json();
        onCustomEntry?.(inputValue.trim());
        onChange?.(savedEntry);
        setCustomEntryError(null);
        setSearchQuery("");
        setOpen(false);
      } catch (error) {
        setCustomEntryError("Could not save this entry. Please try again.");
      }
    }
  };

  // Clear selection
  const handleClear = (e: MouseEvent) => {
    e.stopPropagation();
    setInputValue("");
    setSearchQuery("");
    setCustomEntryError(null);
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
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
              data-testid={`${testId || "autocomplete"}-clear`}
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
                    data-testid={`${testId || "autocomplete"}-option-${option.id}`}
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
                      data-testid={`${testId || "autocomplete"}-custom-entry`}
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
        {customEntryError && (
          <p className="mt-2 text-sm text-destructive" data-testid={`${testId || "autocomplete"}-error`}>
            {customEntryError}
          </p>
        )}
      </div>
    </div>
  );
}
