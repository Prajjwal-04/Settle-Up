// ✅ Login Page with Modern ColorHunt Palette
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";

// 🎨 Updated Color Palette from ColorHunt (https://colorhunt.co/palette/0040304a9782dcd0a8fff9e5)
const themeColors = {
  gradient: 'linear-gradient(to right, #4a9782, #dcd0a8)',
  card: '#fff9e5',              // Light cream background for card
  border: '#b1ab86',            // Pale gold
  textPrimary: '#004030',       // Dark green
  textSecondary: '#4a9782',     // Desaturated green
  textMuted: '#6b7280',         // Neutral gray for placeholders
  accent: '#004030',            // For button
  accentText: '#ffffff',
  error: '#dc2626',
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: themeColors.gradient }}
    >
      <div className="w-full max-w-sm">
        <div
          className="rounded-2xl p-8 shadow-xl border backdrop-blur-md"
          style={{
            backgroundColor: themeColors.card,
            border: `1px solid ${themeColors.border}`,
          }}
        >
          <h2
            className="text-2xl font-bold text-center mb-2"
            style={{ color: themeColors.textPrimary }}
          >
            Welcome Back
          </h2>
          <p className="text-center mb-6" style={{ color: themeColors.textSecondary }}>
            Login to continue
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1"
                style={{ color: themeColors.textSecondary }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a9782]"
                style={{
                  backgroundColor: '#ffffff',
                  border: `1px solid ${themeColors.border}`,
                  color: themeColors.textPrimary,
                }}
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
                style={{ color: themeColors.textSecondary }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a9782]"
                style={{
                  backgroundColor: '#ffffff',
                  border: `1px solid ${themeColors.border}`,
                  color: themeColors.textPrimary,
                }}
                required
              />
            </div>

            {error && (
              <p
                className="text-sm text-center font-medium"
                style={{ color: themeColors.error }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-bold rounded-full hover:shadow-md transition"
              style={{
                backgroundColor: loading ? '#033d2d' : themeColors.accent,
                color: themeColors.accentText,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
        </div>

        <p
          className="text-sm text-center mt-6"
          style={{ color: themeColors.textMuted }}
        >
          Don't have an account?{' '}
          <span
            onClick={() => navigate('/register')}
            className="font-semibold cursor-pointer hover:underline"
            style={{ color: themeColors.accent }}
          >
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;