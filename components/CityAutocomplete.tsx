"use client";

import { useEffect, useId, useRef, useState } from "react";

interface Suggestion {
  label: string;
  lat: number;
  lon: number;
}

interface CityAutocompleteProps {
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
}

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

/**
 * Plain text input for a city name — the server still geocodes whatever
 * text is submitted, so picking a suggestion is a convenience, not a
 * requirement (freeform text still works exactly as before).
 */
export function CityAutocomplete({
  name,
  placeholder,
  required,
  defaultValue = "",
  className,
}: CityAutocompleteProps) {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!res.ok || requestId !== requestIdRef.current) return;
        const data = await res.json();
        setSuggestions(data.results ?? []);
        setOpen(true);
      } catch {
        // Network failure — the input keeps working as plain text.
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectSuggestion(suggestion: Suggestion) {
    setValue(suggestion.label);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        name={name}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setActiveIndex(-1);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="glass-card absolute top-full left-0 z-20 mt-1 max-h-56 w-full overflow-auto p-1"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.label}-${suggestion.lat}-${suggestion.lon}`}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => {
                event.preventDefault();
                selectSuggestion(suggestion);
              }}
              onClick={() => selectSuggestion(suggestion)}
              className={`cursor-pointer rounded-md px-3 py-2 text-sm ${
                index === activeIndex ? "bg-white/15" : "hover:bg-white/10"
              }`}
            >
              {suggestion.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
