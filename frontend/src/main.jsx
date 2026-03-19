import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import CareerDashboard from './components/CareerDashboard'
import SignIn from './components/SignIn'
import useAuth from './hooks/useAuth'
import './styles/globals.css'

function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/signin" replace />
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/" element={<AuthGuard><App /></AuthGuard>} />
        <Route path="/career/:id" element={<AuthGuard><CareerDashboard /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
