import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import StaffDashboard from './StaffDashboard.tsx'
import LeadsDashboard from './LeadsDashboard.tsx'
import LoginPage from './LoginPage.tsx'
import AuthGate from './AuthGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGate />}>
          <Route path="/" element={<App />} />
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/staff/sales" element={<LeadsDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
