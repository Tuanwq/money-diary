import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppUpdateProvider } from './features/app-update/AppUpdateProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppUpdateProvider>
      <App />
    </AppUpdateProvider>
  </StrictMode>,
)
