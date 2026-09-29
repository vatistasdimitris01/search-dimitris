import { highlightParts } from '../lib/suggestions.jsx'

function CornerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 10 5 5-5 5" />
      <path d="M4 4v7a4 4 0 0 0 4 4h12" />
    </svg>
  )
}

export default function Suggestions({ suggestions, query, activeIndex, show, onSelect, listId }) {
  return (
    <div
      className={`suggestions${show && suggestions.length ? ' show' : ''}`}
      id={listId}
      role="listbox"
      aria-label="Search suggestions"
    >
      {suggestions.slice(0, 7).map((result, index) => (
        <button
          key={`${result}-${index}`}
          type="button"
          tabIndex={-1}
          role="option"
          aria-selected={index === activeIndex}
          className={`suggestion${index === activeIndex ? ' active' : ''}`}
          data-index={index}
          onMouseDown={(event) => {
            event.preventDefault()
            onSelect(result)
          }}
        >
          <CornerIcon />
          <span className="suggestion-text">
            {highlightParts(result, query).map((part, i) =>
              typeof part === 'string' ? (
                <span key={i}>{part}</span>
              ) : (
                <strong key={`m-${part.key}`}>{part.match}</strong>
              ),
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
