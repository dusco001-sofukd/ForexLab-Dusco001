# FX Replay - Forex Strategy Tester & Chart Replay

## Original Problem Statement
Build a forex strategy tester with chart replay functionality.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React 19 + TailwindCSS + Shadcn UI + lightweight-charts v5 (TradingView)
- **Auth**: JWT httpOnly cookies + bcrypt password hashing
- **Data**: Alpha Vantage API (live daily data) + Generated OHLC data

## User Personas
1. **Retail Forex Trader** - Tests strategies against historical data before live trading
2. **Strategy Developer** - Builds custom strategies with Python code editor

## Core Requirements (Static)
- Interactive candlestick chart with TradingView lightweight-charts
- Chart replay with play/pause/speed/step controls
- Built-in strategies: MA Crossover, RSI, Bollinger Bands, MACD
- Custom strategy code editor (Python sandbox)
- Backtest execution with P&L, win rate, drawdown metrics
- Trade history table
- Technical indicator overlays (SMA, EMA, RSI, MACD, Bollinger)
- User authentication (register/login/logout)
- Save/load/delete strategies
- Multiple currency pairs and timeframes
- Live Alpha Vantage forex data integration
- Drawing tools (horizontal lines, trendlines)

## What's Been Implemented
### Phase 1 (2026-04-11)
- Full auth system with JWT cookies, admin seeding, brute force protection
- 8 forex pairs with realistic OHLC data generation
- 7 timeframes (1m to 1d)
- Backtest engine for 4 strategy types
- Indicator calculation engine (SMA, EMA, RSI, MACD, Bollinger)
- Chart replay with full controls
- Strategy CRUD operations
- Swiss high-contrast UI design

### Phase 2 (2026-04-11)
- Alpha Vantage API integration with real API key (FX_DAILY - free tier)
- GEN/LIVE data source toggle in top bar
- Custom strategy Python code editor with sandbox execution
- Strategy examples library (SMA Crossover, RSI Reversal, Bollinger Bounce, MACD Histogram, EMA+RSI)
- Drawing tools: horizontal lines, trendlines, price levels
- Drawing toolbar with tool selection and clear-all
- Canvas overlay for real-time drawing rendering

## Prioritized Backlog
### P1 (High)
- Equity curve chart visualization in results panel
- User-uploaded CSV data import
- Risk management (stop loss, take profit) in strategies
- Position sizing calculator

### P2 (Medium)
- Strategy comparison/leaderboard mode
- Export backtest results to CSV
- More drawing tools (rectangles, Fibonacci, rays)
- Multi-timeframe analysis
