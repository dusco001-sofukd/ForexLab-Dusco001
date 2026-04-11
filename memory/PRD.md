# FX Replay - Forex Strategy Tester & Chart Replay

## Original Problem Statement
Build a forex strategy tester with chart replay functionality.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React 19 + TailwindCSS + Shadcn UI + lightweight-charts v5
- **Auth**: JWT httpOnly cookies + bcrypt
- **Data**: Alpha Vantage API (live FX_DAILY) + Generated OHLC + CSV import

## What's Been Implemented
### Phase 1 (2026-04-11)
- Full auth system (JWT cookies, admin seeding, brute force protection)
- 8 forex pairs, 7 timeframes, realistic OHLC generation
- Backtest engine (MA Crossover, RSI, Bollinger Bands, MACD)
- Indicator engine (SMA, EMA, RSI, MACD, Bollinger)
- Chart replay with full controls
- Strategy CRUD, Swiss UI design

### Phase 2 (2026-04-11)
- Alpha Vantage live data (FX_DAILY free tier), GEN/LIVE toggle
- Custom Python strategy code editor with sandbox execution
- Drawing tools (horizontal lines, trendlines, price levels)

### Phase 3 (2026-04-11)
- Equity curve visualization (canvas chart in bottom panel)
- CSV data import (parse user-uploaded OHLC files)
- Stop Loss / Take Profit risk management (% and PIPS modes)
- Shared execute_trades() engine with SL/TP checking on highs/lows
- Trade exit reasons (SL, TP, Signal) shown in trade history
- Manual Buy/Sell buttons with open position tracking + unrealized P&L
- Manual trades merge into trade history

## Prioritized Backlog
### P1 (High)
- Strategy comparison/leaderboard mode
- Position sizing calculator
- Multi-timeframe analysis

### P2 (Medium)
- Export backtest results to CSV/PDF
- More drawing tools (Fibonacci, rectangles, channels)
- Alert system for price levels
- Dark mode toggle
