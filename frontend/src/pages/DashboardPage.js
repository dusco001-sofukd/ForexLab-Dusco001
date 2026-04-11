import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import TradingChart from "../components/chart/TradingChart";
import ReplayControls from "../components/trading/ReplayControls";
import StrategyPanel from "../components/trading/StrategyPanel";
import IndicatorPanel from "../components/trading/IndicatorPanel";
import BacktestResults from "../components/trading/BacktestResults";
import TradeHistory from "../components/trading/TradeHistory";
import { LogOut, TrendingUp, BarChart3, List } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Market data
  const [pair, setPair] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("1h");
  const [ohlcData, setOhlcData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Replay
  const [visibleBars, setVisibleBars] = useState(50);

  // Strategy
  const [savedStrategies, setSavedStrategies] = useState([]);
  const [loadingBacktest, setLoadingBacktest] = useState(false);
  const [backtestResult, setBacktestResult] = useState(null);

  // Indicators
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [indicatorData, setIndicatorData] = useState({});

  // Bottom panel tab
  const [bottomTab, setBottomTab] = useState("results");

  // Crosshair info
  const [crosshairData, setCrosshairData] = useState(null);

  // Fetch OHLC data
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const { data } = await axios.get(`${API}/forex/data/${pair.replace("/", "-")}`, {
        params: { timeframe, bars: 500 },
        withCredentials: true,
      });
      setOhlcData(data.data);
      setVisibleBars(50);
      setBacktestResult(null);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoadingData(false);
    }
  }, [pair, timeframe]);

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

  // Run backtest
  const handleRunBacktest = async (strategyType, params) => {
    setLoadingBacktest(true);
    try {
      const { data } = await axios.post(`${API}/backtest`, {
        pair: pair.replace("/", "-"),
        timeframe,
        bars: 500,
        strategy_type: strategyType,
        params,
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

  // Load saved strategy (handled by StrategyPanel)
  const handleLoadStrategy = (strat) => {
    // Strategy panel will handle this
  };

  // Indicator management
  const addIndicator = (ind) => setActiveIndicators((prev) => [...prev, ind]);
  const removeIndicator = (id) => setActiveIndicators((prev) => prev.filter((i) => i.id !== id));
  const updateIndicator = (id, key, val) => {
    setActiveIndicators((prev) => prev.map((i) => i.id === id ? { ...i, [key]: val } : i));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const currentPrice = ohlcData.length > 0 ? ohlcData[Math.min(visibleBars, ohlcData.length) - 1] : null;

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white" data-testid="dashboard">
      {/* Top Bar */}
      <div className="h-12 flex items-center justify-between border-b border-black px-4 shrink-0">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-black" strokeWidth={2.5} />
          <span className="font-heading text-sm font-black uppercase tracking-tight text-black">FX REPLAY</span>
          <div className="h-5 w-px bg-black/20 mx-2" />
          <span className="font-mono text-xs font-bold text-black" data-testid="current-pair">{pair}</span>
          <span className="font-mono text-xs text-black/50" data-testid="current-timeframe">{timeframe.toUpperCase()}</span>
          {currentPrice && (
            <>
              <div className="h-5 w-px bg-black/20 mx-2" />
              <span className="font-mono text-xs text-green-600 font-bold" data-testid="current-price">{currentPrice.close}</span>
            </>
          )}
          {crosshairData && (
            <span className="font-mono text-[10px] text-black/50 ml-2">
              O:{crosshairData.open} H:{crosshairData.high} L:{crosshairData.low} C:{crosshairData.close}
            </span>
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
            loading={loadingBacktest}
            savedStrategies={savedStrategies}
            onSaveStrategy={handleSaveStrategy}
            onDeleteStrategy={handleDeleteStrategy}
            onLoadStrategy={handleLoadStrategy}
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
          {/* Chart Area */}
          <div className="flex-1 relative" data-testid="chart-area">
            {loadingData && (
              <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                <span className="font-mono text-xs text-black/50 uppercase tracking-[0.2em]">Loading data...</span>
              </div>
            )}
            <TradingChart
              data={ohlcData}
              indicators={indicatorData}
              trades={backtestResult?.trades}
              visibleBars={visibleBars}
              onCrosshairMove={setCrosshairData}
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
                data-testid="tab-trades"
                onClick={() => setBottomTab("trades")}
                className={`h-9 px-5 font-mono text-xs font-bold uppercase tracking-wide border-r border-black transition-colors duration-150 flex items-center gap-2 ${
                  bottomTab === "trades" ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-50"
                }`}
              >
                <List size={12} /> Trades ({backtestResult?.trades?.length || 0})
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {bottomTab === "results" && <BacktestResults result={backtestResult} />}
              {bottomTab === "trades" && <TradeHistory trades={backtestResult?.trades} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
