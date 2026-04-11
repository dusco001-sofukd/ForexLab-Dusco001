from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
import math
import random
import httpx
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Password Hashing ───
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

# ─── Auth Models ───
class RegisterInput(BaseModel):
    email: str
    password: str
    name: str

class LoginInput(BaseModel):
    email: str
    password: str

class ForgotPasswordInput(BaseModel):
    email: str

class ResetPasswordInput(BaseModel):
    token: str
    new_password: str

# ─── Auth Endpoints ───
@api_router.post("/auth/register")
async def register(inp: RegisterInput, response: Response):
    email = inp.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email already registered")
    hashed = hash_password(inp.password)
    doc = {"email": email, "password_hash": hashed, "name": inp.name, "role": "user", "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.users.insert_one(doc)
    user_id = str(result.inserted_id)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"id": user_id, "email": email, "name": inp.name, "role": "user"}

@api_router.post("/auth/login")
async def login(inp: LoginInput, request: Request, response: Response):
    email = inp.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.now(timezone.utc) < datetime.fromisoformat(locked_until):
            raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(inp.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True
        )
        raise HTTPException(401, "Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = str(user["_id"])
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"id": user_id, "email": email, "name": user.get("name", ""), "role": user.get("role", "user")}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        user_id = str(user["_id"])
        access = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")

# ─── Forex Data Generation ───
PAIRS = {
    "EUR/USD": {"base_price": 1.0850, "volatility": 0.0008},
    "GBP/USD": {"base_price": 1.2650, "volatility": 0.0012},
    "USD/JPY": {"base_price": 149.50, "volatility": 0.15},
    "AUD/USD": {"base_price": 0.6550, "volatility": 0.0006},
    "USD/CHF": {"base_price": 0.8750, "volatility": 0.0007},
    "NZD/USD": {"base_price": 0.6100, "volatility": 0.0005},
    "EUR/GBP": {"base_price": 0.8580, "volatility": 0.0006},
    "USD/CAD": {"base_price": 1.3650, "volatility": 0.0008},
}

def generate_ohlc_data(pair: str, timeframe: str = "1h", bars: int = 500):
    config = PAIRS.get(pair, {"base_price": 1.0, "volatility": 0.001})
    base = config["base_price"]
    vol = config["volatility"]
    
    tf_minutes = {"1m": 1, "5m": 5, "15m": 15, "30m": 30, "1h": 60, "4h": 240, "1d": 1440}
    minutes = tf_minutes.get(timeframe, 60)
    
    data = []
    price = base
    now = datetime.now(timezone.utc)
    start = now - timedelta(minutes=minutes * bars)
    
    trend = 0
    for i in range(bars):
        t = start + timedelta(minutes=minutes * i)
        # Random walk with trend and mean reversion
        if random.random() < 0.05:
            trend = random.uniform(-vol * 2, vol * 2)
        mean_revert = (base - price) * 0.002
        change = random.gauss(trend + mean_revert, vol)
        
        o = price
        # Generate realistic OHLC
        h_ext = abs(random.gauss(0, vol * 0.8))
        l_ext = abs(random.gauss(0, vol * 0.8))
        c = o + change
        h = max(o, c) + h_ext
        l = min(o, c) - l_ext
        
        volume = int(random.gauss(1000, 300))
        if volume < 100:
            volume = 100
        
        decimals = 5 if "JPY" not in pair else 3
        data.append({
            "time": t.isoformat(),
            "timestamp": int(t.timestamp()),
            "open": round(o, decimals),
            "high": round(h, decimals),
            "low": round(l, decimals),
            "close": round(c, decimals),
            "volume": volume,
        })
        price = c
    
    return data

@api_router.get("/forex/pairs")
async def get_pairs():
    return {"pairs": list(PAIRS.keys())}

@api_router.get("/forex/data/{pair}")
async def get_forex_data(pair: str, timeframe: str = "1h", bars: int = 500):
    pair = pair.replace("-", "/")
    if pair not in PAIRS:
        raise HTTPException(404, f"Pair {pair} not found")
    data = generate_ohlc_data(pair, timeframe, min(bars, 2000))
    return {"pair": pair, "timeframe": timeframe, "data": data}

