import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import TradingChart from "../components/chart/TradingChart";
import ReplayControls from "../components/trading/ReplayControls";
import StrategyPanel from "../components/trading/StrategyPanel";
import IndicatorPanel from "../components/trading/IndicatorPanel";
import BacktestResults from "../components/trading/BacktestResults";
import TradeHistory from "../components/trading/TradeHistory";
import EquityCurve from "../components/trading/EquityCurve";
import DrawingToolbar, { DrawingOverlay } from "../components/trading/DrawingTools";
import { LogOut, TrendingUp, BarChart3, List, Radio, Wifi, WifiOff, LineChart } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const chartComponentRef = useRef(null);

  // Market data
  const [pair, setPair] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("1h");
  const [ohlcData, setOhlcData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataSource, setDataSource] = useState("generated"); // "generated" or "live"
  const [actualSource, setActualSource] = useState("generated");

  // Replay
  const [visibleBars, setVisibleBars] = useState(50);

  // Strategy
  const [savedStrategies, setSavedStrategies] = useState([]);
  const [loadingBacktest, setLoadingBacktest] = useState(false);
  const [backtestResult, setBacktestResult] = useState(null);

  // Custom strategy
  const [customCode, setCustomCode] = useState(`# Write your strategy code here
# Available: sma(), ema(), rsi(), macd(), bollinger()
# Set signals[i] = 1 for BUY, -1 for SELL

fast = sma(closes, 8)
slow = sma(closes, 21)
for i in range(1, n):
    if fast[i] is not None and slow[i] is not None:
        if fast[i-1] is not None and slow[i-1] is not None:
            if fast[i-1] <= slow[i-1] and fast[i] > slow[i]:
                signals[i] = 1
            elif fast[i-1] >= slow[i-1] and fast[i] < slow[i]:
                signals[i] = -1
`);
  const [customError, setCustomError] = useState("");

  // Indicators
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [indicatorData, setIndicatorData] = useState({});

  // Drawing tools
  const [drawingTool, setDrawingTool] = useState("select");
  const [drawings, setDrawings] = useState([]);

  // Manual trades
  const [manualTrades, setManualTrades] = useState([]);

  // Bottom panel tab
  const [bottomTab, setBottomTab] = useState("results");

  // Crosshair info
  const [crosshairData, setCrosshairData] = useState(null);

  // Chart refs for drawing overlay
  const chartRefObj = useRef(null);
  const seriesRefObj = useRef(null);
  const containerRefObj = useRef(null);

  // Update chart refs when component mounts
  useEffect(() => {
    const interval = setInterval(() => {
      if (chartComponentRef.current) {
        chartRefObj.current = chartComponentRef.current.getChart();
        seriesRefObj.current = chartComponentRef.current.getSeries();
        containerRefObj.current = chartComponentRef.current.getContainer();
        if (chartRefObj.current) clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Fetch OHLC data
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const { data } = await axios.get(`${API}/forex/data/${pair.replace("/", "-")}`, {
        params: { timeframe, bars: 500, source: dataSource },
        withCredentials: true,
      });
      setOhlcData(data.data);
      setActualSource(data.source || "generated");
      setVisibleBars(50);
      setBacktestResult(null);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoadingData(false);
    }
  }, [pair, timeframe, dataSource]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch saved strategies
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const { data } = await axios.get(`${API}/strategies`, { withCredentials: true });
        setSavedStrategies(data.strategies);
      } catch {}
    };
    fetchStrategies();
  }, []);

  // Calculate indicators
  useEffect(() => {
    if (activeIndicators.length === 0 || ohlcData.length === 0) {
      setIndicatorData({});
      return;
    }
    const calcIndicators = async () => {
      try {
        const { data } = await axios.post(`${API}/indicators/calculate`, {
          pair: pair.replace("/", "-"),
          timeframe,
          bars: 500,
          indicators: activeIndicators.map(({ id, ...rest }) => rest),
        }, { withCredentials: true });
        setIndicatorData(data.indicators);
      } catch (e) {
        console.error("Indicator calc failed:", e);
      }
    };
    calcIndicators();
  }, [activeIndicators, pair, timeframe, ohlcData.length]);

  // Run backtest (built-in strategies)
  const handleRunBacktest = async (strategyType, params, stopLoss, takeProfit, slTpMode) => {
    setLoadingBacktest(true);
    setCustomError("");
    try {
      const { data } = await axios.post(`${API}/backtest`, {
        pair: pair.replace("/", "-"),
        timeframe,
        bars: 500,
        strategy_type: strategyType,
        params,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        sl_tp_mode: slTpMode || "pct",
      }, { withCredentials: true });
      setOhlcData(data.ohlc);
      setBacktestResult(data.result);
      setVisibleBars(data.ohlc.length);
      setBottomTab("results");
    } catch (e) {
      console.error("Backtest failed:", e);
    } finally {
      setLoadingBacktest(false);
    }
  };

  // Run custom backtest
  const handleRunCustomBacktest = async (code, stopLoss, takeProfit, slTpMode) => {
    setLoadingBacktest(true);
    setCustomError("");
    try {
      const { data } = await axios.post(`${API}/backtest/custom`, {
        pair: pair.replace("/", "-"),
        timeframe,
        bars: 500,
        code,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        sl_tp_mode: slTpMode || "pct",
      }, { withCredentials: true });
      setOhlcData(data.ohlc);
      setBacktestResult(data.result);
      setVisibleBars(data.ohlc.length);
      setBottomTab("results");
    } catch (e) {
      const detail = e.response?.data?.detail;
      const errMsg = typeof detail === "string" ? detail : JSON.stringify(detail);
      setCustomError(errMsg || "Execution failed");
      console.error("Custom backtest failed:", e);
    } finally {
      setLoadingBacktest(false);
    }
  };

  // Save strategy
  const handleSaveStrategy = async (name, strategyType, params) => {
    try {
      const { data } = await axios.post(`${API}/strategies`, {
        name, strategy_type: strategyType, params,
      }, { withCredentials: true });
      setSavedStrategies((prev) => [...prev, data]);
    } catch (e) {
      console.error("Save failed:", e);
    }
  };

  // Delete strategy
  const handleDeleteStrategy = async (id) => {
    try {
      await axios.delete(`${API}/strategies/${id}`, { withCredentials: true });
      setSavedStrategies((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  };

  // Load saved strategy
  const handleLoadStrategy = (strat) => {};

  // Indicator management
  const addIndicator = (ind) => setActiveIndicators((prev) => [...prev, ind]);
  const removeIndicator = (id) => setActiveIndicators((prev) => prev.filter((i) => i.id !== id));
  const updateIndicator = (id, key, val) => {
    setActiveIndicators((prev) => prev.map((i) => i.id === id ? { ...i, [key]: val } : i));
  };

  // Drawing management
  const addDrawing = useCallback((d) => {
    setDrawings((prev) => [...prev, { ...d, id: Date.now().toString() }]);
    setDrawingTool("select");
  }, []);
  const clearDrawings = useCallback(() => setDrawings([]), []);

  // CSV data loaded
  const handleCsvDataLoaded = useCallback((data, pairName) => {
    setOhlcData(data);
    setVisibleBars(50);
    setBacktestResult(null);
    setActualSource("csv:" + pairName);
  }, []);

  // Manual trade completed
  const handleManualTrade = useCallback((trade) => {
    setManualTrades((prev) => [...prev, trade]);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleDataSource = () => {
    setDataSource((prev) => prev === "generated" ? "live" : "generated");
  };

  const currentPrice = ohlcData.length > 0 ? ohlcData[Math.min(visibleBars, ohlcData.length) - 1] : null;

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white" data-testid="dashboard">
      {/* Top Bar */}
      <div className="h-12 flex items-center justify-between border-b border-black px-4 shrink-0">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-black" strokeWidth={2.5} />
          <span className="font-heading text-sm font-black uppercase tracking-tight text-black">FX REPLAY</span>
          <div className="h-5 w-px bg-black/20 mx-1" />
          <span className="font-mono text-xs font-bold text-black" data-testid="current-pair">{pair}</span>
          <span className="font-mono text-xs text-black/50" data-testid="current-timeframe">{timeframe.toUpperCase()}</span>
          {currentPrice && (
            <>
              <div className="h-5 w-px bg-black/20 mx-1" />
              <span className="font-mono text-xs text-green-600 font-bold" data-testid="current-price">{currentPrice.close}</span>
            </>
          )}
          {crosshairData && (
            <span className="font-mono text-[10px] text-black/50 ml-2">
              O:{crosshairData.open} H:{crosshairData.high} L:{crosshairData.low} C:{crosshairData.close}
            </span>
          )}
          <div className="h-5 w-px bg-black/20 mx-1" />
          {/* Data source toggle */}
          <button
            data-testid="data-source-toggle"
            onClick={toggleDataSource}
            className={`h-7 px-3 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase border transition-colors duration-150 ${
              dataSource === "live"
                ? "border-green-600 text-green-600 bg-green-50 hover:bg-green-100"
                : "border-black/30 text-black/50 hover:bg-neutral-50"
            }`}
          >
            {dataSource === "live" ? <Wifi size={10} /> : <WifiOff size={10} />}
            {dataSource === "live" ? "LIVE" : "GEN"}
          </button>
          {actualSource === "alpha_vantage" && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-green-600">
              <Radio size={8} className="animate-pulse" /> AV
            </span>
          )}
          {actualSource === "generated_fallback" && (
            <span className="font-mono text-[10px] text-amber-600">FALLBACK</span>
          )}
          {actualSource.startsWith("csv:") && (
            <span className="font-mono text-[10px] text-blue-600 font-bold">CSV: {actualSource.slice(4)}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-black/50" data-testid="user-email">{user?.email}</span>
          <button
            data-testid="logout-button"
            onClick={handleLogout}
            className="h-8 px-3 flex items-center gap-2 border border-black text-black font-mono text-xs hover:bg-black hover:text-white transition-colors duration-150"
          >
            <LogOut size={12} /> EXIT
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 border-r border-black flex flex-col shrink-0 overflow-y-auto" data-testid="sidebar">
          <StrategyPanel
            selectedPair={pair}
            onPairChange={setPair}
            selectedTimeframe={timeframe}
            onTimeframeChange={setTimeframe}
            onRunBacktest={handleRunBacktest}
            onRunCustomBacktest={handleRunCustomBacktest}
            loading={loadingBacktest}
            savedStrategies={savedStrategies}
            onSaveStrategy={handleSaveStrategy}
            onDeleteStrategy={handleDeleteStrategy}
            onLoadStrategy={handleLoadStrategy}
            customCode={customCode}
            onCustomCodeChange={setCustomCode}
            customError={customError}
            onCsvDataLoaded={handleCsvDataLoaded}
            ohlcData={ohlcData}
            visibleBars={visibleBars}
            onManualTrade={handleManualTrade}
          />
          <IndicatorPanel
            activeIndicators={activeIndicators}
            onAdd={addIndicator}
            onRemove={removeIndicator}
            onUpdate={updateIndicator}
          />
        </div>

        {/* Chart + Bottom */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Drawing Toolbar */}
          <DrawingToolbar
            activeTool={drawingTool}
            onToolChange={setDrawingTool}
            onClearAll={clearDrawings}
            drawingCount={drawings.length}
          />

          {/* Chart Area */}
          <div className="flex-1 relative" data-testid="chart-area">
            {loadingData && (
              <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
                <span className="font-mono text-xs text-black/50 uppercase tracking-[0.2em]">Loading data...</span>
              </div>
            )}
            <TradingChart
              ref={chartComponentRef}
              data={ohlcData}
              indicators={indicatorData}
              trades={backtestResult?.trades}
              visibleBars={visibleBars}
              onCrosshairMove={setCrosshairData}
            />
            <DrawingOverlay
              chartRef={chartRefObj}
              candleSeriesRef={seriesRefObj}
              containerRef={containerRefObj}
              activeTool={drawingTool}
              drawings={drawings}
              onAddDrawing={addDrawing}
            />
          </div>

          {/* Replay Controls */}
          <ReplayControls
            totalBars={ohlcData.length}
            visibleBars={visibleBars}
            onVisibleBarsChange={setVisibleBars}
            onReset={() => { setBacktestResult(null); fetchData(); }}
          />

          {/* Bottom Panel */}
          <div className="h-52 border-t border-black flex flex-col shrink-0" data-testid="bottom-panel">
            {/* Bottom Tabs */}
            <div className="flex border-b border-black shrink-0">
              <button
                data-testid="tab-results"
                onClick={() => setBottomTab("results")}
                className={`h-9 px-5 font-mono text-xs font-bold uppercase tracking-wide border-r border-black transition-colors duration-150 flex items-center gap-2 ${
                  bottomTab === "results" ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-50"
                }`}
              >
                <BarChart3 size={12} /> Results
              </button>
              <button
                data-testid="tab-equity"
                onClick={() => setBottomTab("equity")}
                className={`h-9 px-5 font-mono text-xs font-bold uppercase tracking-wide border-r border-black transition-colors duration-150 flex items-center gap-2 ${
                  bottomTab === "equity" ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-50"
                }`}
              >
                <LineChart size={12} /> Equity
              </button>
              <button
                data-testid="tab-trades"
                onClick={() => setBottomTab("trades")}
                className={`h-9 px-5 font-mono text-xs font-bold uppercase tracking-wide border-r border-black transition-colors duration-150 flex items-center gap-2 ${
                  bottomTab === "trades" ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-50"
                }`}
              >
                <List size={12} /> Trades ({(backtestResult?.trades?.length || 0) + manualTrades.length})
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {bottomTab === "results" && <BacktestResults result={backtestResult} />}
              {bottomTab === "equity" && <EquityCurve equityCurve={backtestResult?.equity_curve} />}
              {bottomTab === "trades" && <TradeHistory trades={[...(backtestResult?.trades || []), ...manualTrades]} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
