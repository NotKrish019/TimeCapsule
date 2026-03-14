import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { ThumbsUp, ThumbsDown, Bookmark, Flag, BadgeCheck, MapPin, Building } from 'lucide-react';

export default function TipCard({ tip: initialTip, onBookmarkToggle }) {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [tip, setTip] = useState(initialTip);
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Synchronous lock to prevent rapid multi-clicks
  const isProcessing = useRef(false);

  // Sync internal state if initialTip changes (important for feed updates)
  useEffect(() => {
    setTip(initialTip);
  }, [initialTip]);

  const hasUpvoted = tip.upvotedBy?.includes(currentUser?.uid);
  const hasDownvoted = tip.downvotedBy?.includes(currentUser?.uid);
  const isBookmarked = userProfile?.bookmarks?.includes(tip.id);
  const hasFlagged = tip.flaggedBy?.includes(currentUser?.uid);

  async function handleVote(type) {
    if (!currentUser || isProcessing.current) return;
    
    isProcessing.current = true;
    setLoadingAction(true);
    
    const tipRef = doc(db, 'tips', tip.id);

    try {
      if (type === 'up') {
        if (hasUpvoted) {
          // Remove upvote (Toggling OFF)
          await updateDoc(tipRef, {
            upvotes: increment(-1),
            upvotedBy: arrayRemove(currentUser.uid)
          });
        } else {
          // Add upvote (Toggling ON)
          // If they are switching from downvote to upvote, net change is +2
          const updates = {
            upvotes: increment(hasDownvoted ? 2 : 1),
            upvotedBy: arrayUnion(currentUser.uid)
          };
          if (hasDownvoted) {
            updates.downvotedBy = arrayRemove(currentUser.uid);
          }
          await updateDoc(tipRef, updates);
        }
      } else if (type === 'down') {
        if (hasDownvoted) {
          // Remove downvote (Toggling OFF)
          await updateDoc(tipRef, {
            upvotes: increment(1),
            downvotedBy: arrayRemove(currentUser.uid)
          });
        } else {
          // Add downvote (Toggling ON)
          // If they are switching from upvote to downvote, net change is -2
          const updates = {
            upvotes: increment(hasUpvoted ? -2 : -1),
            downvotedBy: arrayUnion(currentUser.uid)
          };
          if (hasUpvoted) {
            updates.upvotedBy = arrayRemove(currentUser.uid);
          }
          await updateDoc(tipRef, updates);
        }
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    } finally {
      setLoadingAction(false);
      isProcessing.current = false;
    }
  }

  async function toggleBookmark(e) {
    if (e) e.stopPropagation();
    if (!currentUser || isProcessing.current) return;

    isProcessing.current = true;
    setLoadingAction(true);
    const userRef = doc(db, 'users', currentUser.uid);

    try {
      if (isBookmarked) {
        await updateDoc(userRef, {
          bookmarks: arrayRemove(tip.id)
        });
        if (onBookmarkToggle) onBookmarkToggle(tip.id, false);
      } else {
        await updateDoc(userRef, {
          bookmarks: arrayUnion(tip.id)
        });
        if (onBookmarkToggle) onBookmarkToggle(tip.id, true);
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    } finally {
      setLoadingAction(false);
      isProcessing.current = false;
    }
  }

  async function handleFlag(e) {
    if (e) e.stopPropagation();
    if (!currentUser || hasFlagged || isProcessing.current) return;

    if (!window.confirm("Report this tip as inappropriate? 3 reports will automatically hide it.")) return;

    isProcessing.current = true;
    setLoadingAction(true);
    const tipRef = doc(db, 'tips', tip.id);
    const newFlagCount = (tip.flagCount || 0) + 1;
    const isHidden = newFlagCount >= 3;

    try {
      await updateDoc(tipRef, {
        flagCount: increment(1),
        flaggedBy: arrayUnion(currentUser.uid),
        hidden: isHidden
      });
    } catch (err) {
      console.error('Failed to flag tip:', err);
    } finally {
      setLoadingAction(false);
      isProcessing.current = false;
    }
  }

  if (tip.hidden) return null;

  return (
    <div 
      onClick={() => navigate(`/tip/${tip.id}`)}
      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-xl hover:border-[var(--color-brand-green)]/20 transition-all text-left flex flex-col h-full group relative overflow-hidden"
    >
      {/* Visual background hint */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-brand-cream)]/30 rounded-full -mr-16 -mt-16 group-hover:bg-[var(--color-brand-green)]/5 transition-colors duration-500"></div>

      <div className="flex justify-between items-start mb-5 relative z-10">
        <div className="flex flex-wrap items-center gap-2">
           <span className="px-4 py-1.5 text-[10px] font-black rounded-full bg-white text-[var(--color-brand-green)] border border-gray-100 uppercase tracking-[0.1em] shadow-sm">
             {tip.category}
           </span>
           {tip.isVerified && (
             <span className="flex items-center gap-1 px-4 py-1.5 text-[10px] font-black rounded-full bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-tight">
               <BadgeCheck size={14} /> Verified
             </span>
           )}
        </div>
        <button 
          onClick={toggleBookmark}
          disabled={loadingAction}
          className={`p-2.5 rounded-2xl transition-all shadow-sm ${isBookmarked ? 'text-white bg-[var(--color-brand-green)] border border-[var(--color-brand-charcoal)]' : 'text-gray-300 bg-gray-50 hover:text-gray-400 border border-transparent'}`}
        >
          <Bookmark size={20} className={isBookmarked ? 'fill-current' : ''} />
        </button>
      </div>

      <h3 className="text-2xl font-serif font-black text-[var(--color-brand-charcoal)] mb-3 line-clamp-2 leading-tight group-hover:text-[var(--color-brand-green)] transition-colors">
        {tip.title}
      </h3>

      <p className="text-gray-500 text-sm mb-6 line-clamp-3 overflow-hidden flex-grow leading-relaxed font-medium">
        {tip.content}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 bg-gray-50/80 px-4 py-2 rounded-xl border border-gray-100/50">
           <Building size={14} className="shrink-0 text-[var(--color-brand-green)] opacity-50" />
           <span className="truncate max-w-[150px] uppercase tracking-tighter">{tip.department}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 bg-gray-50/80 px-4 py-2 rounded-xl border border-gray-100/50">
           <MapPin size={14} className="shrink-0 text-red-300" />
           <span className="truncate max-w-[150px] uppercase tracking-tighter">{tip.location}</span>
        </div>
      </div>

      <div className="flex justify-between items-center mt-auto pt-5 border-t border-gray-50 relative z-10">
        <div className="flex items-center bg-gray-100/50 p-1.5 rounded-[20px] border border-gray-100">
          <button
             onClick={(e) => { e.stopPropagation(); handleVote('up'); }}
             disabled={loadingAction}
             className={`p-2 rounded-2xl transition-all shadow-sm ${hasUpvoted ? 'text-white bg-[var(--color-brand-green)]' : 'text-gray-400 bg-white hover:text-gray-600 border border-transparent'}`}
          >
             <ThumbsUp size={20} className={hasUpvoted ? 'fill-current' : ''} />
          </button>
          
          <span className={`px-4 text-lg font-black min-w-[3ch] text-center ${tip.upvotes > 0 ? 'text-[var(--color-brand-green)]' : tip.upvotes < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {tip.upvotes}
          </span>

          <button
             onClick={(e) => { e.stopPropagation(); handleVote('down'); }}
             disabled={loadingAction}
             className={`p-2 rounded-2xl transition-all shadow-sm ${hasDownvoted ? 'text-white bg-red-500' : 'text-gray-400 bg-white hover:text-gray-600 border border-transparent'}`}
          >
             <ThumbsDown size={20} className={hasDownvoted ? 'fill-current' : ''} />
          </button>
        </div>

        <div className="flex items-center gap-3">
           <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{tip.semester}</span>
           <button 
             onClick={handleFlag}
             disabled={hasFlagged || loadingAction}
             className={`p-2 rounded-xl transition-all ${hasFlagged ? 'text-white bg-red-400' : 'text-gray-200 hover:text-red-300 bg-gray-50 hover:bg-red-50'}`}
             title="Report inappropriate content"
           >
             <Flag size={14} className={hasFlagged ? 'fill-current' : ''} />
           </button>
        </div>
      </div>
    </div>
  );
}
