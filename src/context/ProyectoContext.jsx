import { createContext, useContext, useReducer, useCallback } from 'react'

const ProyectoContext = createContext(null)

// ── ID único ──
let _id = 1
const uid = () => `col-${Date.now()}-${_id++}`

// ── Combinaciones por defecto ──
const COMBOS_DEFAULT = [
  { id: 1, label: '1.4CM + 1.7CV',    Pu: '', Mux: '', Muy: '', activa: true },
  { id: 2, label: '1.25(CM+CV) + CS', Pu: '', Mux: '', Muy: '', activa: true },
  { id: 3, label: '1.25(CM+CV) - CS', Pu: '', Mux: '', Muy: '', activa: true },
  { id: 4, label: '0.9CM + CS',       Pu: '', Mux: '', Muy: '', activa: true },
  { id: 5, label: '0.9CM - CS',       Pu: '', Mux: '', Muy: '', activa: true },
]

// ── Columna por defecto ──
export function crearColumna(overrides = {}) {
  return {
    id: uid(),
    nombre: 'C-1',
    eje: 'A-1',
    nivel: '1-2',
    material: { fc: 280, fy: 4200 },
    geometria: { tipo: 'rectangular', b: 40, h: 50, recubrimiento: 4, longitud: 300 },
    sistema_estructural: 'SMF',
    refuerzo: { barras: [] },
    combinaciones: COMBOS_DEFAULT.map(c => ({ ...c })),
    superficie: null,
    resultados: null,
    dcr_max: null,
    estado: 'sin_calcular', // sin_calcular | calculando | conforme | no_conforme
    ...overrides,
  }
}

// ── Estado inicial ──
function estadoInicial() {
  const col = crearColumna()
  return {
    nombre: 'Proyecto sin título',
    descripcion: '',
    fecha: new Date().toISOString().slice(0, 10),
    ingeniero: '',
    columnas: [col],
    columnaActivaId: col.id,
    vista: 'dashboard', // dashboard | editor
  }
}

// ── Reducer ──
function reducer(state, action) {
  switch (action.type) {

    case 'SET_PROYECTO': {
      const { field, value } = action
      return { ...state, [field]: value }
    }

    case 'SET_VISTA':
      return { ...state, vista: action.vista }

    case 'SET_COLUMNA_ACTIVA':
      return { ...state, columnaActivaId: action.id, vista: 'editor' }

    case 'AGREGAR_COLUMNA': {
      const nueva = crearColumna(action.overrides || {})
      return {
        ...state,
        columnas: [...state.columnas, nueva],
      }
    }

    case 'DUPLICAR_COLUMNA': {
      const orig = state.columnas.find(c => c.id === action.id)
      if (!orig) return state
      const copia = {
        ...JSON.parse(JSON.stringify(orig)),
        id: uid(),
        nombre: `${orig.nombre} (copia)`,
        superficie: null,
        resultados: null,
        dcr_max: null,
        estado: 'sin_calcular',
      }
      const idx = state.columnas.findIndex(c => c.id === action.id)
      const cols = [...state.columnas]
      cols.splice(idx + 1, 0, copia)
      return { ...state, columnas: cols }
    }

    case 'ELIMINAR_COLUMNA': {
      if (state.columnas.length <= 1) return state
      const cols = state.columnas.filter(c => c.id !== action.id)
      const activaId = state.columnaActivaId === action.id ? cols[0].id : state.columnaActivaId
      return { ...state, columnas: cols, columnaActivaId: activaId }
    }

    case 'ACTUALIZAR_COLUMNA': {
      const { id, changes } = action
      return {
        ...state,
        columnas: state.columnas.map(c =>
          c.id === id ? { ...c, ...changes } : c
        ),
      }
    }

    case 'ACTUALIZAR_CAMPO_COLUMNA': {
      const { id, field, value } = action
      return {
        ...state,
        columnas: state.columnas.map(c =>
          c.id === id ? { ...c, [field]: value } : c
        ),
      }
    }

    case 'NAVEGAR_COLUMNA': {
      const idx = state.columnas.findIndex(c => c.id === state.columnaActivaId)
      const newIdx = idx + action.dir
      if (newIdx < 0 || newIdx >= state.columnas.length) return state
      return { ...state, columnaActivaId: state.columnas[newIdx].id }
    }

    default:
      return state
  }
}

// ── Provider ──
export function ProyectoProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, estadoInicial)

  const columnaActiva = state.columnas.find(c => c.id === state.columnaActivaId) || state.columnas[0]

  const value = {
    ...state,
    columnaActiva,
    dispatch,
  }

  return (
    <ProyectoContext.Provider value={value}>
      {children}
    </ProyectoContext.Provider>
  )
}

// ── Hook ──
export function useProyecto() {
  const ctx = useContext(ProyectoContext)
  if (!ctx) throw new Error('useProyecto debe usarse dentro de ProyectoProvider')
  return ctx
}
