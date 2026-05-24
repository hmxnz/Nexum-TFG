import React, { createContext, useContext, useState, useEffect } from 'react'

const TemaContext = createContext(null)

export function TemaProvider({ children }) {
  // leer del localStorage al iniciar, claro por defecto
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('tema') || 'claro'
  })

  // aplicar el atributo al elemento raíz cada vez que cambia el tema
  // no sé muy bien por qué hay que ponerlo en documentElement y no en body
  // pero si lo pongo en body a veces no coge las variables al arrancar
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('tema', tema)
  }, [tema])

  function toggleTema() {
    setTema(prev => (prev === 'oscuro' ? 'claro' : 'oscuro'))
  }

  return (
    <TemaContext.Provider value={{ tema, toggleTema }}>
      {children}
    </TemaContext.Provider>
  )
}

export function useTema() {
  const ctx = useContext(TemaContext)
  if (!ctx) throw new Error('useTema solo se puede usar dentro de TemaProvider')
  return ctx
}
