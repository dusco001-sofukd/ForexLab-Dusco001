import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Eye, EyeOff, TrendingUp } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) navigate("/");
    else setError(result.error);
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <TrendingUp className="w-8 h-8 text-black" strokeWidth={2.5} />
            <span className="font-heading text-2xl font-black uppercase tracking-tight text-black">FX REPLAY</span>
          </div>
          <h1 className="font-heading text-4xl font-black uppercase tracking-tight text-black mb-2">Sign In</h1>
          <p className="font-body text-black/60 mb-8">Access your strategies and backtests</p>
          {error && <div className="border border-red-600 bg-red-50 text-red-700 px-4 py-3 mb-6 font-mono text-sm" data-testid="login-error">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="font-mono text-xs uppercase tracking-[0.2em] text-black/60 mb-2 block">Email</Label>
              <Input
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-none border-black focus:ring-0 focus:border-black bg-white h-12 font-body"
                placeholder="trader@example.com"
              />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-[0.2em] text-black/60 mb-2 block">Password</Label>
              <div className="relative">
                <Input
                  data-testid="login-password-input"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-none border-black focus:ring-0 focus:border-black bg-white h-12 font-body pr-12"
                  placeholder="Enter password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              data-testid="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white px-6 py-3 font-mono uppercase text-sm font-bold hover:bg-neutral-800 transition-colors duration-150 disabled:opacity-50 h-12"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="mt-6 text-center font-body text-sm text-black/60">
            No account?{" "}
            <Link to="/register" className="text-black font-bold underline underline-offset-4 hover:text-black/70" data-testid="go-to-register">
              Register
            </Link>
          </p>
        </div>
      </div>
      <div
        className="hidden lg:flex flex-1 items-center justify-center bg-cover bg-center border-l border-black"
        style={{ backgroundImage: "url(https://static.prod-images.emergentagent.com/jobs/ab2522d4-0f38-41c9-8300-e3f1b1859aa2/images/0089845b23aa63ef97e1bcea1c6efcabe225ea67ed73f43f52fc86cf794168f6.png)" }}
      >
        <div className="bg-white/90 p-10 max-w-sm border border-black">
          <h2 className="font-heading text-2xl font-black uppercase mb-3 text-black">Strategy Tester</h2>
          <p className="font-body text-black/70">Backtest forex strategies with chart replay. Analyze MA Crossover, RSI, Bollinger Bands, MACD and more.</p>
        </div>
      </div>
    </div>
  );
}
