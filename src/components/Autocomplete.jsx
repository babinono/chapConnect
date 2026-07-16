import React, { useState, useEffect, useRef } from 'react';

export default function Autocomplete({ 
  name, 
  value = '', 
  onChange, 
  placeholder, 
  suggestions = [], 
  required = false 
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    // Click outside handler to close dropdown
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const input = e.target.value;
    
    // Call parent onChange
    onChange({
      target: {
        name,
        value: input
      }
    });

    if (input.trim() === '') {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter suggestions based on input
    const inputLower = input.toLowerCase();
    
    // Support comma-separated inputs (for multiple majors or colleges)
    const parts = input.split(',');
    const currentPart = parts[parts.length - 1].trim().toLowerCase();

    if (currentPart === '') {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = suggestions.filter(item => 
      item.toLowerCase().includes(currentPart) &&
      !parts.slice(0, -1).map(p => p.trim().toLowerCase()).includes(item.toLowerCase())
    );

    setFilteredSuggestions(filtered.slice(0, 5)); // Limit to top 5 matches
    setShowSuggestions(filtered.length > 0);
    setActiveIndex(0);
  };

  const selectSuggestion = (suggestion) => {
    const parts = value.split(',');
    let newValue = '';
    
    if (parts.length > 1) {
      // Append to the list of comma-separated items
      parts[parts.length - 1] = ` ${suggestion}`;
      newValue = parts.join(',');
    } else {
      newValue = suggestion;
    }

    onChange({
      target: {
        name,
        value: newValue
      }
    });
    
    setShowSuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredSuggestions[activeIndex]) {
        selectSuggestion(filteredSuggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-slate-50 dark:bg-[#0c1324] font-medium transition-all"
      />
      {showSuggestions && (
        <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 rounded-xl brutal-shadow overflow-hidden">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              onClick={() => selectSuggestion(suggestion)}
              className={`px-4 py-3 font-bold text-sm text-slate-800 dark:text-slate-200 cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${
                index === activeIndex ? 'bg-blue-700 text-white' : 'hover:bg-slate-100 dark:bg-[#18213a]'
              }`}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
