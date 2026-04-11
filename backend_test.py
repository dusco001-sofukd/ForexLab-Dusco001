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

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Forex Strategy Tester API Tests")
        print("=" * 50)
        
        # Test without authentication first
        print("\n📊 Testing Public Endpoints:")
        self.test_forex_pairs()
        self.test_forex_data()
        
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