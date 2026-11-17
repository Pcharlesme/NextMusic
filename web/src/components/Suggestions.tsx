import { useId } from "react";
import { popularSearches } from "../data/popular";

export function Suggestions({ label, onPick }: { label?: string; onPick: (term: string) => void }) {
  const labelId = useId();

  return (
    <div className="suggestions">
      {label && (
        <span className="suggestions-label" id={labelId}>
          {label}
        </span>
      )}
      <ul aria-labelledby={label ? labelId : undefined} aria-label={label ? undefined : "Popular searches"}>
        {popularSearches.map((term) => (
          <li key={term}>
            <button type="button" className="chip" onClick={() => onPick(term)}>
              {term}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
