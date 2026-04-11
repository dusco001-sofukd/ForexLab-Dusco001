import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "../ui/input";

const INDICATOR_TYPES = [
  { type: "sma", label: "SMA", defaults: { period: 20 } },
  { type: "ema", label: "EMA", defaults: { period: 20 } },
  { type: "rsi", label: "RSI", defaults: { period: 14 } },
  { type: "macd", label: "MACD", defaults: { fast: 12, slow: 26, signal: 9 } },
  { type: "bollinger", label: "Bollinger Bands", defaults: { period: 20, std_dev: 2.0 } },
];

export default function IndicatorPanel({ activeIndicators, onAdd, onRemove, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = (indType) => {
    const template = INDICATOR_TYPES.find((t) => t.type === indType);
    if (template) {
      onAdd({ type: indType, ...template.defaults, id: Date.now().toString() });
      setShowAdd(false);
    }
  };

  return (
    <div className="p-4" data-testid="indicator-panel">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-black/60">Indicators</span>
        <button
          data-testid="add-indicator-button"
          onClick={() => setShowAdd(!showAdd)}
          className="h-7 w-7 flex items-center justify-center border border-black hover:bg-black hover:text-white transition-colors duration-150"
        >
          <Plus size={12} />
        </button>
      </div>

      {showAdd && (
        <div className="mb-3 border border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" data-testid="indicator-dropdown">
          {INDICATOR_TYPES.map((ind) => (
            <button
              key={ind.type}
              data-testid={`add-${ind.type}`}
              onClick={() => handleAdd(ind.type)}
              className="w-full px-3 py-2 text-left font-mono text-xs hover:bg-black hover:text-white transition-colors duration-150 border-b border-black/10 last:border-0"
            >
              {ind.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {activeIndicators.map((ind) => (
          <div key={ind.id} className="border border-black/20 p-2" data-testid={`indicator-${ind.id}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs font-bold uppercase">{ind.type}</span>
              <button onClick={() => onRemove(ind.id)} className="text-black/40 hover:text-red-600" data-testid={`remove-indicator-${ind.id}`}>
                <X size={12} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ind).filter(([k]) => !["type", "id"].includes(k)).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1">
                  <label className="font-mono text-[10px] text-black/50">{key}</label>
                  <Input
                    type="number"
                    value={val}
                    onChange={(e) => onUpdate(ind.id, key, Number(e.target.value))}
                    className="w-14 h-6 px-1 text-xs rounded-none border-black/30 font-mono focus:ring-0 focus:border-black"
                    step={key === "std_dev" ? 0.1 : 1}
                    data-testid={`indicator-${ind.id}-${key}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
