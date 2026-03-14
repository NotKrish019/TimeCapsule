import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, updateDoc, increment, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ThumbsUp, ThumbsDown, Bookmark, Flag, ChevronLeft, MapPin, Building, BadgeCheck, HelpCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function TipDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  
  const [tip, setTip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Synchronous lock for DB actions
  const isProcessing = useRef(false);

  useEffect(() => {
    if (!id) return;

    // Real-time listener for the tip document
    const unsub = onSnapshot(doc(db, 'tips', id), (docSnap) => {
      if (docSnap.exists() && !docSnap.data().hidden) {
        setTip({ id: docSnap.id, ...docSnap.data() });
        setLoading(false);
      } else {
        setError('This tip is no longer available or was hidden by the community.');
        setLoading(false);
      }
    }, (err) => {
      console.error("Error listening to tip:", err);
      setError('Failed to load tip details.');
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 min-h-screen flex flex-col items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[var(--color-brand-green)] mb-4" />
        <p className="text-gray-500 font-medium tracking-widest uppercase text-xs">Unpacking wisdom...</p>
      </div>
    );
  }

  if (error || !tip) {
    return (
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[var(--color-brand-green)] mb-6 font-semibold">
           <ChevronLeft size={20} /> Back
        </button>
        <div className="bg-red-50 text-red-700 p-8 rounded-3xl border border-red-100 text-center flex flex-col items-center max-w-lg mx-auto shadow-sm">
          <AlertTriangle size={40} className="mb-4" />
          <h2 className="text-2xl font-serif font-black mb-2 tracking-tight">Post Unavailable</h2>
          <p className="opacity-70 leading-relaxed font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const hasUpvoted = tip.upvotedBy?.includes(currentUser?.uid);
  const hasDownvoted = tip.downvotedBy?.includes(currentUser?.uid);
  const isBookmarked = userProfile?.bookmarks?.includes(tip.id);
  const hasFlagged = tip.flaggedBy?.includes(currentUser?.uid);
  const hasConfirmedRelevance = tip.relevantBy?.includes(currentUser?.uid);

  const currentSemesterStamp = (() => {
    const month = new Date().getMonth();
    const sem = (month >= 0 && month <= 5) ? 'Semester 2' : 'Semester 1';
    return `${sem}, ${new Date().getFullYear()}`;
  })();
  const isOlderThanOneSemester = tip.semester !== currentSemesterStamp;

  async function handleVote(type) {
    if (isProcessing.current || !currentUser) return;
    
    isProcessing.current = true;
    setActionLoading(true);
    const tipRef = doc(db, 'tips', tip.id);

    try {
      if (type === 'up') {
        if (hasUpvoted) {
          await updateDoc(tipRef, {
            upvotes: increment(-1),
            upvotedBy: arrayRemove(currentUser.uid)
          });
        } else {
          const updates = {
            upvotes: increment(hasDownvoted ? 2 : 1),
            upvotedBy: arrayUnion(currentUser.uid)
          };
          if (hasDownvoted) updates.downvotedBy = arrayRemove(currentUser.uid);
          await updateDoc(tipRef, updates);
        }
      } else if (type === 'down') {
        if (hasDownvoted) {
          await updateDoc(tipRef, {
            upvotes: increment(1),
            downvotedBy: arrayRemove(currentUser.uid)
          });
        } else {
          const updates = {
            upvotes: increment(hasUpvoted ? -2 : -1),
            downvotedBy: arrayUnion(currentUser.uid)
          };
          if (hasUpvoted) updates.upvotedBy = arrayRemove(currentUser.uid);
          await updateDoc(tipRef, updates);
        }
      }
    } catch (err) { console.error('Error voting:', err); }
    finally {
      setActionLoading(false);
      isProcessing.current = false;
    }
  }

  async function toggleBookmark() {
    if (isProcessing.current || !currentUser) return;
    
    isProcessing.current = true;
    setActionLoading(true);
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      if (isBookmarked) {
        await updateDoc(userRef, { bookmarks: arrayRemove(tip.id) });
      } else {
        await updateDoc(userRef, { bookmarks: arrayUnion(tip.id) });
      }
    } catch (err) { console.error('Error bookmarking:', err); }
    finally {
      setActionLoading(false);
      isProcessing.current = false;
    }
  }

  async function handleFlag() {
    if (hasFlagged || isProcessing.current || !currentUser) return;
    if (!window.confirm("Report this content? 3 flags will hide it automatically.")) return;
    
    isProcessing.current = true;
    setActionLoading(true);
    const tipRef = doc(db, 'tips', tip.id);
    const newFlagCount = (tip.flagCount || 0) + 1;
    try {
      await updateDoc(tipRef, {
        flagCount: increment(1),
        flaggedBy: arrayUnion(currentUser.uid),
        hidden: newFlagCount >= 3
      });
      if (newFlagCount >= 3) navigate('/');
    } catch (err) { console.error('Error flagging:', err); }
    finally {
      setActionLoading(false);
      isProcessing.current = false;
    }
  }

  async function markRelevant() {
    if (hasConfirmedRelevance || isProcessing.current || !currentUser) return;
    
    isProcessing.current = true;
    setActionLoading(true);
    const tipRef = doc(db, 'tips', tip.id);
    try {
      await updateDoc(tipRef, {
        relevantCount: increment(1),
        relevantBy: arrayUnion(currentUser.uid)
      });
    } catch (err) { console.error('Error marking relevant:', err); }
    finally {
      setActionLoading(false);
      isProcessing.current = false;
    }
  }

  return (
    <div className="p-4 md:p-8 pb-32 min-h-screen">
      <button onClick={() => navigate(-1)} className="flex items-center gap-3 text-gray-500 hover:text-[var(--color-brand-green)] mb-10 font-black transition-all group tracking-tighter uppercase text-xs">
         <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:-translate-x-1 transition-transform">
           <ChevronLeft size={18} />
         </div>
         Back to Archive
      </button>

      <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl shadow-green-900/5 border border-gray-100 max-w-5xl mx-auto flex flex-col md:flex-row h-full min-h-[600px]">
        
        {/* Left Section - Context & Stats */}
        <div className="w-full md:w-1/3 bg-[var(--color-brand-cream)]/40 p-10 md:p-12 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
           <div className="mb-10">
              <span className="bg-white text-[var(--color-brand-green)] px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-100 shadow-sm inline-block mb-6">
                {tip.category}
              </span>
              
              <div className="flex flex-col gap-4">
                 <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <Building size={20} className="text-[var(--color-brand-green)] mb-3" />
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Department</div>
                    <div className="text-sm font-bold text-gray-600 line-clamp-1">{tip.department}</div>
                 </div>
                 <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <MapPin size={20} className="text-red-400 mb-3" />
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Campus Location</div>
                    <div className="text-sm font-bold text-gray-600 line-clamp-1">{tip.location}</div>
                 </div>
              </div>
           </div>

           <div className="mt-auto pt-10 border-t border-gray-200/50 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[var(--color-brand-green)] font-black text-2xl border border-gray-100 shadow-sm">
                    {tip.semester?.[9] || 'S'}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{tip.semester}</span>
                    <span className="text-xs font-bold text-gray-500">
                      {tip.createdAt ? format(tip.createdAt.toDate(), "MMM do, yyyy") : 'Recent'}
                    </span>
                 </div>
              </div>

              {isOlderThanOneSemester && (
                <button 
                  onClick={markRelevant}
                  disabled={hasConfirmedRelevance || actionLoading}
                  className={`flex items-center justify-between w-full px-6 py-4 rounded-2xl border text-xs font-black transition-all shadow-sm
                    ${hasConfirmedRelevance ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle size={18} className={hasConfirmedRelevance ? "fill-green-200" : ""} />
                    {hasConfirmedRelevance ? 'STILL RELEVANT' : 'STILL RELEVANT?'}
                  </div>
                  <span className="opacity-40">{tip.relevantCount || 0}</span>
                </button>
              )}
           </div>
        </div>

        {/* Right Section - Content & Interaction */}
        <div className="w-full md:w-2/3 p-10 md:p-16 flex flex-col">
           <div className="flex justify-between items-start mb-10">
              <h1 className="text-3xl md:text-5xl font-serif font-black text-[var(--color-brand-charcoal)] leading-[1.1] select-text tracking-tighter">
                {tip.title}
                {tip.isVerified && (
                  <BadgeCheck size={36} className="inline-block ml-4 text-blue-500 align-text-bottom relative -top-1" />
                )}
              </h1>
              <button 
                onClick={toggleBookmark} 
                disabled={actionLoading} 
                className={`p-3.5 rounded-2xl border transition-all shrink-0 ml-6 ${isBookmarked ? 'bg-[var(--color-brand-green)] text-white border-[var(--color-brand-charcoal)] shadow-xl' : 'bg-gray-50 text-gray-300 border-transparent hover:text-gray-400'}`}
              >
                 <Bookmark size={24} className={isBookmarked ? 'fill-current' : ''} />
              </button>
           </div>

           <div className="prose-base md:prose-lg max-w-none text-gray-600 leading-[1.8] whitespace-pre-wrap select-text mb-16 font-medium tracking-tight">
              {tip.content}
           </div>

           <div className="mt-auto flex flex-col sm:flex-row items-center justify-between gap-8 pt-10 border-t border-gray-50">
              <div className="flex items-center bg-gray-50 p-2 rounded-3xl border border-gray-100 w-full sm:w-auto">
                 <button
                   onClick={() => handleVote('up')}
                   disabled={actionLoading}
                   className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all shadow-sm flex-1 sm:flex-none
                    ${hasUpvoted ? 'bg-[var(--color-brand-green)] text-white' : 'bg-white text-gray-400 hover:text-gray-600 border border-transparent'}`}
                 >
                   <ThumbsUp size={24} className={hasUpvoted ? 'fill-current' : ''} />
                 </button>
                 
                 <span className={`px-8 text-2xl font-black ${tip.upvotes > 0 ? 'text-[var(--color-brand-green)]' : tip.upvotes < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                   {tip.upvotes}
                 </span>

                 <button
                   onClick={() => handleVote('down')}
                   disabled={actionLoading}
                   className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all shadow-sm flex-1 sm:flex-none
                    ${hasDownvoted ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-gray-600 border border-transparent'}`}
                 >
                   <ThumbsDown size={24} className={hasDownvoted ? 'fill-current' : ''} />
                 </button>
              </div>

              <button 
                onClick={handleFlag}
                disabled={hasFlagged || actionLoading}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all shadow-sm border
                   ${hasFlagged ? 'text-white bg-red-500 border-red-600 shadow-red-900/10' : 'text-gray-300 bg-white border-gray-100 hover:text-red-500 hover:bg-red-50 hover:border-red-200'}`}
              >
                <Flag size={18} className={hasFlagged ? 'fill-current' : ''} />
                {hasFlagged ? 'Flagged' : 'Report Post'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
