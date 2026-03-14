import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { DEPARTMENTS, YEARS } from '../lib/constants';
import { ChevronRight } from 'lucide-react';

export default function OnboardingPage() {
  const { currentUser, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!department || !year) {
      setError('Please select both your department and year.');
      return;
    }

    setLoading(true);
    setError('');

    const newProfile = {
      uid: currentUser.uid,
      name: currentUser.displayName || 'Anonymous Student',
      email: currentUser.email,
      college: 'SRM Institute of Science and Technology', // sensible default for the pilot
      department,
      year,
      totalUpvotes: 0,
      tipsCreated: 0,
      bookmarks: [],
      joinedAt: serverTimestamp()
    };

    try {
      // Create user document
      await setDoc(doc(db, 'users', currentUser.uid), newProfile);
      
      // Update local state so ProtectedRoute re-evaluates
      completeOnboarding(newProfile);
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setError(`Failed to create profile: ${err.code || err.message}. Check Firestore rules and database setup.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-brand-cream)] flex flex-col items-center justify-center p-6 text-[var(--color-brand-charcoal)]">
      <div className="w-full max-w-lg bg-white rounded-2xl p-8 md:p-10 border border-gray-200 shadow-sm relative">
        <h1 className="text-3xl font-serif font-bold text-[var(--color-brand-green)] mb-2">Welcome to Time Capsule</h1>
        <p className="text-gray-600 mb-8">Before we begin, tell us a bit about where you are in your journey.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-semibold mb-2">What's your department?</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--color-brand-green)] outline-none"
              required
            >
              <option value="" disabled>Select Department</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">What year are you in?</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--color-brand-green)] outline-none"
              required
            >
              <option value="" disabled>Select Year</option>
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 mt-4 w-full bg-[var(--color-brand-lavender)] hover:bg-[#d8bcf5] text-[var(--color-brand-charcoal)] border border-[var(--color-brand-charcoal)] font-semibold p-4 rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Setting up Profile...' : 'Complete Profile & Enter'}
            {!loading && <ChevronRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
