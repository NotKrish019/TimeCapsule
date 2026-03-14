import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { TIP_CATEGORIES, DEPARTMENTS, CAMPUS_LOCATIONS } from '../lib/constants';

export default function PostTipPage() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Helper to determine the current academic semester and year
  function getSemesterStamp() {
    const date = new Date();
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();
    // Assuming Sem 1 is roughly July-Dec (Odd), Sem 2 is Jan-June (Even)
    const sem = (month >= 0 && month <= 5) ? 'Semester 2' : 'Semester 1';
    
    // Using current calendar year or an academic year formulation like 2025-26
    return `${sem}, ${year}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title || !content || !category || !department || !location) {
      setError('Please fill out all required fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await addDoc(collection(db, 'tips'), {
        title: title.trim(),
        content: content.trim(),
        category,
        department,
        location,
        authorId: currentUser.uid,
        authorName: userProfile.name, // using display name captured during onboarding
        upvotes: 0,
        upvotedBy: [],
        downvotedBy: [],
        flagCount: 0,
        flaggedBy: [],
        hidden: false,
        semester: getSemesterStamp(),
        createdAt: serverTimestamp(),
        isVerified: false,
        relevantCount: 0,
        relevantBy: []
      });

      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error("Error posting tip:", err);
      setError('Failed to post tip. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-6 pb-24">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
        <h2 className="text-2xl font-serif font-bold text-[var(--color-brand-green)] mb-6">Post a Tip</h2>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded mb-6 text-sm border border-red-200">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded mb-6 text-sm border border-green-200">
            Tip successfully posted! Redirecting to feed...
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Title input */}
          <div>
            <label className="block text-sm font-semibold mb-2">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Which professor to take for Data Structures?"
              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--color-brand-green)] outline-none"
            />
            <div className={`text-xs text-right mt-1 ${title.length === 120 ? 'text-red-500' : 'text-gray-500'}`}>
              {title.length}/120
            </div>
          </div>

          {/* Content input */}
          <div>
            <label className="block text-sm font-semibold mb-2">Tip Content <span className="text-red-500">*</span></label>
            <textarea
              required
              maxLength={2000}
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share what you learned..."
              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--color-brand-green)] outline-none resize-none"
            />
            <div className={`text-xs text-right mt-1 ${content.length === 2000 ? 'text-red-500' : 'text-gray-500'}`}>
              {content.length}/2000
            </div>
          </div>

          {/* Dropdowns row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Category <span className="text-red-500">*</span></label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--color-brand-green)] outline-none"
              >
                <option value="" disabled>Select Category</option>
                {TIP_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Department <span className="text-red-500">*</span></label>
              <select
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--color-brand-green)] outline-none"
              >
                <option value="" disabled>Select Department</option>
                <option value="All Departments">All Departments</option>
                {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Location <span className="text-red-500">*</span></label>
              <select
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--color-brand-green)] outline-none"
              >
                <option value="" disabled>Select Location</option>
                <option value="General Campus">General Campus</option>
                {CAMPUS_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full sm:w-auto self-start mt-4 bg-[var(--color-brand-green)] hover:bg-[#043326] text-white font-semibold py-3 px-8 rounded-lg shadow-sm active:scale-95 transition-all disabled:opacity-50 border border-[var(--color-brand-charcoal)]"
          >
            {loading ? 'Posting...' : 'Post Tip'}
          </button>
        </form>
      </div>
    </div>
  );
}
