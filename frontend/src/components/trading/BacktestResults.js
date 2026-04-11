import { TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle } from "lucide-react";

export default function BacktestResults({ result }) {
  if (!result) {
    return (
      <div className="h-full flex items-center justify-center p-6" data-testid="backtest-results-empty">
        <p className="font-mono text-xs text-black/30 uppercase tracking-[0.2em]">Run a backtest to see results</p>
      </div>
    );
  }

  const stats = [
    { label: "Total Trades", value: result.total_trades, icon: BarChart3 },
    { label: "Win Rate", value: `${result.win_rate}%`, icon: Target, color: result.win_rate >= 50 ? "text-green-600" : "text-red-600" },
    { label: "Total P&L", value: `$${result.total_pnl.toFixed(2)}`, icon: result.total_pnl >= 0 ? TrendingUp : TrendingDown, color: result.total_pnl >= 0 ? "text-green-600" : "text-red-600" },
    { label: "Max Drawdown", value: `${result.max_drawdown.toFixed(2)}%`, icon: AlertTriangle, color: result.max_drawdown > 10 ? "text-red-600" : "text-black" },
    { label: "Profit Factor", value: result.profit_factor.toFixed(2), icon: BarChart3 },
    { label: "Final Equity", value: `$${result.final_equity.toFixed(2)}`, icon: TrendingUp, color: result.final_equity >= 10000 ? "text-green-600" : "text-red-600" },
    { label: "Avg Win", value: `$${result.avg_win.toFixed(2)}`, color: "text-green-600" },
    { label: "Avg Loss", value: `$${result.avg_loss.toFixed(2)}`, color: "text-red-600" },
  ];

  return (
    <div className="h-full overflow-auto" data-testid="backtest-results">
      <div className="grid grid-cols-4 lg:grid-cols-8 divide-x divide-black/10">
        {stats.map((s) => (
          <div key={s.label} className="p-4 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/50 mb-1">{s.label}</p>
            <p className={`font-mono text-sm font-bold ${s.color || "text-black"}`} data-testid={`stat-${s.label.toLowerCase().replace(/[^a-z]/g, "-")}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
