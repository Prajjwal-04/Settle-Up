// ✅ Register Page with ColorHunt Palette and Member Name Handling
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

// 🎨 ColorHunt Palette: https://colorhunt.co/palette/0040304a9782dcd0a8fff9e5
const themeColors = {
  gradient: 'linear-gradient(to right, #4a9782, #dcd0a8)',
  card: '#fff9e5',
  border: '#dcd0a8',
  textPrimary: '#004030',
  textSecondary: '#4a9782',
  textMuted: '#6b7280',
  accent: '#004030',
  accentText: '#ffffff',
  error: '#dc2626',
};

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        groups: [],
        createdAt: new Date(),
      });

      navigate("/dashboard");
    } catch (err) {
      setError("Registration failed. Please try again.");
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
          style={{ backgroundColor: themeColors.card, border: `1px solid ${themeColors.border}` }}
        >
          <h2 className="text-2xl font-bold text-center mb-2" style={{ color: themeColors.textPrimary }}>
            Create an Account
          </h2>
          <p className="text-center mb-6" style={{ color: themeColors.textSecondary }}>
            Join Split It to start sharing expenses
          </p>

          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1" style={{ color: themeColors.textSecondary }}>
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a9782]"
                style={{ backgroundColor: '#ffffff', border: `1px solid ${themeColors.border}`, color: themeColors.textPrimary }}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: themeColors.textSecondary }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a9782]"
                style={{ backgroundColor: '#ffffff', border: `1px solid ${themeColors.border}`, color: themeColors.textPrimary }}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: themeColors.textSecondary }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a9782]"
                style={{ backgroundColor: '#ffffff', border: `1px solid ${themeColors.border}`, color: themeColors.textPrimary }}
                required
                minLength="6"
              />
            </div>

            {error && (
              <p className="text-sm text-center font-medium" style={{ color: themeColors.error }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-bold rounded-full hover:shadow-md transition"
              style={{ backgroundColor: loading ? '#033d2d' : themeColors.accent, color: themeColors.accentText, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>
        </div>

        <p className="text-sm text-center mt-6" style={{ color: themeColors.textMuted }}>
          Already have an account?{' '}
          <span onClick={() => navigate('/login')} className="font-semibold cursor-pointer hover:underline" style={{ color: themeColors.accent }}>
            Log In
          </span>
        </p>
      </div>
    </div>
  );
}

export default Register;
