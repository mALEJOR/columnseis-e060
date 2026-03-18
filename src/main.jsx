import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProyectoProvider } from './context/ProyectoContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProyectoProvider>
      <App />
    </ProyectoProvider>
  </StrictMode>
)
