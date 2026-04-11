# FX Replay - Forex Strategy Tester & Chart Replay

## Original Problem Statement
Build a forex strategy tester with chart replay functionality.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React 19 + TailwindCSS + Shadcn UI + lightweight-charts v5 (TradingView)
- **Auth**: JWT httpOnly cookies + bcrypt password hashing
- **Data**: Generated OHLC data + Alpha Vantage API integration (demo key)

## User Personas
1. **Retail Forex Trader** - Tests strategies against historical data before live trading
2. **Strategy Developer** - Builds and compares multiple strategy configurations

## Core Requirements
- Interactive candlestick chart with TradingView lightweight-charts
- Chart replay with play/pause/speed/step controls
- Built-in strategies: MA Crossover, RSI, Bollinger Bands, MACD
- Strategy parameter configuration
- Backtest execution with P&L, win rate, drawdown metrics
- Trade history table
- Technical indicator overlays (SMA, EMA, RSI, MACD, Bollinger)
- User authentication (register/login/logout)
- Save/load/delete strategies
- Multiple currency pairs and timeframes

## What's Been Implemented (2026-04-11)
- Full auth system with JWT cookies, admin seeding, brute force protection
- 8 forex pairs with realistic OHLC data generation
- 7 timeframes (1m to 1d)
- Backtest engine for 4 strategy types
- Indicator calculation engine (SMA, EMA, RSI, MACD, Bollinger)
- Chart replay with full controls
- Strategy CRUD operations
- Swiss high-contrast UI design with sharp edges
- Trade markers on chart (BUY/SELL arrows)

## Prioritized Backlog
### P0 (Critical)
- All core features implemented

### P1 (High)
- Custom strategy builder (code editor)
- Equity curve chart in results panel
- User-uploaded CSV data import
- Drawing tools on chart (trendlines, horizontals)

### P2 (Medium)
- Strategy comparison mode
- Live Alpha Vantage data with real API key
- Export backtest results to CSV
- Risk management settings (stop loss, take profit)
- Position sizing calculator

## Next Tasks
1. Add equity curve visualization in results panel
2. Implement custom strategy code editor
3. Add CSV data import functionality
4. Add drawing tools (trendlines, support/resistance)
5. Add risk management parameters to strategies
