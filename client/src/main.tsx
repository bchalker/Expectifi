import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { DesignSystemProvider } from './design/DesignSystemContext'
import './index.scss'
import AppRoot from './AppRoot.tsx'
import { syncNoPortfolioSubheaderDocumentAttr } from './lib/syncNoPortfolioSubheader'

syncNoPortfolioSubheaderDocumentAttr()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DesignSystemProvider>
        <AppRoot />
      </DesignSystemProvider>
    </AuthProvider>
  </StrictMode>,
)
