import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TemaProvider } from './context/TemaContext'
import Login from './components/Login'
import Registro from './components/Registro'
import Dashboard from './components/Dashboard'
import SparqlConsole from './components/SparqlConsole'
import MisOntologias from './components/MisOntologias'
import OntologiaDetalle from './components/OntologiaDetalle'
import GrafoVista from './components/GrafoVista'
import InferenciaOWL from './components/InferenciaOWL'
import AdminPanel from './components/AdminPanel'
import RecursosList from './components/RecursosList'
import Navbar from './components/Navbar'

/* Wrapper que añade la sidebar y el footer a las rutas protegidas */
function LayoutApp({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-main">
        {children}
        <footer className="app-footer">
          © 2026 Hugo Martínez Segura · Universidad de Murcia
        </footer>
      </div>
    </div>
  )
}

function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return <div className="cargando">Comprobando sesión...</div>
  if (!usuario)  return <Navigate to="/login" replace />
  return <LayoutApp>{children}</LayoutApp>
}

function RutaAdmin({ children }) {
  const { usuario, cargando } = useAuth()
  if (cargando)                    return <div className="cargando">Comprobando sesión...</div>
  if (!usuario)                    return <Navigate to="/login" replace />
  if (usuario.rol !== 'admin')     return <Navigate to="/" replace />
  return <LayoutApp>{children}</LayoutApp>
}

function App() {
  return (
    <TemaProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login"    element={<Login />} />
            <Route path="/registro" element={<Registro />} />

            {/* Rutas protegidas */}
            <Route path="/" element={
              <RutaProtegida><Dashboard /></RutaProtegida>
            } />

            <Route path="/mis-ontologias" element={
              <RutaProtegida><MisOntologias /></RutaProtegida>
            } />

            <Route path="/mis-ontologias/:slug" element={
              <RutaProtegida><OntologiaDetalle /></RutaProtegida>
            } />

            <Route path="/sparql" element={
              <RutaProtegida><SparqlConsole /></RutaProtegida>
            } />

            <Route path="/grafo" element={
              <RutaProtegida><GrafoVista /></RutaProtegida>
            } />

            <Route path="/inferencia" element={
              <RutaProtegida><InferenciaOWL /></RutaProtegida>
            } />

            <Route path="/recursos" element={
              <RutaProtegida><RecursosList /></RutaProtegida>
            } />

            <Route path="/admin" element={
              <RutaAdmin><AdminPanel /></RutaAdmin>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </TemaProvider>
  )
}

export default App
