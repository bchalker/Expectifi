import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { DesignSystemProvider } from './design/DesignSystemContext'
import './index.scss'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DesignSystemProvider>
        <App />
      </DesignSystemProvider>
    </AuthProvider>
  </StrictMode>,
)
