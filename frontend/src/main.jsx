import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import CareerDashboard from './components/CareerDashboard'
import SignIn from './components/SignIn'
import { AuthProvider } from './contexts/AuthContext'
import useAuth from './hooks/useAuth'
import './styles/globals.css'

function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/" replace />
  return children
}

// Redirect already-authenticated users away from the sign-in page
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to="/app" replace />
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicOnlyRoute><SignIn /></PublicOnlyRoute>} />
          <Route path="/app" element={<AuthGuard><App /></AuthGuard>} />
          <Route path="/career/:id" element={<AuthGuard><CareerDashboard /></AuthGuard>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
