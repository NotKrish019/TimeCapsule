import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import TipCard from '../components/TipCard';
import { Bookmark, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SavedTipsPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [savedTips, setSavedTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // When a bookmark is toggled off from within Saved Tips, optionally remove it from UI immediately
  // But doing a full refetch or local state filter is fine. We will pass a callback to TipCard.
  function handleBookmarkToggle(tipId, isNowBookmarked) {
    if (!isNowBookmarked) {
      setSavedTips(prev => prev.filter(t => t.id !== tipId));
    }
  }

  useEffect(() => {
    async function fetchSavedTips() {
      if (!userProfile?.bookmarks || userProfile.bookmarks.length === 0) {
        setSavedTips([]);
        setLoading(false);
        return;
      }
      
      try {
        // Firestore 'in' query supports max 10 elements in array per SRD constraints/Firebase limits.
        // If > 10 bookmarks, chunk them.
        const allIds = userProfile.bookmarks;
        let fetchedDocs = [];
        
        for (let i = 0; i < allIds.length; i += 10) {
          const chunk = allIds.slice(i, i + 10);
          const q = query(
            collection(db, 'tips'),
            where(documentId(), 'in', chunk),
            where('hidden', '==', false)
          );
          const snap = await getDocs(q);
          fetchedDocs = [...fetchedDocs, ...snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))];
        }

        setSavedTips(fetchedDocs);
      } catch (err) {
         console.error("Error fetching bookmarks:", err);
         setError('Failed to load your saved tips.');
      } finally {
        setLoading(false);
      }
    }

    fetchSavedTips();
  }, [userProfile?.bookmarks]);

  return (
    <div className="p-4 md:p-6 pb-24 min-h-screen">
      <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-4">
        <Bookmark size={28} className="text-[var(--color-brand-green)] stroke-[2px]" />
        <h2 className="text-3xl font-serif font-bold text-[var(--color-brand-green)]">Saved Tips</h2>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6 font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
           <Loader2 size={40} className="animate-spin mb-4 text-[var(--color-brand-lavender)]" />
           <p className="font-medium text-lg text-gray-500">Retrieving your archives...</p>
        </div>
      ) : savedTips.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center justify-center min-h-[40vh]">
          <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-6">
             <Bookmark size={28} className="text-gray-300 stroke-[2px]" />
          </div>
          <h3 className="text-xl font-serif font-bold text-[var(--color-brand-charcoal)] mb-2">No saved tips yet</h3>
          <p className="text-gray-500 text-sm max-w-sm mb-8 leading-relaxed">
            When you find advice that you want to keep handy for exams, placements, or general survival, bookmark it here.
          </p>
          <button 
             onClick={() => navigate('/')}
             className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-brand-green)] hover:bg-[#043326] text-white font-semibold rounded-lg transition-colors border shadow-sm"
          >
             Browse the Feed <ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6 items-stretch">
          {savedTips.map((tip) => (
             <TipCard key={tip.id} tip={tip} onBookmarkToggle={handleBookmarkToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
