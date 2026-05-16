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
import Navbar from './components/Navbar'

function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return <div className="cargando">Comprobando sesión...</div>
  if (!usuario)  return <Navigate to="/login" replace />
  return children
}

function RutaAdmin({ children }) {
  const { usuario, cargando } = useAuth()
  if (cargando)                    return <div className="cargando">Comprobando sesión...</div>
  if (!usuario)                    return <Navigate to="/login" replace />
  if (usuario.rol !== 'admin')     return <Navigate to="/" replace />
  return children
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
              <RutaProtegida><Navbar /><Dashboard /></RutaProtegida>
            } />

            <Route path="/mis-ontologias" element={
              <RutaProtegida><Navbar /><MisOntologias /></RutaProtegida>
            } />

            <Route path="/mis-ontologias/:slug" element={
              <RutaProtegida><Navbar /><OntologiaDetalle /></RutaProtegida>
            } />

            <Route path="/sparql" element={
              <RutaProtegida><Navbar /><SparqlConsole /></RutaProtegida>
            } />

            <Route path="/grafo" element={
              <RutaProtegida><Navbar /><GrafoVista /></RutaProtegida>
            } />

            <Route path="/inferencia" element={
              <RutaProtegida><Navbar /><InferenciaOWL /></RutaProtegida>
            } />

            <Route path="/admin" element={
              <RutaAdmin><Navbar /><AdminPanel /></RutaAdmin>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </TemaProvider>
  )
}

export default App
