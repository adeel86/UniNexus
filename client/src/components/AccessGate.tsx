import { useState, useEffect, createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff } from "lucide-react";

const ACCESS_TOKEN_KEY = "uninexus_access_token";

interface AccessGateContextType {
  accessToken: string | null;
  revokeAccess: () => void;
}

const AccessGateContext = createContext<AccessGateContextType>({
  accessToken: null,
  revokeAccess: () => {},
});

export function useAccessGate() {
  return useContext(AccessGateContext);
}

interface AccessGateProps {
  children: React.ReactNode;
}

export function AccessGate({ children }: AccessGateProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (stored) {
      setAccessToken(stored);
    }
    setChecking(false);
  }, []);

  const revokeAccess = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setAccessToken(null);
    setPassword("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.token);
        setAccessToken(data.token);
        setPassword("");
      } else if (res.status === 429) {
        setError("Too many attempts. Please wait 15 minutes before trying again.");
      } else {
        setAttempts((a) => a + 1);
        setError("Incorrect password. Please try again.");
        setPassword("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500">
        <div className="h-12 w-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Private Access</h1>
              <p className="text-sm text-white/50 mt-1 text-center">
                Enter the access password to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  data-testid="input-access-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={loading}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-purple-400 focus:ring-purple-400/20 pr-10 h-11"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <p
                  data-testid="text-access-error"
                  className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                >
                  {error}
                </p>
              )}

              <Button
                data-testid="button-access-submit"
                type="submit"
                disabled={loading || !password.trim()}
                className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium border-0 shadow-lg shadow-purple-500/25"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Access Platform"
                )}
              </Button>
            </form>

            <p className="text-center text-white/25 text-xs mt-6">
              UniNexus · Private Beta
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AccessGateContext.Provider value={{ accessToken, revokeAccess }}>
      {children}
    </AccessGateContext.Provider>
  );
}
