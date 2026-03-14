import { useState } from 'react';
import { useAuth, ALLOWED_DOMAIN } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const { loginWithGoogle, domainError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      if (err.message !== 'Invalid email domain') {
        setError('Failed to sign in. Please try again.');
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[var(--color-brand-cream)] text-[var(--color-brand-charcoal)] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full flex flex-col items-center text-center">
        
        {/* Brand/Hero */}
        <div className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-serif font-semibold mb-4 text-[var(--color-brand-green)]">
            Time Capsule
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 italic font-serif">
            "What took you a semester to learn, takes them 30 seconds to find."
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-white/60 p-6 rounded-xl border border-gray-200 shadow-sm mb-8 text-left w-full max-w-sm">
          <p className="mb-4">
            A living knowledge base strictly for the campus. Only verified students get access.
          </p>
          <p className="text-sm text-gray-600 font-medium">
            Requires your <span className="text-[var(--color-brand-green)]">{ALLOWED_DOMAIN}</span> email.
          </p>
        </div>

        {/* Error Messages */}
        {domainError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm w-full max-w-sm">
            {domainError}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm w-full max-w-sm">
            {error}
          </div>
        )}

        {/* Login Action */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex items-center gap-3 bg-[var(--color-brand-lavender)] hover:bg-[#d8bcf5] text-[var(--color-brand-charcoal)] font-semibold py-3 px-6 rounded-lg shadow-sm border border-[var(--color-brand-charcoal)] transition-all active:scale-95 disabled:opacity-50"
        >
          <LogIn size={20} />
          {loading ? 'Signing in...' : 'Sign in with Institutional Email'}
        </button>
      </div>
    </div>
  );
}
