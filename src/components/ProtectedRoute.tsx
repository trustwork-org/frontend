import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthed, isLoading } = useAuth()
  if (isLoading) return null
  return isAuthed ? <>{children}</> : <Navigate to="/signin" replace />
}
