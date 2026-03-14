import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute() {
  const { currentUser, userProfile } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!userProfile) {
    // Has Auth account but no Firestore profile yet
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

export function OnboardingRoute() {
  const { currentUser, userProfile } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If they already have a profile, they don't need to onboard
  if (userProfile) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { currentUser, userProfile } = useAuth();

  // If fully logged in and onboarded, redirect to feed
  if (currentUser && userProfile) {
    return <Navigate to="/" replace />;
  }

  // If only logged in via auth but not onboarded, redirect to onboarding
  if (currentUser && !userProfile) {
    return <Navigate to="/onboarding" replace />;
  }

  // Otherwise, show component (like login screen)
  return <Outlet />;
}
