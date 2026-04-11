import { useState } from "react";

const TEMPLATE = `# Custom Strategy
# Available variables: closes, opens, highs, lows, volumes, n
# Available functions: sma(closes, period), ema(closes, period),
#   rsi(closes, period), macd(closes, fast, slow, signal),
#   bollinger(closes, period, std_dev)
# Set signals[i] = 1 for BUY, -1 for SELL, 0 for nothing

# Example: Simple dual SMA crossover
fast = sma(closes, 8)
slow = sma(closes, 21)

for i in range(1, n):
    if fast[i] is not None and slow[i] is not None:
        if fast[i-1] is not None and slow[i-1] is not None:
            if fast[i-1] <= slow[i-1] and fast[i] > slow[i]:
                signals[i] = 1   # BUY
            elif fast[i-1] >= slow[i-1] and fast[i] < slow[i]:
                signals[i] = -1  # SELL
`;

const EXAMPLES = [
  {
    name: "SMA Crossover",
    code: `fast = sma(closes, 8)
slow = sma(closes, 21)
for i in range(1, n):
    if fast[i] is not None and slow[i] is not None:
        if fast[i-1] is not None and slow[i-1] is not None:
            if fast[i-1] <= slow[i-1] and fast[i] > slow[i]:
                signals[i] = 1
            elif fast[i-1] >= slow[i-1] and fast[i] < slow[i]:
                signals[i] = -1`,
  },
  {
    name: "RSI Reversal",
    code: `r = rsi(closes, 14)
for i in range(1, n):
    if r[i] is not None and r[i-1] is not None:
        if r[i-1] < 30 and r[i] > 30:
            signals[i] = 1
        elif r[i-1] < 70 and r[i] > 70:
            signals[i] = -1`,
  },
  {
    name: "Bollinger Bounce",
    code: `mid, upper, lower = bollinger(closes, 20, 2.0)
for i in range(1, n):
    if lower[i] is not None:
        if closes[i-1] > lower[i-1] and closes[i] < lower[i]:
            signals[i] = 1
        elif closes[i-1] < upper[i-1] and closes[i] > upper[i]:
            signals[i] = -1`,
  },
  {
    name: "MACD Histogram",
    code: `ml, sl, hist = macd(closes, 12, 26, 9)
for i in range(1, n):
    if hist[i] is not None and hist[i-1] is not None:
        if hist[i-1] < 0 and hist[i] > 0:
            signals[i] = 1
        elif hist[i-1] > 0 and hist[i] < 0:
            signals[i] = -1`,
  },
  {
    name: "EMA + RSI Filter",
    code: `fast_ema = ema(closes, 9)
slow_ema = ema(closes, 21)
r = rsi(closes, 14)
for i in range(1, n):
    if fast_ema[i] and slow_ema[i] and r[i] and fast_ema[i-1] and slow_ema[i-1]:
        if fast_ema[i-1] <= slow_ema[i-1] and fast_ema[i] > slow_ema[i] and r[i] < 70:
            signals[i] = 1
        elif fast_ema[i-1] >= slow_ema[i-1] and fast_ema[i] < slow_ema[i] and r[i] > 30:
            signals[i] = -1`,
  },
];

export default function CustomStrategyEditor({ code, onCodeChange, error }) {
  const [showExamples, setShowExamples] = useState(false);

  return (
    <div className="flex flex-col h-full" data-testid="custom-strategy-editor">
      <div className="flex items-center justify-between px-4 py-2 border-b border-black/20">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/50">Code Editor</span>
        <div className="flex gap-1">
          <button
            data-testid="load-template-button"
            onClick={() => onCodeChange(TEMPLATE)}
            className="h-6 px-2 text-[10px] font-mono border border-black/30 hover:bg-black hover:text-white transition-colors duration-150"
          >
            TEMPLATE
          </button>
          <button
            data-testid="toggle-examples-button"
            onClick={() => setShowExamples(!showExamples)}
            className="h-6 px-2 text-[10px] font-mono border border-black/30 hover:bg-black hover:text-white transition-colors duration-150"
          >
            EXAMPLES
          </button>
        </div>
      </div>

      {showExamples && (
        <div className="border-b border-black/20 bg-neutral-50" data-testid="examples-dropdown">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.name}
              data-testid={`example-${ex.name.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => { onCodeChange(ex.code); setShowExamples(false); }}
              className="w-full px-4 py-2 text-left font-mono text-xs hover:bg-black hover:text-white transition-colors duration-150 border-b border-black/10 last:border-0"
            >
              {ex.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="px-3 py-2 bg-red-50 border-b border-red-200 font-mono text-[10px] text-red-600 whitespace-pre-wrap" data-testid="code-error">
          {error}
        </div>
      )}

      <textarea
        data-testid="custom-code-textarea"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        className="flex-1 w-full p-3 font-mono text-xs leading-5 bg-white text-black border-0 resize-none focus:outline-none focus:ring-0"
        placeholder="Write your strategy code here..."
        spellCheck={false}
        style={{
          tabSize: 4,
          fontVariantLigatures: "none",
        }}
      />

      <div className="px-3 py-1.5 border-t border-black/10 bg-neutral-50">
        <p className="font-mono text-[9px] text-black/40 leading-tight">
          Available: sma() ema() rsi() macd() bollinger() | Set signals[i] = 1 (buy) or -1 (sell)
        </p>
      </div>
    </div>
  );
}
