"use client";

import { useState } from "react";

export function SearchBar({
  initialValue = "",
  onSearch,
}: {
  initialValue?: string;
  onSearch: (query: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <form
      className="search-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
      role="search"
    >
      <label className="sr-only" htmlFor="journal-search">
        Search stories by title
      </label>
      <span aria-hidden="true" className="search-icon">
        ⌕
      </span>
      <input
        autoComplete="off"
        id="journal-search"
        maxLength={120}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search the journal"
        type="search"
        value={value}
      />
      <button className="search-submit" type="submit">
        Search
      </button>
    </form>
  );
}
