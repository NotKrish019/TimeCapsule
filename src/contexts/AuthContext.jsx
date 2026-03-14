import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db, googleProvider } from '../firebase';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export const ALLOWED_DOMAIN = '@stu.srmuniversity.ac.in';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [domainError, setDomainError] = useState(null);

  async function loginWithGoogle() {
    setDomainError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!result.user.email.endsWith(ALLOWED_DOMAIN)) {
        await signOut(auth);
        setDomainError(`Only ${ALLOWED_DOMAIN} email addresses are permitted.`);
        throw new Error('Invalid email domain');
      }
      return result.user;
    } catch (error) {
      if (error.message !== 'Invalid email domain') {
        console.error("Auth error:", error);
      }
      throw error;
    }
  }

  function logout() {
    setDomainError(null);
    setUserProfile(null);
    setCurrentUser(null);
    return signOut(auth);
  }

  // Update userProfile locally (for optimistic UI updates like bookmarks)
  function updateProfileLocally(updater) {
    setUserProfile(prev => {
      if (!prev) return prev;
      return typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
    });
  }

  // Subscribe to auth state changes + real-time user doc listener
  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!user.email.endsWith(ALLOWED_DOMAIN)) {
          await signOut(auth);
          setCurrentUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        setCurrentUser(user);

        // Real-time listener on the user document so bookmarks etc. stay in sync
        unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            setUserProfile(null); // needs onboarding
          }
          setLoading(false);
        }, (error) => {
          console.error('Error listening to user profile:', error);
          setUserProfile(null);
          setLoading(false);
        });

      } else {
        if (unsubProfile) unsubProfile();
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  function completeOnboarding(profileData) {
    setUserProfile(profileData);
  }

  const value = {
    currentUser,
    userProfile,
    loading,
    loginWithGoogle,
    logout,
    domainError,
    completeOnboarding,
    updateProfileLocally,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen bg-[var(--color-brand-cream)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[var(--color-brand-lavender)] border-t-[var(--color-brand-green)] rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 font-medium">Loading Time Capsule...</p>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}
