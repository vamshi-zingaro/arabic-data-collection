"use client";

import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange }) {
  return (
    <div className="search-bar">
      <span className="search-icon"><Search size={16} /></span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by URL, name, source..."
        className="search-input"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="clear-search"
          aria-label="Clear search"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
