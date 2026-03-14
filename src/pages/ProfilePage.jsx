import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  User, LogOut, BookOpen, ThumbsUp, Calendar,
  Building, GraduationCap, Mail, Loader2
} from 'lucide-react';

export default function ProfilePage() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ tipsCount: 0, totalUpvotes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch tip count + total upvotes for current user
        const q = query(
          collection(db, 'tips'),
          where('authorId', '==', currentUser.uid)
        );
        const snap = await getDocs(q);
        let totalUp = 0;
        snap.docs.forEach(d => { totalUp += d.data().upvotes || 0; });
        setStats({ tipsCount: snap.docs.length, totalUpvotes: totalUp });
      } catch (err) {
        console.error('Error fetching profile stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [currentUser.uid]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  if (!userProfile) return null;

  return (
    <div className="p-4 md:p-6 pb-24 min-h-screen">

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Green Header */}
        <div className="bg-[var(--color-brand-green)] h-28 relative">
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={userProfile.name}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={40} className="text-gray-300" />
              )}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="pt-16 px-6 pb-6">
          <h2 className="text-2xl font-serif font-bold text-[var(--color-brand-charcoal)] mb-1">
            {userProfile.name}
          </h2>
          <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-6">
            <Mail size={14} /> {userProfile.email}
          </p>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center text-center">
              <Building size={20} className="text-[var(--color-brand-green)] mb-2" />
              <span className="text-xs text-gray-500 font-medium">Department</span>
              <span className="text-sm font-bold text-[var(--color-brand-charcoal)] mt-0.5">{userProfile.department}</span>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center text-center">
              <GraduationCap size={20} className="text-[var(--color-brand-green)] mb-2" />
              <span className="text-xs text-gray-500 font-medium">Year</span>
              <span className="text-sm font-bold text-[var(--color-brand-charcoal)] mt-0.5">{userProfile.year}</span>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center text-center">
              <BookOpen size={20} className="text-[var(--color-brand-lavender)] mb-2" />
              <span className="text-xs text-gray-500 font-medium">Tips Posted</span>
              <span className="text-sm font-bold text-[var(--color-brand-charcoal)] mt-0.5">
                {loading ? <Loader2 size={14} className="animate-spin inline" /> : stats.tipsCount}
              </span>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center text-center">
              <ThumbsUp size={20} className="text-blue-500 mb-2" />
              <span className="text-xs text-gray-500 font-medium">Total Upvotes</span>
              <span className="text-sm font-bold text-[var(--color-brand-charcoal)] mt-0.5">
                {loading ? <Loader2 size={14} className="animate-spin inline" /> : stats.totalUpvotes}
              </span>
            </div>
          </div>

          {/* Joined Date */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-8">
            <Calendar size={14} />
            <span>
              Joined{' '}
              {userProfile.joinedAt
                ? (typeof userProfile.joinedAt.toDate === 'function'
                    ? format(userProfile.joinedAt.toDate(), 'MMMM yyyy')
                    : 'recently')
                : 'recently'}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg border border-red-200 transition-colors w-full sm:w-auto justify-center"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
