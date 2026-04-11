import { useState, useCallback, useEffect, useRef } from "react";
import { Minus, TrendingUp, MousePointer, Trash2, Circle } from "lucide-react";

const TOOLS = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "hline", icon: Minus, label: "Horizontal Line" },
  { id: "trendline", icon: TrendingUp, label: "Trendline" },
  { id: "ray", icon: Circle, label: "Price Level" },
];

export default function DrawingToolbar({ activeTool, onToolChange, onClearAll, drawingCount }) {
  return (
    <div className="flex items-center border-b border-black bg-white" data-testid="drawing-toolbar">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          data-testid={`drawing-tool-${tool.id}`}
          onClick={() => onToolChange(tool.id)}
          title={tool.label}
          className={`h-8 w-8 flex items-center justify-center border-r border-black transition-colors duration-150 ${
            activeTool === tool.id ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-100"
          }`}
        >
          <tool.icon size={14} />
        </button>
      ))}
      <button
        data-testid="clear-drawings-button"
        onClick={onClearAll}
        title="Clear all drawings"
        className="h-8 w-8 flex items-center justify-center border-r border-black text-black hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
      >
        <Trash2 size={14} />
      </button>
      {drawingCount > 0 && (
        <span className="px-2 font-mono text-[10px] text-black/40">{drawingCount}</span>
      )}
    </div>
  );
}

export function DrawingOverlay({ chartRef, candleSeriesRef, activeTool, drawings, onAddDrawing, containerRef }) {
  const canvasRef = useRef(null);
  const [pendingPoint, setPendingPoint] = useState(null);
  const animFrameRef = useRef(null);

  // Convert pixel to chart coordinates
  const pixelToChartCoords = useCallback((x, y) => {
    const chart = chartRef?.current;
    const series = candleSeriesRef?.current;
    if (!chart || !series) return null;

    try {
      const timeScale = chart.timeScale();
      const time = timeScale.coordinateToTime(x);
      const price = series.coordinateToPrice(y);
      if (time == null || price == null) return null;
      return { time, price };
    } catch {
      return null;
    }
  }, [chartRef, candleSeriesRef]);

  // Convert chart coords back to pixel
  const chartToPixelCoords = useCallback((time, price) => {
    const chart = chartRef?.current;
    const series = candleSeriesRef?.current;
    if (!chart || !series) return null;

    try {
      const timeScale = chart.timeScale();
      const x = timeScale.timeToCoordinate(time);
      const y = series.priceToCoordinate(price);
      if (x == null || y == null) return null;
      return { x, y };
    } catch {
      return null;
    }
  }, [chartRef, candleSeriesRef]);

  // Handle click on canvas
  const handleCanvasClick = useCallback((e) => {
    if (activeTool === "select") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const coords = pixelToChartCoords(x, y);
    if (!coords) return;

    if (activeTool === "hline") {
      onAddDrawing({ type: "hline", price: coords.price, color: "#F59E0B" });
    } else if (activeTool === "ray") {
      onAddDrawing({ type: "hline", price: coords.price, color: "#8B5CF6" });
    } else if (activeTool === "trendline") {
      if (!pendingPoint) {
        setPendingPoint(coords);
      } else {
        onAddDrawing({
          type: "trendline",
          start: pendingPoint,
          end: coords,
          color: "#000000",
        });
        setPendingPoint(null);
      }
    }
  }, [activeTool, pendingPoint, pixelToChartCoords, onAddDrawing]);

  // Draw on canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef?.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    for (const d of drawings) {
      if (d.type === "hline") {
        const series = candleSeriesRef?.current;
        if (!series) continue;
        try {
          const y = series.priceToCoordinate(d.price);
          if (y == null) continue;
          ctx.beginPath();
          ctx.strokeStyle = d.color || "#F59E0B";
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 3]);
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
          ctx.setLineDash([]);
          // Price label
          ctx.fillStyle = d.color || "#F59E0B";
          ctx.font = "10px 'IBM Plex Mono', monospace";
          ctx.fillText(d.price.toFixed(5), 4, y - 4);
        } catch {}
      } else if (d.type === "trendline") {
        const p1 = chartToPixelCoords(d.start.time, d.start.price);
        const p2 = chartToPixelCoords(d.end.time, d.end.price);
        if (!p1 || !p2) continue;
        ctx.beginPath();
        ctx.strokeStyle = d.color || "#000000";
        ctx.lineWidth = 1.5;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        // Extend line
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        if (dx !== 0) {
          const extX = w;
          const extY = p2.y + (dy / dx) * (extX - p2.x);
          ctx.beginPath();
          ctx.strokeStyle = d.color || "#000000";
          ctx.lineWidth = 0.5;
          ctx.setLineDash([4, 4]);
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(extX, extY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Draw pending trendline point
    if (pendingPoint) {
      const p = chartToPixelCoords(pendingPoint.time, pendingPoint.price);
      if (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.fill();
      }
    }
  }, [drawings, pendingPoint, chartToPixelCoords, candleSeriesRef, containerRef]);

  // Redraw on scroll/zoom/data changes
  useEffect(() => {
    const chart = chartRef?.current;
    if (!chart) return;

    const scheduleRedraw = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(redraw);
    };

    scheduleRedraw();
    const ts = chart.timeScale();
    ts.subscribeVisibleLogicalRangeChange(scheduleRedraw);
    chart.subscribeCrosshairMove(scheduleRedraw);

    return () => {
      try {
        ts.unsubscribeVisibleLogicalRangeChange(scheduleRedraw);
        chart.unsubscribeCrosshairMove(scheduleRedraw);
      } catch {}
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [chartRef, redraw]);

  // Resize observer
  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, redraw]);

  const isDrawMode = activeTool !== "select";

  return (
    <canvas
      ref={canvasRef}
      data-testid="drawing-overlay"
      onClick={handleCanvasClick}
      className="absolute inset-0"
      style={{
        pointerEvents: isDrawMode ? "auto" : "none",
        cursor: isDrawMode ? "crosshair" : "default",
        zIndex: isDrawMode ? 10 : 1,
      }}
    />
  );
}
