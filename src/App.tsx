import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LandingNav from './components/LandingNav'
import Navbar from './components/Navbar'
import StatsBar from './components/StatsBar'
// Landing is the most common entry route, so we ship it in the main bundle
// — paying for an extra round-trip-on-first-paint hurts desktop more than
// the bytes hurt mobile. Other public pages and all protected app pages
// stay lazy so visitors don't download them unless they navigate.
import Landing from './pages/Landing'

const FindWork = lazy(() => import('./pages/FindWork'))
const PostWork = lazy(() => import('./pages/PostWork'))
const SignIn = lazy(() => import('./pages/SignIn'))
const JobBoard = lazy(() => import('./pages/JobBoard'))
const JobDetail = lazy(() => import('./pages/JobDetail'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const PostJob = lazy(() => import('./pages/PostJob'))
const Dispute = lazy(() => import('./pages/Dispute'))
const Arbitrate = lazy(() => import('./pages/Arbitrate'))
const Profile = lazy(() => import('./pages/Profile'))
const Chat = lazy(() => import('./pages/Chat'))
const Activity = lazy(() => import('./pages/Activity'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh] text-[13px] text-[#a0a0a0]">
      Loading…
    </div>
  )
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingNav />
      {children}
    </>
  )
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Navbar />
      <StatsBar />
      {children}
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
            <Route path="/find-work" element={<PublicLayout><FindWork /></PublicLayout>} />
            <Route path="/post-work" element={<PublicLayout><PostWork /></PublicLayout>} />
            <Route path="/signin" element={<SignIn />} />

            {/* Protected app routes */}
            <Route path="/app" element={<AppLayout><JobBoard /></AppLayout>} />
            <Route path="/app/jobs/:jobId" element={<AppLayout><JobDetail /></AppLayout>} />
            <Route path="/app/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/app/post" element={<AppLayout><PostJob /></AppLayout>} />
            <Route path="/app/dispute" element={<AppLayout><Dispute /></AppLayout>} />
            <Route path="/app/arbitrate" element={<AppLayout><Arbitrate /></AppLayout>} />
            <Route path="/app/chat" element={<AppLayout><Chat /></AppLayout>} />
            <Route path="/app/activity" element={<AppLayout><Activity /></AppLayout>} />
            <Route path="/app/profile" element={<AppLayout><Profile /></AppLayout>} />
            <Route path="/app/profile/:address" element={<AppLayout><Profile /></AppLayout>} />
          </Routes>
        </Suspense>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          theme="light"
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
