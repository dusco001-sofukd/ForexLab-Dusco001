import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries, createSeriesMarkers } from "lightweight-charts";

export default function TradingChart({ data, indicators, trades, visibleBars, onCrosshairMove }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const indicatorSeriesRef = useRef([]);
  const markersRef = useRef(null);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { color: "#FFFFFF" },
        textColor: "#0A0A0A",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(0,0,0,0.08)" },
        horzLines: { color: "rgba(0,0,0,0.08)" },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "#000000", width: 1, style: 2, labelBackgroundColor: "#000000" },
        horzLine: { color: "#000000", width: 1, style: 2, labelBackgroundColor: "#000000" },
      },
      rightPriceScale: {
        borderColor: "#000000",
        textColor: "#0A0A0A",
      },
      timeScale: {
        borderColor: "#000000",
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        locale: "en-US",
        dateFormat: "yyyy-MM-dd",
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#DC2626",
      downColor: "#2563EB",
      borderUpColor: "#DC2626",
      borderDownColor: "#2563EB",
      wickUpColor: "#DC2626",
      wickDownColor: "#2563EB",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);

    chart.subscribeCrosshairMove((param) => {
      if (onCrosshairMove && param.time) {
        const ohlc = param.seriesData?.get(candleSeries);
        if (ohlc) onCrosshairMove(ohlc);
      }
    });

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      markersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update candle data when visibleBars or data changes
  useEffect(() => {
    if (!candleSeriesRef.current || !data || data.length === 0) return;

    const sliced = visibleBars != null ? data.slice(0, visibleBars) : data;
    const chartData = sliced.map((d) => ({
      time: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candleSeriesRef.current.setData(chartData);
  }, [data, visibleBars]);

  // Update trade markers
  useEffect(() => {
    if (!candleSeriesRef.current || !data || data.length === 0) return;

    const markers = [];
    if (trades && trades.length > 0) {
      const maxIdx = visibleBars != null ? visibleBars : data.length;
      for (const t of trades) {
        if (t.entry_idx < maxIdx) {
          markers.push({
            time: data[t.entry_idx].timestamp,
            position: "belowBar",
            color: t.type === "long" ? "#16A34A" : "#DC2626",
            shape: "arrowUp",
            text: t.type === "long" ? "BUY" : "SELL",
          });
        }
        if (t.exit_idx < maxIdx) {
          markers.push({
            time: data[t.exit_idx].timestamp,
            position: "aboveBar",
            color: t.pnl > 0 ? "#16A34A" : "#DC2626",
            shape: "arrowDown",
            text: `${t.pnl > 0 ? "+" : ""}${t.pnl.toFixed(2)}`,
          });
        }
      }
      markers.sort((a, b) => a.time - b.time);
    }

    try {
      if (markersRef.current) {
        markersRef.current.setMarkers(markers);
      } else {
        markersRef.current = createSeriesMarkers(candleSeriesRef.current, markers);
      }
    } catch (e) {
      // Fallback: if createSeriesMarkers not available, skip markers
      console.warn("Markers not supported:", e);
    }
  }, [data, visibleBars, trades]);

  // Update indicator overlays
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data || data.length === 0) return;

    // Remove old indicator series
    for (const s of indicatorSeriesRef.current) {
      try { chart.removeSeries(s); } catch {}
    }
    indicatorSeriesRef.current = [];

    if (!indicators) return;

    const maxIdx = visibleBars != null ? visibleBars : data.length;
    const colors = ["#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F97316"];
    let colorIdx = 0;

    for (const [key, values] of Object.entries(indicators)) {
      if (key.startsWith("rsi") || key.startsWith("macd")) continue;

      const lineData = [];
      for (let i = 0; i < Math.min(values.length, maxIdx); i++) {
        if (values[i] != null) {
          lineData.push({ time: data[i].timestamp, value: values[i] });
        }
      }

      if (lineData.length > 0) {
        const series = chart.addSeries(LineSeries, {
          color: colors[colorIdx % colors.length],
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          title: key.toUpperCase(),
        });
        series.setData(lineData);
        indicatorSeriesRef.current.push(series);
        colorIdx++;
      }
    }
  }, [indicators, data, visibleBars]);

  return (
    <div ref={containerRef} className="w-full h-full" data-testid="trading-chart" />
  );
}
