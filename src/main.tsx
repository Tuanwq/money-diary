import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx'
import { StorageWriteNotice } from './components/StorageWriteNotice.tsx'
import { AppUpdateProvider } from './features/app-update/AppUpdateProvider.tsx'
import { installGlobalErrorMonitoring } from './features/error-monitoring/appErrorMonitor.ts'
import { installPwaRecovery } from './pwa/pwaRecovery.ts'

installGlobalErrorMonitoring()
installPwaRecovery()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppUpdateProvider>
        <App />
        <StorageWriteNotice />
      </AppUpdateProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
