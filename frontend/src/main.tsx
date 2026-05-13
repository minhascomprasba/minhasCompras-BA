import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Providers } from './app/providers'
import { AuthProvider } from './features/auth/AuthContext'
import { AppRouter } from './app/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </Providers>
  </StrictMode>,
)
