import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, query, orderBy, getDocs, addDoc, serverTimestamp,
  doc, updateDoc, increment, arrayUnion, arrayRemove, where
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare, PlusCircle, Send, ThumbsUp, ChevronDown,
  ChevronUp, Loader2, AlertCircle, Flag
} from 'lucide-react';

export default function AskSeniorPage() {
  const { currentUser, userProfile } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New question form
  const [showForm, setShowForm] = useState(false);
  const [qTitle, setQTitle] = useState('');
  const [qContent, setQContent] = useState('');
  const [posting, setPosting] = useState(false);

  // Expanded question (to show answers)
  const [expandedId, setExpandedId] = useState(null);
  const [answers, setAnswers] = useState({});       // { questionId: [answer, ...] }
  const [answerLoading, setAnswerLoading] = useState(null);

  // New answer input per question
  const [replyText, setReplyText] = useState('');
  const [replyPosting, setReplyPosting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'questions'),
        orderBy('lastActivity', 'desc')
      );
      const snap = await getDocs(q);
      const fetched = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(q => !q.hidden);
      setQuestions(fetched);
    } catch (err) {
      console.error('Error fetching questions:', err);
      if (err.message.includes('index')) {
        setError('Database indexes are building. Please refresh in a minute.');
      } else {
        setError('Failed to load questions.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePostQuestion(e) {
    e.preventDefault();
    if (!qTitle.trim() || !qContent.trim()) return;
    setPosting(true);
    setError('');

    try {
      const now = new Date();
      const newQ = {
        title: qTitle.trim(),
        content: qContent.trim(),
        authorId: currentUser.uid,
        authorName: userProfile.name,
        replyCount: 0,
        lastActivity: now,
        createdAt: serverTimestamp(),
        hidden: false,
        flagCount: 0,
        flaggedBy: []
      };
      const docRef = await addDoc(collection(db, 'questions'), newQ);
      setQuestions(prev => [{ id: docRef.id, ...newQ, createdAt: { toDate: () => now } }, ...prev]);
      setQTitle('');
      setQContent('');
      setShowForm(false);
    } catch (err) {
      console.error('Error posting question:', err);
      setError('Failed to post your question.');
    } finally {
      setPosting(false);
    }
  }

  async function toggleExpand(questionId) {
    if (expandedId === questionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(questionId);

    if (!answers[questionId]) {
      setAnswerLoading(questionId);
      try {
        const q = query(
          collection(db, 'questions', questionId, 'answers'),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAnswers(prev => ({ ...prev, [questionId]: fetched }));
      } catch (err) {
        console.error('Error fetching answers:', err);
      } finally {
        setAnswerLoading(null);
      }
    }
  }

  async function handlePostReply(questionId) {
    if (!replyText.trim()) return;
    setReplyPosting(true);

    try {
      const now = new Date();
      const newAnswer = {
        content: replyText.trim(),
        authorId: currentUser.uid,
        authorName: userProfile.name,
        createdAt: serverTimestamp(),
        upvotes: 0,
        upvotedBy: []
      };
      const docRef = await addDoc(collection(db, 'questions', questionId, 'answers'), newAnswer);

      // Update question's replyCount and lastActivity
      await updateDoc(doc(db, 'questions', questionId), {
        replyCount: increment(1),
        lastActivity: now
      });

      // Optimistic UI update
      setAnswers(prev => ({
        ...prev,
        [questionId]: [
          ...(prev[questionId] || []),
          { id: docRef.id, ...newAnswer, createdAt: { toDate: () => now } }
        ]
      }));
      setQuestions(prev =>
        prev.map(q =>
          q.id === questionId
            ? { ...q, replyCount: (q.replyCount || 0) + 1, lastActivity: now }
            : q
        )
      );
      setReplyText('');
    } catch (err) {
      console.error('Error posting reply:', err);
    } finally {
      setReplyPosting(false);
    }
  }

  async function toggleAnswerUpvote(questionId, answerId, answer) {
    const hasUpvoted = answer.upvotedBy?.includes(currentUser.uid);
    const answerRef = doc(db, 'questions', questionId, 'answers', answerId);

    try {
      if (hasUpvoted) {
        await updateDoc(answerRef, {
          upvotes: increment(-1),
          upvotedBy: arrayRemove(currentUser.uid)
        });
      } else {
        await updateDoc(answerRef, {
          upvotes: increment(1),
          upvotedBy: arrayUnion(currentUser.uid)
        });
      }

      // Optimistic update
      setAnswers(prev => ({
        ...prev,
        [questionId]: prev[questionId].map(a =>
          a.id === answerId
            ? {
                ...a,
                upvotes: hasUpvoted ? a.upvotes - 1 : a.upvotes + 1,
                upvotedBy: hasUpvoted
                  ? a.upvotedBy.filter(id => id !== currentUser.uid)
                  : [...(a.upvotedBy || []), currentUser.uid]
              }
            : a
        )
      }));
    } catch (err) {
      console.error('Error toggling answer upvote:', err);
    }
  }

  function formatTime(ts) {
    if (!ts) return 'Just now';
    const d = typeof ts.toDate === 'function' ? ts.toDate() : ts instanceof Date ? ts : new Date(ts);
    return formatDistanceToNow(d, { addSuffix: true });
  }

  return (
    <div className="p-4 md:p-6 pb-24 min-h-screen">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-[#064e3b] text-white p-6 rounded-xl shadow-sm border border-[#043326]">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2.5 rounded-xl border border-white/20">
            <MessageSquare size={28} className="stroke-[2px]" />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight">Ask a Senior</h2>
            <p className="text-sm opacity-80 mt-0.5">Got a question? The community has your answers.</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[var(--color-brand-lavender)] text-[#1a1a1a] font-semibold flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#1a1a1a] hover:bg-[#d8bcf5] transition-colors shadow-sm w-full sm:w-auto"
        >
          {showForm ? 'Cancel' : <><PlusCircle size={20} /> Ask a Question</>}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6 font-semibold flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Question Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <form onSubmit={handlePostQuestion} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Your Question <span className="text-red-500">*</span></label>
              <input
                type="text" required maxLength={120} value={qTitle}
                onChange={(e) => setQTitle(e.target.value)}
                placeholder="E.g., How do I switch electives after 2nd semester?"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--color-brand-green)] outline-none"
              />
              <div className="text-xs text-right mt-1 text-gray-500">{qTitle.length}/120</div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Details <span className="text-red-500">*</span></label>
              <textarea
                required maxLength={1000} rows={4} value={qContent}
                onChange={(e) => setQContent(e.target.value)}
                placeholder="Provide any context that would help someone answer..."
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--color-brand-green)] outline-none resize-none"
              />
              <div className="text-xs text-right mt-1 text-gray-500">{qContent.length}/1000</div>
            </div>
            <button
              type="submit" disabled={posting}
              className="self-start px-8 py-3 bg-[var(--color-brand-green)] text-white hover:bg-[#043326] font-semibold rounded-lg shadow-sm border border-[#1a1a1a] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {posting ? <><Loader2 size={18} className="animate-spin" /> Posting...</> : 'Post Question'}
            </button>
          </form>
        </div>
      )}

      {/* Questions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 size={40} className="animate-spin mb-4 text-[var(--color-brand-lavender)]" />
          <p className="font-medium text-lg text-gray-500">Loading questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white border text-center py-16 px-6 rounded-xl border-dashed border-gray-300">
          <MessageSquare size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-serif font-bold text-gray-800">No questions yet.</p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2">Be the first to ask! Senior students and peers are ready to help.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {questions.map((q) => (
            <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

              {/* Question Header */}
              <button
                onClick={() => toggleExpand(q.id)}
                className="w-full text-left p-5 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-grow">
                    <h3 className="text-lg font-serif font-bold text-[var(--color-brand-green)] mb-1 leading-snug">
                      {q.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{q.content}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-gray-400">
                    {expandedId === q.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 font-medium">
                  <span>{q.authorName}</span>
                  <span>·</span>
                  <span>{formatTime(q.lastActivity || q.createdAt)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} /> {q.replyCount || 0} {q.replyCount === 1 ? 'reply' : 'replies'}
                  </span>
                </div>
              </button>

              {/* Expanded Answers Section */}
              {expandedId === q.id && (
                <div className="border-t border-gray-100 bg-gray-50/30">

                  {/* Answers */}
                  <div className="p-5">
                    {answerLoading === q.id ? (
                      <div className="flex justify-center py-6">
                        <Loader2 size={24} className="animate-spin text-gray-400" />
                      </div>
                    ) : (answers[q.id] || []).length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No answers yet. Be the first to help!</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {(answers[q.id] || []).map((a) => {
                          const hasUpvoted = a.upvotedBy?.includes(currentUser.uid);
                          return (
                            <div key={a.id} className="bg-white rounded-lg border border-gray-200 p-4">
                              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed mb-3">{a.content}</p>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold">{a.authorName}</span>
                                  <span>{formatTime(a.createdAt)}</span>
                                </div>
                                <button
                                  onClick={() => toggleAnswerUpvote(q.id, a.id, a)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors font-semibold
                                    ${hasUpvoted ? 'text-[var(--color-brand-green)] bg-green-50' : 'hover:bg-gray-100 text-gray-500'}`}
                                >
                                  <ThumbsUp size={14} className={hasUpvoted ? 'fill-current' : ''} />
                                  <span>{a.upvotes || 0}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Reply Input */}
                  <div className="p-4 border-t border-gray-100 flex gap-3">
                    <input
                      type="text"
                      placeholder="Write your answer..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handlePostReply(q.id);
                        }
                      }}
                      className="flex-grow bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-brand-green)] outline-none"
                    />
                    <button
                      onClick={() => handlePostReply(q.id)}
                      disabled={replyPosting || !replyText.trim()}
                      className="bg-[var(--color-brand-green)] text-white px-4 py-2.5 rounded-lg hover:bg-[#043326] transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                    >
                      {replyPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
