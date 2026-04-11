export default function TradeHistory({ trades }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="h-full flex items-center justify-center" data-testid="trade-history-empty">
        <p className="font-mono text-xs text-black/30 uppercase tracking-[0.2em]">No trades yet</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto" data-testid="trade-history">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60 px-4 py-2">#</th>
            <th className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60 px-4 py-2">Type</th>
            <th className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60 px-4 py-2">Entry</th>
            <th className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60 px-4 py-2">Exit</th>
            <th className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60 px-4 py-2">Entry Price</th>
            <th className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60 px-4 py-2">Exit Price</th>
            <th className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60 px-4 py-2">P&L</th>
            <th className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60 px-4 py-2">P&L %</th>
            <th className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60 px-4 py-2">Exit</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => (
            <tr key={i} className="border-b border-black/10 hover:bg-neutral-50 transition-colors duration-100" data-testid={`trade-row-${i}`}>
              <td className="font-mono text-xs px-4 py-2 text-black/60">{i + 1}</td>
              <td className="font-mono text-xs px-4 py-2">
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${t.type === "long" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {t.type}
                </span>
                {t.manual && <span className="ml-1 px-1 py-0.5 text-[8px] font-bold uppercase bg-blue-100 text-blue-700">M</span>}
              </td>
              <td className="font-mono text-xs px-4 py-2 text-black/70">{formatTime(t.entry_time)}</td>
              <td className="font-mono text-xs px-4 py-2 text-black/70">{formatTime(t.exit_time)}</td>
              <td className="font-mono text-xs px-4 py-2">{t.entry_price}</td>
              <td className="font-mono text-xs px-4 py-2">{t.exit_price}</td>
              <td className={`font-mono text-xs px-4 py-2 font-bold ${t.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}
              </td>
              <td className={`font-mono text-xs px-4 py-2 ${t.pnl_pct >= 0 ? "text-green-600" : "text-red-600"}`}>
                {t.pnl_pct >= 0 ? "+" : ""}{t.pnl_pct.toFixed(2)}%
              </td>
              <td className="font-mono text-xs px-4 py-2">
                {t.exit_reason === "sl" && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-600">SL</span>}
                {t.exit_reason === "tp" && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-100 text-green-600">TP</span>}
                {t.exit_reason === "signal" && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-neutral-100 text-black/50">SIG</span>}
                {t.manual && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-600">MAN</span>}
                {!t.exit_reason && !t.manual && <span className="text-black/20">-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return iso.slice(0, 16);
  }
}
