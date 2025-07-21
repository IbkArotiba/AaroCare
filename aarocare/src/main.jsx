// src/main.jsx'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Error boundary for development
if (import.meta.env.DEV) {
  console.log('🏥 Aarọ Care - Development Mode');
  console.log('API URL:', import.meta.env.VITE_API_URL);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)