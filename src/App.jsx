import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, OnboardingRoute, GuestRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import FeedPage from './pages/FeedPage';
import PostTipPage from './pages/PostTipPage';
import TipDetailPage from './pages/TipDetailPage';
import SavedTipsPage from './pages/SavedTipsPage';
import AskSeniorPage from './pages/AskSeniorPage';
import NoticeBoardPage from './pages/NoticeBoardPage';
import ProfilePage from './pages/ProfilePage';
import SeedPage from './pages/SeedPage';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Guest routes (unauthenticated) */}
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* Onboarding route (authenticated, but no profile) */}
            <Route element={<OnboardingRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>

            {/* Protected routes (authenticated and onboarded) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<FeedPage />} />
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/post" element={<PostTipPage />} />
                <Route path="/tip/:id" element={<TipDetailPage />} />
                <Route path="/ask" element={<AskSeniorPage />} />
                <Route path="/notices" element={<NoticeBoardPage />} />
                <Route path="/saved" element={<SavedTipsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/seed" element={<SeedPage />} />
              </Route>
            </Route>

            {/* Catch-all: redirect any unknown route to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
