import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { LoginModal } from '@/components/login-modal'
import { AuthModalProvider } from '@/context/auth-modal-context'
import { Dashboard } from '@/pages/Dashboard'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'

function App() {
  return (
    <BrowserRouter>
      <AuthModalProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <LoginModal />
      </AuthModalProvider>
    </BrowserRouter>
  )
}

export default App
