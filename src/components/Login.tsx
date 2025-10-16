import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

interface LoginProps {
  onLogin: () => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
  
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (error: any) {
      console.error('Login error:', error);
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full mix-blend-lighten filter blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/3 rounded-full mix-blend-lighten filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="backdrop-blur-xl bg-zinc-900/80 border border-zinc-800 rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-zinc-400">Sign in to access your admin dashboard</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-zinc-300 text-sm font-medium block">Email Address</label>
              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-zinc-800 bg-zinc-950/50 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-zinc-300 text-sm font-medium block">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-zinc-800 bg-zinc-950/50 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-900/50">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transform hover:scale-[1.02] transition-all duration-200"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};