import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search drugs, viruses, mechanisms...',
  resultCount,
}: SearchBarProps) {
  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="search-input"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="search-clear"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>
      {resultCount !== undefined && (
        <span className="search-results-count">
          {resultCount.toLocaleString()} result{resultCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
