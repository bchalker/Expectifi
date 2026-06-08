import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { BottomSheetStackProvider } from './context/BottomSheetStackContext'
import { DesignSystemProvider } from './design/DesignSystemContext'
import './index.scss'
import AppRoot from './AppRoot.tsx'
import { syncNoPortfolioSubheaderDocumentAttr } from './lib/syncNoPortfolioSubheader'

syncNoPortfolioSubheaderDocumentAttr()

function syncDocumentHiddenAttr() {
  document.documentElement.toggleAttribute(
    'data-doc-hidden',
    document.visibilityState === 'hidden',
  )
}

syncDocumentHiddenAttr()
document.addEventListener('visibilitychange', syncDocumentHiddenAttr)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DesignSystemProvider>
        <BottomSheetStackProvider>
          <AppRoot />
        </BottomSheetStackProvider>
      </DesignSystemProvider>
    </AuthProvider>
  </StrictMode>,
)
