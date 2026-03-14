import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import { ClipboardList, PlusCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function NoticeBoardPage() {
  const { currentUser, userProfile } = useAuth();
  
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showPostingForm, setShowPostingForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postingState, setPostingState] = useState(false);

  useEffect(() => {
    fetchNotices();
  }, []);

  async function fetchNotices() {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'notices'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Client-side expiry filtering:
      // Hide if current Date > expiresAt
      // expiresAt might be a timestamp, or we just compute +7 days from createdAt locally to save Firestore space, 
      // but SRD specifies `expiresAt` as an explicit field. Wait, if it's created with serverTimestamp, we can't reliably read it immediately.
      // So we'll trust createdAt timestamp + 7 days logic client-side.
      const now = new Date();
      const activeNotices = fetched.filter(n => {
        if (!n.createdAt) return true; // just created, local optimistic UI might lack it
        const expireDate = addDays(n.createdAt.toDate(), 7);
        return now < expireDate && !n.hidden;
      });

      setNotices(activeNotices);
    } catch (err) {
      console.error("Error fetching notices:", err);
      if(err.message.includes('index')) {
        setError('Notice board indexes are building in the background. Please try again shortly or check console.');
      } else {
        setError('Failed to load notices.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!title || !content) return;
    setPostingState(true);
    setError('');
    
    try {
      // Use client date to calculate expiresAt to avoid needing Cloud Functions for now (SRD OI-008 recommendation)
      const now = new Date();
      const expires = addDays(now, 7);

      const newDoc = {
        title: title.trim(),
        content: content.trim(),
        authorId: currentUser.uid,
        authorName: userProfile.name,
        createdAt: now, // Storing as local date object for JS, or we could use serverTimestamp. Wait, serverTimestamp complicates expiresAt calculation without CF. Let's just use JS Date objects for now, Firebase converts them accurately. Or we just use `createdAt: serverTimestamp()` and don't store expiresAt, purely compute it on the client. The SRD schema specifies `expiresAt` timestamp. Let's push both as Date objects.
        expiresAt: expires,
        hidden: false
      };

      const docRef = await addDoc(collection(db, 'notices'), newDoc);
      
      // Update UI optimistically
      setNotices(prev => [{ id: docRef.id, ...newDoc }, ...prev]);
      setShowPostingForm(false);
      setTitle('');
      setContent('');
    } catch (err) {
      console.error("Failed to post notice:", err);
      setError('Failed to post your notice. Please try again.');
    } finally {
      setPostingState(false);
    }
  }

  return (
    <div className="p-4 md:p-6 pb-24 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-[#064e3b] text-white p-6 rounded-xl shadow-sm border border-[#043326]">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2.5 rounded-xl border border-white/20">
             <ClipboardList size={28} className="stroke-[2px]" />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight">Notice Board</h2>
            <p className="text-sm opacity-80 mt-0.5">Time-sensitive announcements and events.</p>
          </div>
        </div>
        <button 
           onClick={() => setShowPostingForm(!showPostingForm)}
           className="bg-[var(--color-brand-lavender)] text-[#1a1a1a] font-semibold flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#1a1a1a] hover:bg-[#d8bcf5] transition-colors shadow-sm w-full sm:w-auto mt-2 sm:mt-0"
        >
          {showPostingForm ? 'Cancel' : <><PlusCircle size={20} /> Post Notice</>}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6 font-semibold flex items-center gap-2">
           <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Posting Form */}
      {showPostingForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 animate-in fade-in slide-in-from-top-4">
           <div className="flex items-start gap-3 mb-6 bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-yellow-800 text-sm">
             <AlertCircle size={18} className="shrink-0 mt-0.5" />
             <p className="leading-snug">
               <strong>7-Day Expiry Policy:</strong> Notices posted here will automatically expire and be hidden 7 days after creation. This space is for time-sensitive announcements like society tryouts, flash sales, or urgent messages.
             </p>
           </div>

           <form onSubmit={handlePost} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Title <span className="text-red-500">*</span></label>
                <input
                  type="text" required maxLength={120} value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., Chess Club Tryouts this Friday!"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--color-brand-green)] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Details <span className="text-red-500">*</span></label>
                <textarea
                  required maxLength={1000} rows={4} value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Provide all necessary information..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--color-brand-green)] outline-none resize-none"
                />
                <div className="text-xs text-right mt-1 text-gray-500">{content.length}/1000</div>
              </div>

              <button 
                type="submit" disabled={postingState}
                className="self-start px-8 py-3 bg-[var(--color-brand-green)] text-white hover:bg-[#043326] font-semibold rounded-lg shadow-sm border border-[#1a1a1a] transition-all disabled:opacity-50 mt-2 flex items-center gap-2"
              >
                 {postingState ? <><Loader2 size={18} className="animate-spin" /> Posting...</> : 'Publish Notice'}
              </button>
           </form>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" size={36} /></div>
      ) : notices.length === 0 ? (
        <div className="bg-white border text-center py-16 px-6 rounded-xl border-dashed border-gray-300">
           <ClipboardList size={40} className="mx-auto text-gray-300 mb-4" />
           <p className="text-lg font-serif font-bold text-gray-800">No active notices.</p>
           <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2">Any active campus announcements will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {notices.map((n) => (
            <div key={n.id} className="bg-[#fcfae9] border border-[#ebe5c1] shadow-sm rounded-xl p-5 flex flex-col relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--color-brand-green)] -mt-8 -mr-8 rotate-45 opacity-[0.03] group-hover:scale-110 transition-transform"></div>
               
               <h3 className="text-xl font-bold font-serif text-[var(--color-brand-green)] mb-2 line-clamp-2 pr-6">
                 {n.title}
               </h3>
               <p className="text-sm text-gray-700 whitespace-pre-wrap mb-6 line-clamp-6 leading-relaxed">
                 {n.content}
               </p>

               <div className="mt-auto pt-4 border-t border-[#ebe5c1]/60 flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  <span>{n.authorName}</span>
                  <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full border border-red-100/50 normal-case tracking-normal">
                     {/* Safe fallback if n.createdAt is missing or a serverTimestamp placeholder */}
                     {n.createdAt && typeof n.createdAt.toDate === 'function' ? (
                       `Expires in ${formatDistanceToNow(addDays(n.createdAt.toDate(), 7))}`
                     ) : n.createdAt instanceof Date ? (
                       `Expires in ${formatDistanceToNow(addDays(n.createdAt, 7))}`
                     ) : (
                       'Expiring soon'
                     )}
                  </span>
               </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
