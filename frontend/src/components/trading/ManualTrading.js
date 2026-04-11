import { useState } from "react";
import { ArrowUpCircle, ArrowDownCircle, X, DollarSign } from "lucide-react";

export default function ManualTrading({ currentBar, ohlcData, visibleBars, onTradeComplete }) {
  const [position, setPosition] = useState(null); // { type, entry_price, entry_idx, entry_time }
  const [manualTrades, setManualTrades] = useState([]);

  const currentCandle = ohlcData && visibleBars > 0 && visibleBars <= ohlcData.length
    ? ohlcData[visibleBars - 1]
    : null;

  const handleBuy = () => {
    if (!currentCandle) return;
    if (position && position.type === "short") {
      // Close short
      closeTrade(currentCandle.close, "short");
    }
    if (!position) {
      setPosition({
        type: "long",
        entry_price: currentCandle.close,
        entry_idx: visibleBars - 1,
        entry_time: currentCandle.time,
      });
    }
  };

  const handleSell = () => {
    if (!currentCandle) return;
    if (position && position.type === "long") {
      // Close long
      closeTrade(currentCandle.close, "long");
    }
    if (!position) {
      setPosition({
        type: "short",
        entry_price: currentCandle.close,
        entry_idx: visibleBars - 1,
        entry_time: currentCandle.time,
      });
    }
  };

  const closeTrade = (exitPrice, posType) => {
    if (!position) return;
    const pnlPct = posType === "long"
      ? (exitPrice - position.entry_price) / position.entry_price
      : (position.entry_price - exitPrice) / position.entry_price;
    const pnl = 10000 * pnlPct; // hypothetical 10k position
    const trade = {
      entry_time: position.entry_time,
      exit_time: currentCandle.time,
      entry_price: position.entry_price,
      exit_price: exitPrice,
      type: posType,
      pnl: Math.round(pnl * 100) / 100,
      pnl_pct: Math.round(pnlPct * 10000) / 100,
      entry_idx: position.entry_idx,
      exit_idx: visibleBars - 1,
      manual: true,
    };
    setManualTrades((prev) => [...prev, trade]);
    setPosition(null);
    if (onTradeComplete) onTradeComplete(trade);
  };

  const handleClosePosition = () => {
    if (!position || !currentCandle) return;
    closeTrade(currentCandle.close, position.type);
  };

  const unrealizedPnl = position && currentCandle
    ? position.type === "long"
      ? ((currentCandle.close - position.entry_price) / position.entry_price * 10000)
      : ((position.entry_price - currentCandle.close) / position.entry_price * 10000)
    : 0;

  return (
    <div className="border-b border-black" data-testid="manual-trading">
      <div className="p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/50 mb-2">Manual Trading</p>
        <div className="flex gap-1">
          <button
            data-testid="manual-buy-button"
            onClick={handleBuy}
            disabled={!currentCandle || (position && position.type === "long")}
            className="flex-1 h-10 flex items-center justify-center gap-1.5 bg-green-600 text-white font-mono text-xs font-bold uppercase hover:bg-green-700 transition-colors duration-150 disabled:opacity-30"
          >
            <ArrowUpCircle size={14} /> BUY
          </button>
          <button
            data-testid="manual-sell-button"
            onClick={handleSell}
            disabled={!currentCandle || (position && position.type === "short")}
            className="flex-1 h-10 flex items-center justify-center gap-1.5 bg-red-600 text-white font-mono text-xs font-bold uppercase hover:bg-red-700 transition-colors duration-150 disabled:opacity-30"
          >
            <ArrowDownCircle size={14} /> SELL
          </button>
        </div>

        {position && (
          <div className="mt-2 border border-black/20 p-2" data-testid="open-position">
            <div className="flex items-center justify-between mb-1">
              <span className={`font-mono text-[10px] font-bold uppercase ${position.type === "long" ? "text-green-600" : "text-red-600"}`}>
                {position.type} @ {position.entry_price}
              </span>
              <button
                data-testid="close-position-button"
                onClick={handleClosePosition}
                className="h-5 px-2 flex items-center gap-1 text-[9px] font-mono font-bold border border-black/30 hover:bg-black hover:text-white transition-colors"
              >
                <X size={9} /> CLOSE
              </button>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign size={10} className="text-black/40" />
              <span className={`font-mono text-xs font-bold ${unrealizedPnl >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="unrealized-pnl">
                {unrealizedPnl >= 0 ? "+" : ""}{unrealizedPnl.toFixed(2)}
              </span>
              <span className="font-mono text-[9px] text-black/40">unrealized</span>
            </div>
          </div>
        )}

        {manualTrades.length > 0 && (
          <div className="mt-2" data-testid="manual-trades-summary">
            <p className="font-mono text-[9px] text-black/40 mb-1">
              {manualTrades.length} manual trade{manualTrades.length > 1 ? "s" : ""} |
              P&L: <span className={`font-bold ${manualTrades.reduce((s, t) => s + t.pnl, 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${manualTrades.reduce((s, t) => s + t.pnl, 0).toFixed(2)}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
