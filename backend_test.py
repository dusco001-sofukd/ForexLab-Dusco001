#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ForexTesterAPITest:
    def __init__(self, base_url="https://fx-replay-lab-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_auth_register(self):
        """Test user registration"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        payload = {
            "email": test_email,
            "password": "testpass123",
            "name": "Test User"
        }
        
        try:
            response = self.session.post(f"{self.api_url}/auth/register", json=payload)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "email" in data:
                    self.log_test("User Registration", True)
                    return True, test_email
                else:
                    self.log_test("User Registration", False, "Missing user data in response")
            else:
                self.log_test("User Registration", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("User Registration", False, f"Exception: {str(e)}")
        
        return False, None

    def test_auth_login(self, email="admin@example.com", password="admin123"):
        """Test user login"""
        payload = {"email": email, "password": password}
        
        try:
            response = self.session.post(f"{self.api_url}/auth/login", json=payload)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "email" in data:
                    self.log_test("User Login", True)
                    return True
                else:
                    self.log_test("User Login", False, "Missing user data in response")
            else:
                self.log_test("User Login", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
        
        return False

    def test_auth_me(self):
        """Test get current user"""
        try:
            response = self.session.get(f"{self.api_url}/auth/me")
            if response.status_code == 200:
                data = response.json()
                if "email" in data:
                    self.log_test("Get Current User", True)
                    return True
                else:
                    self.log_test("Get Current User", False, "Missing email in response")
            else:
                self.log_test("Get Current User", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Current User", False, f"Exception: {str(e)}")
        
        return False

    def test_auth_logout(self):
        """Test user logout"""
        try:
            response = self.session.post(f"{self.api_url}/auth/logout")
            if response.status_code == 200:
                self.log_test("User Logout", True)
                return True
            else:
                self.log_test("User Logout", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("User Logout", False, f"Exception: {str(e)}")
        
        return False

    def test_forex_pairs(self):
        """Test get forex pairs"""
        try:
            response = self.session.get(f"{self.api_url}/forex/pairs")
            if response.status_code == 200:
                data = response.json()
                if "pairs" in data and len(data["pairs"]) > 0:
                    self.log_test("Get Forex Pairs", True)
                    return True
                else:
                    self.log_test("Get Forex Pairs", False, "No pairs in response")
            else:
                self.log_test("Get Forex Pairs", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Forex Pairs", False, f"Exception: {str(e)}")
        
        return False

    def test_forex_data(self):
        """Test get forex OHLC data"""
        try:
            response = self.session.get(f"{self.api_url}/forex/data/EUR-USD", 
                                      params={"timeframe": "1h", "bars": 100})
            if response.status_code == 200:
                data = response.json()
                if "data" in data and len(data["data"]) > 0:
                    # Check OHLC structure
                    first_bar = data["data"][0]
                    required_fields = ["time", "open", "high", "low", "close", "volume"]
                    if all(field in first_bar for field in required_fields):
                        self.log_test("Get Forex OHLC Data", True)
                        return True
                    else:
                        self.log_test("Get Forex OHLC Data", False, "Missing OHLC fields")
                else:
                    self.log_test("Get Forex OHLC Data", False, "No data in response")
            else:
                self.log_test("Get Forex OHLC Data", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Forex OHLC Data", False, f"Exception: {str(e)}")
        
        return False

    def test_indicators_calculate(self):
        """Test indicator calculations"""
        payload = {
            "pair": "EUR-USD",
            "timeframe": "1h",
            "bars": 100,
            "indicators": [
                {"type": "sma", "period": 20},
                {"type": "ema", "period": 20},
                {"type": "rsi", "period": 14},
                {"type": "macd", "fast": 12, "slow": 26, "signal": 9},
                {"type": "bollinger", "period": 20, "std_dev": 2.0}
            ]
        }
        
        try:
            response = self.session.post(f"{self.api_url}/indicators/calculate", json=payload)
            if response.status_code == 200:
                data = response.json()
                if "indicators" in data:
                    indicators = data["indicators"]
                    expected_indicators = ["sma_20", "ema_20", "rsi_14", "macd_line", "bb_middle"]
                    if all(ind in indicators for ind in expected_indicators):
                        self.log_test("Calculate Indicators", True)
                        return True
                    else:
                        self.log_test("Calculate Indicators", False, "Missing expected indicators")
                else:
                    self.log_test("Calculate Indicators", False, "No indicators in response")
            else:
                self.log_test("Calculate Indicators", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Calculate Indicators", False, f"Exception: {str(e)}")
        
        return False

    def test_backtest(self):
        """Test backtesting functionality"""
        payload = {
            "pair": "EUR-USD",
            "timeframe": "1h",
            "bars": 200,
            "strategy_type": "ma_crossover",
            "params": {"fast_period": 10, "slow_period": 20}
        }
        
        try:
            response = self.session.post(f"{self.api_url}/backtest", json=payload)
            if response.status_code == 200:
                data = response.json()
                if "result" in data and "ohlc" in data:
                    result = data["result"]
                    required_fields = ["total_trades", "win_rate", "total_pnl", "max_drawdown", "trades"]
                    if all(field in result for field in required_fields):
                        self.log_test("Run Backtest", True)
                        return True
                    else:
                        self.log_test("Run Backtest", False, "Missing backtest result fields")
                else:
                    self.log_test("Run Backtest", False, "No result in response")
            else:
                self.log_test("Run Backtest", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Run Backtest", False, f"Exception: {str(e)}")
        
        return False

    def test_strategies_crud(self):
        """Test strategy CRUD operations"""
        # Create strategy
        create_payload = {
            "name": "Test MA Strategy",
            "strategy_type": "ma_crossover",
            "params": {"fast_period": 10, "slow_period": 20},
            "description": "Test strategy"
        }
        
        try:
            # Create
            response = self.session.post(f"{self.api_url}/strategies", json=create_payload)
            if response.status_code != 200:
                self.log_test("Create Strategy", False, f"Status {response.status_code}: {response.text}")
                return False
            
            strategy_data = response.json()
            strategy_id = strategy_data.get("id")
            if not strategy_id:
                self.log_test("Create Strategy", False, "No strategy ID returned")
                return False
            
            self.log_test("Create Strategy", True)
            
            # List strategies
            response = self.session.get(f"{self.api_url}/strategies")
            if response.status_code == 200:
                data = response.json()
                if "strategies" in data and len(data["strategies"]) > 0:
                    self.log_test("List Strategies", True)
                else:
                    self.log_test("List Strategies", False, "No strategies in response")
            else:
                self.log_test("List Strategies", False, f"Status {response.status_code}: {response.text}")
            
            # Delete strategy
            response = self.session.delete(f"{self.api_url}/strategies/{strategy_id}")
            if response.status_code == 200:
                self.log_test("Delete Strategy", True)
                return True
            else:
                self.log_test("Delete Strategy", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Strategy CRUD", False, f"Exception: {str(e)}")
        
        return False

    def test_custom_backtest_valid(self):
        """Test custom backtest with valid Python code"""
        valid_code = """
# Simple SMA crossover strategy
fast = sma(closes, 8)
slow = sma(closes, 21)

for i in range(1, n):
    if fast[i] is not None and slow[i] is not None:
        if fast[i-1] is not None and slow[i-1] is not None:
            if fast[i-1] <= slow[i-1] and fast[i] > slow[i]:
                signals[i] = 1
            elif fast[i-1] >= slow[i-1] and fast[i] < slow[i]:
                signals[i] = -1
"""
        
        payload = {
            "pair": "EUR-USD",
            "timeframe": "1h", 
            "bars": 200,
            "code": valid_code
        }
        
        try:
            response = self.session.post(f"{self.api_url}/backtest/custom", json=payload)
            if response.status_code == 200:
                data = response.json()
                if "result" in data and "ohlc" in data:
                    result = data["result"]
                    required_fields = ["total_trades", "win_rate", "total_pnl", "signals"]
                    if all(field in result for field in required_fields):
                        self.log_test("Custom Backtest (Valid Code)", True)
                        return True
                    else:
                        self.log_test("Custom Backtest (Valid Code)", False, "Missing result fields")
                else:
                    self.log_test("Custom Backtest (Valid Code)", False, "No result in response")
            else:
                self.log_test("Custom Backtest (Valid Code)", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Custom Backtest (Valid Code)", False, f"Exception: {str(e)}")
        
        return False

    def test_custom_backtest_forbidden(self):
        """Test custom backtest with forbidden keywords"""
        forbidden_code = """
import os
print("This should be blocked")
"""
        
        payload = {
            "pair": "EUR-USD",
            "timeframe": "1h",
            "bars": 100,
            "code": forbidden_code
        }
        
        try:
            response = self.session.post(f"{self.api_url}/backtest/custom", json=payload)
            if response.status_code == 400:
                data = response.json()
                if "forbidden" in data.get("detail", "").lower():
                    self.log_test("Custom Backtest (Forbidden Keywords)", True)
                    return True
                else:
                    self.log_test("Custom Backtest (Forbidden Keywords)", False, "Should block forbidden keywords")
            else:
                self.log_test("Custom Backtest (Forbidden Keywords)", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Custom Backtest (Forbidden Keywords)", False, f"Exception: {str(e)}")
        
        return False

    def test_forex_data_live_source(self):
        """Test forex data with live source (Alpha Vantage)"""
        try:
            response = self.session.get(f"{self.api_url}/forex/data/EUR-USD", 
                                      params={"timeframe": "1h", "bars": 100, "source": "live"})
            if response.status_code == 200:
                data = response.json()
                if "data" in data and "source" in data:
                    # Should return either alpha_vantage or generated_fallback
                    source = data["source"]
                    if source in ["alpha_vantage", "generated_fallback"]:
                        self.log_test("Forex Data (Live Source)", True)
                        return True
                    else:
                        self.log_test("Forex Data (Live Source)", False, f"Unexpected source: {source}")
                else:
                    self.log_test("Forex Data (Live Source)", False, "Missing data or source in response")
            else:
                self.log_test("Forex Data (Live Source)", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Forex Data (Live Source)", False, f"Exception: {str(e)}")
        
        return False

    def test_forex_data_generated_source(self):
        """Test forex data with generated source"""
        try:
            response = self.session.get(f"{self.api_url}/forex/data/EUR-USD", 
                                      params={"timeframe": "1h", "bars": 100, "source": "generated"})
            if response.status_code == 200:
                data = response.json()
                if "data" in data and "source" in data:
                    source = data["source"]
                    if source == "generated":
                        self.log_test("Forex Data (Generated Source)", True)
                        return True
                    else:
                        self.log_test("Forex Data (Generated Source)", False, f"Expected 'generated', got '{source}'")
                else:
                    self.log_test("Forex Data (Generated Source)", False, "Missing data or source in response")
            else:
                self.log_test("Forex Data (Generated Source)", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Forex Data (Generated Source)", False, f"Exception: {str(e)}")
        
        return False

    def test_backtest_with_sl_tp(self):
        """Test backtest with stop loss and take profit"""
        payload = {
            "pair": "EUR-USD",
            "timeframe": "1h",
            "bars": 200,
            "strategy_type": "ma_crossover",
            "params": {"fast_period": 10, "slow_period": 20},
            "stop_loss": 0.5,
            "take_profit": 1.0,
            "sl_tp_mode": "pct"
        }
        
        try:
            response = self.session.post(f"{self.api_url}/backtest", json=payload)
            if response.status_code == 200:
                data = response.json()
                if "result" in data and "ohlc" in data:
                    result = data["result"]
                    trades = result.get("trades", [])
                    
                    # Check if trades have exit_reason field
                    has_exit_reasons = all("exit_reason" in trade for trade in trades)
                    
                    # Check if some trades have SL/TP exit reasons
                    sl_tp_trades = [t for t in trades if t.get("exit_reason") in ["sl", "tp"]]
                    
                    if has_exit_reasons:
                        self.log_test("Backtest with SL/TP (exit_reason field)", True)
                        if sl_tp_trades:
                            self.log_test("Backtest with SL/TP (SL/TP exits found)", True)
                        else:
                            self.log_test("Backtest with SL/TP (SL/TP exits found)", False, "No SL/TP exits in trades")
                        return True
                    else:
                        self.log_test("Backtest with SL/TP", False, "Trades missing exit_reason field")
                else:
                    self.log_test("Backtest with SL/TP", False, "No result in response")
            else:
                self.log_test("Backtest with SL/TP", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Backtest with SL/TP", False, f"Exception: {str(e)}")
        
        return False

    def test_custom_backtest_with_sl_tp(self):
        """Test custom backtest with stop loss and take profit"""
        valid_code = """
# Simple SMA crossover strategy
fast = sma(closes, 8)
slow = sma(closes, 21)

for i in range(1, n):
    if fast[i] is not None and slow[i] is not None:
        if fast[i-1] is not None and slow[i-1] is not None:
            if fast[i-1] <= slow[i-1] and fast[i] > slow[i]:
                signals[i] = 1
            elif fast[i-1] >= slow[i-1] and fast[i] < slow[i]:
                signals[i] = -1
"""
        
        payload = {
            "pair": "EUR-USD",
            "timeframe": "1h", 
            "bars": 200,
            "code": valid_code,
            "stop_loss": 0.5,
            "take_profit": 1.0,
            "sl_tp_mode": "pct"
        }
        
        try:
            response = self.session.post(f"{self.api_url}/backtest/custom", json=payload)
            if response.status_code == 200:
                data = response.json()
                if "result" in data and "ohlc" in data:
                    result = data["result"]
                    trades = result.get("trades", [])
                    
                    # Check if trades have exit_reason field
                    has_exit_reasons = all("exit_reason" in trade for trade in trades)
                    
                    if has_exit_reasons:
                        self.log_test("Custom Backtest with SL/TP", True)
                        return True
                    else:
                        self.log_test("Custom Backtest with SL/TP", False, "Trades missing exit_reason field")
                else:
                    self.log_test("Custom Backtest with SL/TP", False, "No result in response")
            else:
                self.log_test("Custom Backtest with SL/TP", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Custom Backtest with SL/TP", False, f"Exception: {str(e)}")
        
        return False

    def test_csv_upload_valid(self):
        """Test CSV upload with valid OHLC data"""
        valid_csv = """date,open,high,low,close,volume
2024-01-01 00:00:00,1.0850,1.0870,1.0840,1.0860,1000
2024-01-01 01:00:00,1.0860,1.0880,1.0850,1.0875,1200
2024-01-01 02:00:00,1.0875,1.0890,1.0865,1.0880,1100
2024-01-01 03:00:00,1.0880,1.0895,1.0870,1.0885,1300
2024-01-01 04:00:00,1.0885,1.0900,1.0875,1.0890,1150"""
        
        payload = {
            "csv_text": valid_csv,
            "filename": "test_data.csv"
        }
        
        try:
            response = self.session.post(f"{self.api_url}/forex/upload-csv", json=payload)
            if response.status_code == 200:
                data = response.json()
                if "data" in data and "pair_name" in data:
                    ohlc_data = data["data"]
                    if len(ohlc_data) > 0:
                        # Check OHLC structure
                        first_bar = ohlc_data[0]
                        required_fields = ["time", "open", "high", "low", "close", "volume"]
                        if all(field in first_bar for field in required_fields):
                            self.log_test("CSV Upload (Valid Data)", True)
                            return True
                        else:
                            self.log_test("CSV Upload (Valid Data)", False, "Missing OHLC fields in parsed data")
                    else:
                        self.log_test("CSV Upload (Valid Data)", False, "No data parsed from CSV")
                else:
                    self.log_test("CSV Upload (Valid Data)", False, "Missing data or pair_name in response")
            else:
                self.log_test("CSV Upload (Valid Data)", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("CSV Upload (Valid Data)", False, f"Exception: {str(e)}")
        
        return False

    def test_csv_upload_invalid(self):
        """Test CSV upload with invalid data (missing columns)"""
        invalid_csv = """date,price
2024-01-01 00:00:00,1.0850
2024-01-01 01:00:00,1.0860"""
        
        payload = {
            "csv_text": invalid_csv,
            "filename": "invalid_data.csv"
        }
        
        try:
            response = self.session.post(f"{self.api_url}/forex/upload-csv", json=payload)
            if response.status_code == 400:
                data = response.json()
                detail = data.get("detail", "").lower()
                if "missing" in detail and "column" in detail:
                    self.log_test("CSV Upload (Invalid Data)", True)
                    return True
                else:
                    self.log_test("CSV Upload (Invalid Data)", False, "Should return missing column error")
            else:
                self.log_test("CSV Upload (Invalid Data)", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("CSV Upload (Invalid Data)", False, f"Exception: {str(e)}")
        
        return False

    def test_sl_tp_mode_pips(self):
        """Test backtest with SL/TP in PIPS mode"""
        payload = {
            "pair": "EUR-USD",
            "timeframe": "1h",
            "bars": 200,
            "strategy_type": "ma_crossover",
            "params": {"fast_period": 10, "slow_period": 20},
            "stop_loss": 50,
            "take_profit": 100,
            "sl_tp_mode": "pips"
        }
        
        try:
            response = self.session.post(f"{self.api_url}/backtest", json=payload)
            if response.status_code == 200:
                data = response.json()
                if "result" in data:
                    result = data["result"]
                    trades = result.get("trades", [])
                    
                    # Check if trades have exit_reason field
                    has_exit_reasons = all("exit_reason" in trade for trade in trades)
                    
                    if has_exit_reasons:
                        self.log_test("Backtest with SL/TP (PIPS mode)", True)
                        return True
                    else:
                        self.log_test("Backtest with SL/TP (PIPS mode)", False, "Trades missing exit_reason field")
                else:
                    self.log_test("Backtest with SL/TP (PIPS mode)", False, "No result in response")
            else:
                self.log_test("Backtest with SL/TP (PIPS mode)", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Backtest with SL/TP (PIPS mode)", False, f"Exception: {str(e)}")
        
        return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Forex Strategy Tester API Tests")
        print("=" * 50)
        
        # Test without authentication first
        print("\n📊 Testing Public Endpoints:")
        self.test_forex_pairs()
        self.test_forex_data()
        
        # Test new Alpha Vantage integration
        print("\n🌐 Testing Alpha Vantage Integration:")
        self.test_forex_data_live_source()
        self.test_forex_data_generated_source()
        
        # Test authentication flow
        print("\n🔐 Testing Authentication:")
        success, test_email = self.test_auth_register()
        
        # Login with admin credentials
        if self.test_auth_login():
            print("\n🔒 Testing Authenticated Endpoints:")
            self.test_auth_me()
            self.test_indicators_calculate()
            self.test_backtest()
            self.test_strategies_crud()
            
            # Test new custom backtest functionality
            print("\n🐍 Testing Custom Strategy Sandbox:")
            self.test_custom_backtest_valid()
            self.test_custom_backtest_forbidden()
            
            # Test Phase 3 features: SL/TP and CSV upload
            print("\n🛡️ Testing Phase 3 Features (SL/TP & CSV):")
            self.test_backtest_with_sl_tp()
            self.test_custom_backtest_with_sl_tp()
            self.test_sl_tp_mode_pips()
            self.test_csv_upload_valid()
            self.test_csv_upload_invalid()
            
            self.test_auth_logout()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📈 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

def main():
    tester = ForexTesterAPITest()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())