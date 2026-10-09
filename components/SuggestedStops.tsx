import { RetryImage } from "@/components/RetryImage";
import { SubmitButton } from "@/components/SubmitButton";
import { formatBudget, type Attraction } from "@/lib/attractions";

interface SuggestedStopsProps {
  suggestions: Attraction[];
  addAction: (attractionId: string) => Promise<void>;
}

/**
 * One-click "add this as a stop" suggestions from the curated attractions for the trip's
 * destination (see lib/stopSuggestions.ts). Sits above the manual add-a-stop form so adding a
 * well-known nearby activity doesn't mean typing a city and picking a date by hand.
 */
export function SuggestedStops({ suggestions, addAction }: SuggestedStopsProps) {
  if (suggestions.length === 0) return null;

  return (
    <section aria-labelledby="suggested-stops-title" className="mb-6 flex flex-col gap-3">
      <h3 id="suggested-stops-title" className="ticket-label">Suggested stops</h3>
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {suggestions.map((attraction) => {
          const addThisStop = addAction.bind(null, attraction.id);
          return (
            <li
              key={attraction.id}
              className="glass-card flex w-48 shrink-0 snap-start flex-col overflow-hidden"
            >
              <div className="relative h-24 w-full shrink-0">
                <RetryImage
                  src={attraction.image}
                  alt=""
                  fill
                  sizes="192px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="line-clamp-2 text-sm leading-tight font-medium text-white/90">
                  {attraction.name}
                </p>
                <p className="text-accent-400 text-xs">{attraction.city}</p>
                <span className="mt-0.5 self-start rounded-full bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/80">
                  {formatBudget(attraction.budgetMin, attraction.budgetMax)}
                </span>
                <form action={addThisStop} className="mt-auto pt-2">
                  <SubmitButton
                    variant="ghost"
                    pendingLabel="Adding…"
                    className="w-full text-sm"
                    aria-label={`Add ${attraction.name} as a stop`}
                  >
                    Add stop
                  </SubmitButton>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
