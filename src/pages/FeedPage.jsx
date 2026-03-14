import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import TipCard from '../components/TipCard';
import { TIP_CATEGORIES, DEPARTMENTS, CAMPUS_LOCATIONS } from '../lib/constants';
import { Search, SlidersHorizontal, Loader2, PlusCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FeedPage() {
  const navigate = useNavigate();
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real-time listener for the entire tips collection (hidden == false)
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'tips'),
      where('hidden', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTips = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTips(fetchedTips);
      setLoading(false);
      setError('');
    }, (err) => {
      console.error("Error listening to tips:", err);
      // Even if this fails, we want to show a clear message
      setError('Failed to sync with the database. Please check your connection.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Optimized Client-Side Filtering & Sorting
  const filteredTips = useMemo(() => {
    // 1. Filter
    const result = tips.filter(tip => {
      const matchesCategory = !categoryFilter || tip.category === categoryFilter;
      const matchesDepartment = !departmentFilter || tip.department === departmentFilter;
      const matchesLocation = !locationFilter || tip.location === locationFilter;
      
      const lowerSearch = searchQuery.toLowerCase().trim();
      const matchesSearch = !lowerSearch || 
        tip.title?.toLowerCase().includes(lowerSearch) || 
        tip.content?.toLowerCase().includes(lowerSearch) ||
        tip.department?.toLowerCase().includes(lowerSearch);

      return matchesCategory && matchesDepartment && matchesLocation && matchesSearch;
    });

    // 2. Sort chronologically (Newest First)
    return result.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  }, [tips, categoryFilter, departmentFilter, locationFilter, searchQuery]);

  return (
    <div className="p-4 md:p-6 pb-24 min-h-screen">
      
      {/* Search and Filters Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col gap-4">
        
        <div className="relative w-full">
           <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 stroke-[2.5px]" />
           <input 
             type="text" 
             placeholder="Search tips, professors, specific labs..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]/20 focus:bg-white transition-all shadow-sm"
           />
        </div>

        <div className="flex items-center flex-wrap gap-2 text-[11px] font-black uppercase tracking-wider text-gray-400">
           <div className="flex items-center gap-2 px-2 py-1">
             <SlidersHorizontal size={14} className="text-[var(--color-brand-green)]" /> 
             <span>Quick Filters:</span>
           </div>
           
           <select 
             className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 flex-grow sm:flex-grow-0 outline-none hover:border-[var(--color-brand-green)] text-gray-700 normal-case font-bold shadow-sm"
             value={categoryFilter}
             onChange={e => setCategoryFilter(e.target.value)}
           >
             <option value="">All Categories</option>
             {TIP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
           </select>

           <select 
             className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 flex-grow sm:flex-grow-0 outline-none hover:border-[var(--color-brand-green)] text-gray-700 normal-case font-bold shadow-sm"
             value={departmentFilter}
             onChange={e => setDepartmentFilter(e.target.value)}
           >
             <option value="">All Depts</option>
             {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
           </select>

           <select 
             className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 flex-grow sm:flex-grow-0 outline-none hover:border-[var(--color-brand-green)] text-gray-700 normal-case font-bold shadow-sm"
             value={locationFilter}
             onChange={e => setLocationFilter(e.target.value)}
           >
             <option value="">All Locations</option>
             {CAMPUS_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
           </select>
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div className="bg-red-50 text-red-700 p-8 rounded-2xl border border-red-100 text-center max-w-xl mx-auto shadow-sm">
          <p className="font-black text-lg mb-2">Sync Error</p>
          <p className="text-sm opacity-80 mb-6">{error}</p>
        </div>
      ) : loading && tips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
             <Loader2 size={40} className="animate-spin mb-4 text-[var(--color-brand-green)] opacity-20" />
             <p className="font-bold text-lg text-gray-400/60 uppercase tracking-tighter">Syncing Time Capsule...</p>
          </div>
      ) : filteredTips.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
            <Search size={32} className="text-gray-200" />
          </div>
          <h3 className="text-2xl font-serif font-black text-[var(--color-brand-green)] mb-3">No matches found</h3>
          <p className="text-gray-400 text-sm max-w-xs mb-10 leading-relaxed font-medium">
            We couldn't find any tips matching your current filters. Try adjusting them or posting your own!
          </p>
          <button 
             onClick={() => navigate('/post')}
             className="flex items-center gap-3 px-8 py-3 bg-[var(--color-brand-green)] hover:bg-black text-white font-bold rounded-2xl transition-all shadow-xl shadow-green-900/10 active:scale-95 border border-green-800/10"
          >
            <PlusCircle size={20} /> Share a Tip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6 items-stretch">
          {filteredTips.map((tip) => (
            <TipCard key={tip.id} tip={tip} />
          ))}
        </div>
      )}
    </div>
  );
}
