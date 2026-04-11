import { useRef, useEffect } from "react";

export default function EquityCurve({ equityCurve }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !equityCurve || equityCurve.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const data = equityCurve;
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;
    const padTop = 20;
    const padBottom = 24;
    const padLeft = 60;
    const padRight = 16;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    // Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padTop + (chartH / gridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      const val = maxVal - (range / gridSteps) * i;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(`$${val.toFixed(0)}`, padLeft - 8, y + 3);
    }

    // Starting equity line (10000)
    const startY = padTop + chartH - ((10000 - minVal) / range) * chartH;
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.setLineDash([4, 4]);
    ctx.moveTo(padLeft, startY);
    ctx.lineTo(w - padRight, startY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw equity curve
    const stepX = chartW / (data.length - 1);

    // Fill area under curve
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + chartH);
    for (let i = 0; i < data.length; i++) {
      const x = padLeft + stepX * i;
      const y = padTop + chartH - ((data[i] - minVal) / range) * chartH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(padLeft + stepX * (data.length - 1), padTop + chartH);
    ctx.closePath();
    const lastVal = data[data.length - 1];
    const isProfit = lastVal >= 10000;
    const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    if (isProfit) {
      gradient.addColorStop(0, "rgba(22,163,74,0.15)");
      gradient.addColorStop(1, "rgba(22,163,74,0.01)");
    } else {
      gradient.addColorStop(0, "rgba(220,38,38,0.01)");
      gradient.addColorStop(1, "rgba(220,38,38,0.15)");
    }
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = padLeft + stepX * i;
      const y = padTop + chartH - ((data[i] - minVal) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = isProfit ? "#16A34A" : "#DC2626";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // End dot
    const endX = padLeft + stepX * (data.length - 1);
    const endY = padTop + chartH - ((lastVal - minVal) / range) * chartH;
    ctx.beginPath();
    ctx.arc(endX, endY, 3, 0, Math.PI * 2);
    ctx.fillStyle = isProfit ? "#16A34A" : "#DC2626";
    ctx.fill();

    // End value label
    ctx.fillStyle = isProfit ? "#16A34A" : "#DC2626";
    ctx.font = "bold 11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`$${lastVal.toFixed(2)}`, endX - 6, endY - 8);

    // Axis labels
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.font = "9px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("START", padLeft, h - 6);
    ctx.fillText("END", w - padRight, h - 6);
    ctx.fillText(`${data.length} bars`, w / 2, h - 6);

  }, [equityCurve]);

  if (!equityCurve || equityCurve.length < 2) {
    return (
      <div className="h-full flex items-center justify-center" data-testid="equity-curve-empty">
        <p className="font-mono text-xs text-black/30 uppercase tracking-[0.2em]">Run a backtest to see equity curve</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative" data-testid="equity-curve">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