@api_router.get("/forex/live/{pair}")
async def get_live_data(pair: str, timeframe: str = "1h"):
    pair = pair.replace("-", "/")
    av_key = os.environ.get("ALPHA_VANTAGE_KEY", "")
    if not av_key or av_key == "demo":
        # Fallback to generated data
        data = generate_ohlc_data(pair, timeframe, 200)
        return {"pair": pair, "timeframe": timeframe, "data": data, "source": "generated"}
    
    from_symbol, to_symbol = pair.split("/")
    tf_map = {"1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "60min"}
    av_interval = tf_map.get(timeframe, "60min")
    
    try:
        async with httpx.AsyncClient() as client_http:
            if timeframe in ["1d"]:
                url = f"https://www.alphavantage.co/query?function=FX_DAILY&from_symbol={from_symbol}&to_symbol={to_symbol}&apikey={av_key}&outputsize=compact"
            else:
                url = f"https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol={from_symbol}&to_symbol={to_symbol}&interval={av_interval}&apikey={av_key}&outputsize=compact"
            resp = await client_http.get(url, timeout=15.0)
            raw = resp.json()
        
        # Parse Alpha Vantage response
        ts_key = None
        for k in raw:
            if "Time Series" in k:
                ts_key = k
                break
        
        if not ts_key:
            data = generate_ohlc_data(pair, timeframe, 200)
            return {"pair": pair, "timeframe": timeframe, "data": data, "source": "generated_fallback"}
        
        series = raw[ts_key]
        data = []
        for dt_str, vals in sorted(series.items()):
            data.append({
                "time": dt_str,
                "timestamp": int(datetime.fromisoformat(dt_str.replace(" ", "T")).replace(tzinfo=timezone.utc).timestamp()),
                "open": float(vals["1. open"]),
                "high": float(vals["2. high"]),
                "low": float(vals["3. low"]),
                "close": float(vals["4. close"]),
                "volume": 0,
            })
        return {"pair": pair, "timeframe": timeframe, "data": data, "source": "alpha_vantage"}
    except Exception as e:
        logger.error(f"Alpha Vantage error: {e}")
        data = generate_ohlc_data(pair, timeframe, 200)
        return {"pair": pair, "timeframe": timeframe, "data": data, "source": "generated_fallback"}

# ─── Indicator Calculations ───
def calc_sma(closes: List[float], period: int) -> List[Optional[float]]:
    result = [None] * len(closes)
    for i in range(period - 1, len(closes)):
        result[i] = sum(closes[i - period + 1:i + 1]) / period
    return result

def calc_ema(closes: List[float], period: int) -> List[Optional[float]]:
    result = [None] * len(closes)
    if len(closes) < period:
        return result
    k = 2 / (period + 1)
    result[period - 1] = sum(closes[:period]) / period
    for i in range(period, len(closes)):
        result[i] = closes[i] * k + result[i - 1] * (1 - k)
    return result

def calc_rsi(closes: List[float], period: int = 14) -> List[Optional[float]]:
    result = [None] * len(closes)
    if len(closes) < period + 1:
        return result
    gains = []
    losses = []
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    if avg_loss == 0:
        result[period] = 100
    else:
        rs = avg_gain / avg_loss
        result[period] = 100 - (100 / (1 + rs))
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        if avg_loss == 0:
            result[i + 1] = 100
        else:
            rs = avg_gain / avg_loss
            result[i + 1] = 100 - (100 / (1 + rs))
    return result

def calc_macd(closes: List[float], fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = calc_ema(closes, fast)
    ema_slow = calc_ema(closes, slow)
    macd_line = [None] * len(closes)
    for i in range(len(closes)):
        if ema_fast[i] is not None and ema_slow[i] is not None:
            macd_line[i] = ema_fast[i] - ema_slow[i]
    # Signal line = EMA of MACD
    macd_vals = [v for v in macd_line if v is not None]
    signal_line_vals = calc_ema(macd_vals, signal)
    signal_line = [None] * len(closes)
    idx = 0
    for i in range(len(closes)):
        if macd_line[i] is not None:
            if idx < len(signal_line_vals):
                signal_line[i] = signal_line_vals[idx]
            idx += 1
    histogram = [None] * len(closes)
    for i in range(len(closes)):
        if macd_line[i] is not None and signal_line[i] is not None:
            histogram[i] = macd_line[i] - signal_line[i]
    return macd_line, signal_line, histogram

def calc_bollinger(closes: List[float], period: int = 20, std_dev: float = 2.0):
    sma = calc_sma(closes, period)
    upper = [None] * len(closes)
    lower = [None] * len(closes)
    for i in range(period - 1, len(closes)):
        window = closes[i - period + 1:i + 1]
        mean = sma[i]
        variance = sum((x - mean) ** 2 for x in window) / period
        sd = math.sqrt(variance)
        upper[i] = mean + std_dev * sd
        lower[i] = mean - std_dev * sd
    return sma, upper, lower

# ─── Indicators Endpoint ───
class IndicatorRequest(BaseModel):
    pair: str
    timeframe: str = "1h"
    bars: int = 500
    indicators: List[Dict[str, Any]]  # [{"type": "sma", "period": 20}, ...]

@api_router.post("/indicators/calculate")
async def calculate_indicators(req: IndicatorRequest):
    pair = req.pair.replace("-", "/")
    if pair not in PAIRS:
        raise HTTPException(404, f"Pair {pair} not found")
    ohlc = generate_ohlc_data(pair, req.timeframe, min(req.bars, 2000))
    closes = [c["close"] for c in ohlc]
    results = {}
    for ind in req.indicators:
        itype = ind.get("type", "").lower()
        if itype == "sma":
            period = ind.get("period", 20)
            results[f"sma_{period}"] = calc_sma(closes, period)
        elif itype == "ema":
            period = ind.get("period", 20)
            results[f"ema_{period}"] = calc_ema(closes, period)
        elif itype == "rsi":
            period = ind.get("period", 14)
            results[f"rsi_{period}"] = calc_rsi(closes, period)
        elif itype == "macd":
            fast = ind.get("fast", 12)
            slow = ind.get("slow", 26)
            signal = ind.get("signal", 9)
            ml, sl, hist = calc_macd(closes, fast, slow, signal)
            results["macd_line"] = ml
            results["macd_signal"] = sl
            results["macd_histogram"] = hist
        elif itype == "bollinger":
            period = ind.get("period", 20)
            std = ind.get("std_dev", 2.0)
            mid, upper, lower = calc_bollinger(closes, period, std)
            results["bb_middle"] = mid
            results["bb_upper"] = upper
            results["bb_lower"] = lower
    return {"indicators": results}

# ─── Strategy & Backtest Models ───
class StrategyCreate(BaseModel):
    name: str
    strategy_type: str  # ma_crossover, rsi, bollinger, macd, custom
    params: Dict[str, Any]
    description: str = ""

class BacktestRequest(BaseModel):
    pair: str
    timeframe: str = "1h"
    bars: int = 500
    strategy_type: str
    params: Dict[str, Any]
    strategy_id: Optional[str] = None

# ─── Strategy CRUD ───
@api_router.post("/strategies")
async def create_strategy(inp: StrategyCreate, user: dict = Depends(get_current_user)):
    doc = {
        "user_id": user["_id"],
        "name": inp.name,
        "strategy_type": inp.strategy_type,
        "params": inp.params,
        "description": inp.description,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.strategies.insert_one(doc)
    return {"id": str(result.inserted_id), "name": inp.name, "strategy_type": inp.strategy_type, "params": inp.params, "description": inp.description}

@api_router.get("/strategies")
async def list_strategies(user: dict = Depends(get_current_user)):
    cursor = db.strategies.find({"user_id": user["_id"]}, {"_id": 1, "name": 1, "strategy_type": 1, "params": 1, "description": 1, "created_at": 1})
    strats = []
    async for s in cursor:
        s["id"] = str(s.pop("_id"))
        strats.append(s)
    return {"strategies": strats}

@api_router.delete("/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str, user: dict = Depends(get_current_user)):
    result = await db.strategies.delete_one({"_id": ObjectId(strategy_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Strategy not found")
    return {"message": "Deleted"}

# ─── Backtest Engine ───
def run_backtest(ohlc: List[dict], strategy_type: str, params: dict):
    closes = [c["close"] for c in ohlc]
    highs = [c["high"] for c in ohlc]
    lows = [c["low"] for c in ohlc]
    n = len(closes)
    
    signals = [0] * n  # 1 = buy, -1 = sell, 0 = none
    
    if strategy_type == "ma_crossover":
        fast_p = params.get("fast_period", 10)
        slow_p = params.get("slow_period", 20)
        fast_ma = calc_ema(closes, fast_p)
        slow_ma = calc_ema(closes, slow_p)
        for i in range(1, n):
            if fast_ma[i] is not None and slow_ma[i] is not None and fast_ma[i-1] is not None and slow_ma[i-1] is not None:
                if fast_ma[i-1] <= slow_ma[i-1] and fast_ma[i] > slow_ma[i]:
                    signals[i] = 1
                elif fast_ma[i-1] >= slow_ma[i-1] and fast_ma[i] < slow_ma[i]:
                    signals[i] = -1
    
    elif strategy_type == "rsi":
        period = params.get("period", 14)
        overbought = params.get("overbought", 70)
        oversold = params.get("oversold", 30)
        rsi = calc_rsi(closes, period)
        for i in range(1, n):
            if rsi[i] is not None and rsi[i-1] is not None:
                if rsi[i-1] >= oversold and rsi[i] < oversold:
                    signals[i] = 1  # Buy when RSI crosses below oversold
                elif rsi[i-1] > oversold and rsi[i-1] < overbought and rsi[i] >= overbought:
                    signals[i] = -1
                # Alternative: buy when crossing above oversold
                if rsi[i-1] < oversold and rsi[i] > oversold:
                    signals[i] = 1
                if rsi[i-1] < overbought and rsi[i] > overbought:
                    signals[i] = -1
    
    elif strategy_type == "bollinger":
        period = params.get("period", 20)
        std_dev = params.get("std_dev", 2.0)
        mid, upper, lower = calc_bollinger(closes, period, std_dev)
        for i in range(1, n):
            if lower[i] is not None and upper[i] is not None:
                if closes[i-1] >= lower[i-1] and closes[i] < lower[i]:
                    signals[i] = 1
                elif closes[i-1] <= upper[i-1] and closes[i] > upper[i]:
                    signals[i] = -1
                # Revert signals for mean reversion
                if closes[i-1] < lower[i-1] and closes[i] > lower[i]:
                    signals[i] = 1
                if closes[i-1] > upper[i-1] and closes[i] < upper[i]:
                    signals[i] = -1
    
    elif strategy_type == "macd":
        fast = params.get("fast", 12)
        slow = params.get("slow", 26)
        sig = params.get("signal", 9)
        macd_line, signal_line, histogram = calc_macd(closes, fast, slow, sig)
        for i in range(1, n):
            if macd_line[i] is not None and signal_line[i] is not None and macd_line[i-1] is not None and signal_line[i-1] is not None:
                if macd_line[i-1] <= signal_line[i-1] and macd_line[i] > signal_line[i]:
                    signals[i] = 1
                elif macd_line[i-1] >= signal_line[i-1] and macd_line[i] < signal_line[i]:
                    signals[i] = -1
    
    # Execute trades
    trades = []
    position = None
    equity = 10000.0
    equity_curve = [equity]
    peak_equity = equity
    max_drawdown = 0
    
    for i in range(n):
        if signals[i] == 1 and position is None:
            position = {"entry_price": closes[i], "entry_idx": i, "entry_time": ohlc[i]["time"], "type": "long"}
        elif signals[i] == -1 and position is not None and position["type"] == "long":
            pnl_pct = (closes[i] - position["entry_price"]) / position["entry_price"]
            pnl = equity * pnl_pct
            equity += pnl
            trades.append({
                "entry_time": position["entry_time"],
                "exit_time": ohlc[i]["time"],
                "entry_price": position["entry_price"],
                "exit_price": closes[i],
                "type": "long",
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct * 100, 4),
                "entry_idx": position["entry_idx"],
                "exit_idx": i,
            })
            position = None
        elif signals[i] == -1 and position is None:
            position = {"entry_price": closes[i], "entry_idx": i, "entry_time": ohlc[i]["time"], "type": "short"}
        elif signals[i] == 1 and position is not None and position["type"] == "short":
            pnl_pct = (position["entry_price"] - closes[i]) / position["entry_price"]
            pnl = equity * pnl_pct
            equity += pnl
            trades.append({
                "entry_time": position["entry_time"],
                "exit_time": ohlc[i]["time"],
                "entry_price": position["entry_price"],
                "exit_price": closes[i],
                "type": "short",
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct * 100, 4),
                "entry_idx": position["entry_idx"],
                "exit_idx": i,
            })
            position = None
        
        equity_curve.append(round(equity, 2))
        if equity > peak_equity:
            peak_equity = equity
        dd = (peak_equity - equity) / peak_equity * 100 if peak_equity > 0 else 0
        if dd > max_drawdown:
            max_drawdown = dd
    
    wins = [t for t in trades if t["pnl"] > 0]
    losses_list = [t for t in trades if t["pnl"] <= 0]
    total_pnl = sum(t["pnl"] for t in trades)
    
    return {
        "total_trades": len(trades),
        "winning_trades": len(wins),
        "losing_trades": len(losses_list),
        "win_rate": round(len(wins) / len(trades) * 100, 2) if trades else 0,
        "total_pnl": round(total_pnl, 2),
        "total_pnl_pct": round(total_pnl / 10000 * 100, 2),
        "max_drawdown": round(max_drawdown, 2),
        "avg_win": round(sum(t["pnl"] for t in wins) / len(wins), 2) if wins else 0,
        "avg_loss": round(sum(t["pnl"] for t in losses_list) / len(losses_list), 2) if losses_list else 0,
        "profit_factor": round(abs(sum(t["pnl"] for t in wins)) / abs(sum(t["pnl"] for t in losses_list)), 2) if losses_list and sum(t["pnl"] for t in losses_list) != 0 else 0,
        "final_equity": round(equity, 2),
        "equity_curve": equity_curve,
        "trades": trades,
        "signals": signals,
    }

@api_router.post("/backtest")
async def run_backtest_endpoint(req: BacktestRequest, user: dict = Depends(get_current_user)):
    pair = req.pair.replace("-", "/")
    if pair not in PAIRS:
        raise HTTPException(404, f"Pair {pair} not found")
    ohlc = generate_ohlc_data(pair, req.timeframe, min(req.bars, 2000))
    result = run_backtest(ohlc, req.strategy_type, req.params)
    
    # Save backtest
    doc = {
        "user_id": user["_id"],
        "pair": pair,
        "timeframe": req.timeframe,
        "strategy_type": req.strategy_type,
        "params": req.params,
        "strategy_id": req.strategy_id,
        "total_trades": result["total_trades"],
        "win_rate": result["win_rate"],
        "total_pnl": result["total_pnl"],
        "max_drawdown": result["max_drawdown"],
        "final_equity": result["final_equity"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.backtests.insert_one(doc)
    
    return {"ohlc": ohlc, "result": result}

@api_router.get("/backtests")
async def list_backtests(user: dict = Depends(get_current_user)):
    cursor = db.backtests.find(
        {"user_id": user["_id"]},
        {"_id": 1, "pair": 1, "timeframe": 1, "strategy_type": 1, "total_trades": 1, "win_rate": 1, "total_pnl": 1, "max_drawdown": 1, "final_equity": 1, "created_at": 1}
    ).sort("created_at", -1).limit(50)
    results = []
    async for b in cursor:
        b["id"] = str(b.pop("_id"))
        results.append(b)
    return {"backtests": results}

# ─── Admin Seeding ───
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({"email": admin_email, "password_hash": hashed, "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()})
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await seed_admin()
    # Write test credentials
    creds = f"""# Test Credentials\n\n## Admin\n- Email: {os.environ.get('ADMIN_EMAIL', 'admin@example.com')}\n- Password: {os.environ.get('ADMIN_PASSWORD', 'admin123')}\n- Role: admin\n\n## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n"""
    Path("/app/memory").mkdir(exist_ok=True)
    Path("/app/memory/test_credentials.md").write_text(creds)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000"), os.environ.get("CORS_ORIGINS", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
