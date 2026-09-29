import { forwardRef } from 'react'

const SearchInput = forwardRef(function SearchInput(
  { value, inline, onChange, onKeyDown, onFocus, listId, expanded },
  ref,
) {
  return (
    <div className="search-box">
      <label htmlFor="searchInput" className="sr-only">
        Ask anything
      </label>
      <div className="input-wrapper">
        <span className="inline-suggestion" aria-hidden="true">
          {inline}
        </span>
        <input
          ref={ref}
          id="searchInput"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          placeholder="Ask anything"
          autoComplete="off"
          spellCheck={false}
          aria-label="Ask anything"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
        />
      </div>
    </div>
  )
})

export default SearchInput
