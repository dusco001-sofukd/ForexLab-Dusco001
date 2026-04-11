import { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ChevronDown, Save, Trash2, Play, Code } from "lucide-react";
import CustomStrategyEditor from "./CustomStrategyEditor";

const STRATEGY_TEMPLATES = {
  ma_crossover: {
    label: "MA Crossover",
    description: "Buy when fast MA crosses above slow MA, sell on cross below",
    params: { fast_period: 10, slow_period: 20 },
  },
  rsi: {
    label: "RSI",
    description: "Buy when RSI crosses below oversold, sell when above overbought",
    params: { period: 14, overbought: 70, oversold: 30 },
  },
  bollinger: {
    label: "Bollinger Bands",
    description: "Buy when price touches lower band, sell at upper band",
    params: { period: 20, std_dev: 2.0 },
  },
  macd: {
    label: "MACD",
    description: "Buy on MACD/Signal bullish cross, sell on bearish cross",
    params: { fast: 12, slow: 26, signal: 9 },
  },
  custom: {
    label: "Custom Code",
    description: "Write your own strategy in Python",
    params: {},
  },
};

const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "NZD/USD", "EUR/GBP", "USD/CAD"];
const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

export default function StrategyPanel({
  selectedPair, onPairChange,
  selectedTimeframe, onTimeframeChange,
  onRunBacktest, onRunCustomBacktest, loading,
  savedStrategies, onSaveStrategy, onDeleteStrategy, onLoadStrategy,
  customCode, onCustomCodeChange, customError,
}) {
  const [strategyType, setStrategyType] = useState("ma_crossover");
  const [params, setParams] = useState({ ...STRATEGY_TEMPLATES.ma_crossover.params });
  const [stratName, setStratName] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  const template = STRATEGY_TEMPLATES[strategyType];

  const handleStrategyChange = (type) => {
    setStrategyType(type);
    if (type !== "custom") {
      setParams({ ...STRATEGY_TEMPLATES[type].params });
    }
  };

  const handleParamChange = (key, val) => {
    setParams((prev) => ({ ...prev, [key]: Number(val) || val }));
  };

  const handleRun = () => {
    if (strategyType === "custom") {
      onRunCustomBacktest(customCode);
    } else {
      onRunBacktest(strategyType, params);
    }
  };

  const handleSave = () => {
    if (!stratName.trim()) return;
    if (strategyType === "custom") {
      onSaveStrategy(stratName.trim(), "custom", { code: customCode });
    } else {
      onSaveStrategy(stratName.trim(), strategyType, params);
    }
    setStratName("");
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" data-testid="strategy-panel">
      {/* Pair & Timeframe */}
      <div className="p-4 border-b border-black">
        <Label className="font-mono text-xs uppercase tracking-[0.2em] text-black/60 mb-2 block">Currency Pair</Label>
        <select
          data-testid="pair-selector"
          value={selectedPair}
          onChange={(e) => onPairChange(e.target.value)}
          className="w-full h-10 px-3 border border-black rounded-none bg-white font-mono text-sm focus:outline-none focus:bg-neutral-50"
        >
          {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <Label className="font-mono text-xs uppercase tracking-[0.2em] text-black/60 mb-2 block mt-4">Timeframe</Label>
        <div className="flex flex-wrap gap-0" data-testid="timeframe-selector">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              data-testid={`tf-${tf}`}
              onClick={() => onTimeframeChange(tf)}
              className={`h-8 px-3 text-xs font-mono font-bold border border-black -ml-px first:ml-0 transition-colors duration-150 ${
                selectedTimeframe === tf ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-100"
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Strategy Type */}
      <div className="p-4 border-b border-black">
        <Label className="font-mono text-xs uppercase tracking-[0.2em] text-black/60 mb-2 block">Strategy</Label>
        <select
          data-testid="strategy-type-selector"
          value={strategyType}
          onChange={(e) => handleStrategyChange(e.target.value)}
          className="w-full h-10 px-3 border border-black rounded-none bg-white font-mono text-sm focus:outline-none focus:bg-neutral-50"
        >
          {Object.entries(STRATEGY_TEMPLATES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <p className="mt-2 font-body text-xs text-black/50">{template.description}</p>
      </div>

      {/* Strategy Params or Code Editor */}
      {strategyType === "custom" ? (
        <div className="border-b border-black flex-1 overflow-hidden flex flex-col" style={{ minHeight: "200px" }}>
          <CustomStrategyEditor
            code={customCode}
            onCodeChange={onCustomCodeChange}
            error={customError}
          />
        </div>
      ) : (
        <div className="p-4 border-b border-black flex-1 overflow-y-auto">
          <Label className="font-mono text-xs uppercase tracking-[0.2em] text-black/60 mb-3 block">Parameters</Label>
          <div className="space-y-3">
            {Object.entries(params).map(([key, val]) => (
              <div key={key}>
                <label className="font-mono text-xs text-black/60 block mb-1">{key.replace(/_/g, " ").toUpperCase()}</label>
                <Input
                  data-testid={`param-${key}`}
                  type="number"
                  value={val}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                  className="rounded-none border-black h-9 font-mono text-sm focus:ring-0 focus:border-black"
                  step={key === "std_dev" ? 0.1 : 1}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Run & Save */}
      <div className="p-4 border-b border-black">
        <button
          data-testid="run-backtest-button"
          onClick={handleRun}
          disabled={loading}
          className="w-full bg-black text-white px-6 py-3 font-mono uppercase text-sm font-bold hover:bg-neutral-800 transition-colors duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Play size={14} />
          {loading ? "Running..." : "Run Backtest"}
        </button>
        <div className="flex gap-2 mt-3">
          <Input
            data-testid="strategy-name-input"
            value={stratName}
            onChange={(e) => setStratName(e.target.value)}
            placeholder="Strategy name"
            className="flex-1 rounded-none border-black h-9 font-mono text-xs focus:ring-0 focus:border-black"
          />
          <button
            data-testid="save-strategy-button"
            onClick={handleSave}
            className="h-9 px-3 border border-black bg-white text-black hover:bg-neutral-100 transition-colors duration-150"
            title="Save strategy"
          >
            <Save size={14} />
          </button>
        </div>
      </div>

      {/* Saved Strategies */}
      <div className="border-b border-black">
        <button
          data-testid="toggle-saved-strategies"
          onClick={() => setShowSaved(!showSaved)}
          className="w-full px-4 py-3 flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em] text-black/60 hover:bg-neutral-50"
        >
          <span>Saved ({savedStrategies?.length || 0})</span>
          <ChevronDown size={14} className={`transition-transform ${showSaved ? "rotate-180" : ""}`} />
        </button>
        {showSaved && (
          <div className="max-h-40 overflow-y-auto">
            {savedStrategies?.length === 0 && (
              <p className="px-4 py-3 font-body text-xs text-black/40">No saved strategies</p>
            )}
            {savedStrategies?.map((s) => (
              <div
                key={s.id}
                className="flex items-center px-4 py-2 border-t border-black/10 hover:bg-neutral-50 group"
                data-testid={`saved-strategy-${s.id}`}
              >
                <button
                  onClick={() => onLoadStrategy(s)}
                  className="flex-1 text-left font-mono text-xs text-black truncate"
                  data-testid={`load-strategy-${s.id}`}
                >
                  {s.name} <span className="text-black/40">({STRATEGY_TEMPLATES[s.strategy_type]?.label})</span>
                </button>
                <button
                  onClick={() => onDeleteStrategy(s.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-600 ml-2"
                  data-testid={`delete-strategy-${s.id}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
