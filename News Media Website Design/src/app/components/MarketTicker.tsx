import { useEffect, useState } from 'react';

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface MarketSnapshot {
  quotes: MarketQuote[];
  source: string | null;
  fetchedAt: string | null;
  marketOpen: boolean;
  stale: boolean;
}

interface MarketTickerProps {
  apiBaseUrl: string;
}

const OPEN_POLL_MS = 60 * 1000;
const CLOSED_POLL_MS = 10 * 60 * 1000;

const priceFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function MarketTicker({ apiBaseUrl }: MarketTickerProps) {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);

  useEffect(() => {
    let isActive = true;
    let timerId: number | undefined;

    const load = async () => {
      let nextDelay = CLOSED_POLL_MS;
      try {
        if (document.visibilityState === 'visible') {
          const response = await fetch(`${apiBaseUrl}/market`);
          if (response.ok) {
            const payload = await response.json() as MarketSnapshot;
            if (isActive && Array.isArray(payload.quotes) && payload.quotes.length > 0) {
              setSnapshot(payload);
            }
            nextDelay = payload.marketOpen ? OPEN_POLL_MS : CLOSED_POLL_MS;
          }
        } else {
          nextDelay = OPEN_POLL_MS;
        }
      } catch {
        // Keep the last snapshot; the ticker is optional.
      }

      if (isActive) {
        timerId = window.setTimeout(load, nextDelay);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(timerId);
        void load();
      }
    };

    void load();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isActive = false;
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [apiBaseUrl]);

  if (!snapshot || snapshot.quotes.length === 0) {
    return null;
  }

  const fetchedLabel = snapshot.fetchedAt
    ? new Date(snapshot.fetchedAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    })
    : null;

  return (
    <div className="bg-slate-950 text-white border-b border-white/10" aria-label="Market snapshot">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-4 overflow-x-auto whitespace-nowrap text-sm">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 shrink-0">
          <span
            className={`inline-block w-2 h-2 rounded-full ${snapshot.marketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}
            aria-hidden="true"
          />
          {snapshot.marketOpen ? 'Market open' : 'Market closed'}
        </span>

        {snapshot.quotes.map((quote) => {
          const isUp = quote.change >= 0;
          return (
            <span key={quote.symbol} className="flex items-center gap-2 shrink-0">
              <span className="font-semibold">{quote.name}</span>
              <span className="tabular-nums">{priceFormatter.format(quote.price)}</span>
              <span className={`tabular-nums text-xs font-semibold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? '▲' : '▼'} {Math.abs(quote.change).toFixed(2)} ({isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%)
              </span>
            </span>
          );
        })}

        {fetchedLabel && (
          <span className="ml-auto text-xs text-gray-500 shrink-0" title={snapshot.source ?? undefined}>
            {snapshot.stale ? 'Delayed · ' : ''}as of {fetchedLabel} IST
          </span>
        )}
      </div>
    </div>
  );
}
