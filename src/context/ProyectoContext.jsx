import { createContext, useContext, useReducer } from 'react'
import { generarDisposicion } from '../utils/engine'

const ProyectoContext = createContext(null)

// ── ID único ──
let _id = 1
const uid = () => `col-${Date.now()}-${_id++}`
const tidGen = () => Date.now() + Math.floor(Math.random() * 1000)

// ── Combinaciones por defecto ──
const COMBOS_DEFAULT = [
  { id: 1, label: '1.4CM + 1.7CV',    Pu: '', Mux: '', Muy: '', activa: true },
  { id: 2, label: '1.25(CM+CV) + CS', Pu: '', Mux: '', Muy: '', activa: true },
  { id: 3, label: '1.25(CM+CV) - CS', Pu: '', Mux: '', Muy: '', activa: true },
  { id: 4, label: '0.9CM + CS',       Pu: '', Mux: '', Muy: '', activa: true },
  { id: 5, label: '0.9CM - CS',       Pu: '', Mux: '', Muy: '', activa: true },
]

// ── Tipo de columna por defecto ──
export function crearTipo(overrides = {}) {
  return {
    id: tidGen(),
    codigo: 'CT-01',
    descripcion: '',
    material: { fc: 280, fy: 4200 },
    geometria: { tipo: 'rectangular', b: 40, h: 50, recubrimiento: 4, longitud: 300 },
    sistema_estructural: 'SMF',
    refuerzo: { barras: [] },
    superficie: null,
    ...overrides,
  }
}

// ── Columna por defecto ──
export function crearColumna(overrides = {}) {
  return {
    id: uid(),
    nombre: 'C-1',
    eje: 'A-1',
    nivel: '1-2',
    tipoId: null,
    sobreescrito: false,
    material: { fc: 280, fy: 4200 },
    geometria: { tipo: 'rectangular', b: 40, h: 50, recubrimiento: 4, longitud: 300 },
    sistema_estructural: 'SMF',
    refuerzo: { barras: [] },
    combinaciones: COMBOS_DEFAULT.map(c => ({ ...c })),
    superficie: null,
    resultados: null,
    dcr_max: null,
    estado: 'sin_calcular',
    ...overrides,
  }
}

// ── Tipos iniciales de ejemplo ──
function tiposIniciales() {
  const barras1 = generarDisposicion(40, 50, 4, 8, 2.540, 'rectangular')
  const barras2 = generarDisposicion(30, 40, 4, 6, 1.905, 'rectangular')
  return [
    crearTipo({
      codigo: 'CT-01',
      descripcion: 'Columna principal nivel 1',
      material: { fc: 280, fy: 4200 },
      geometria: { tipo: 'rectangular', b: 40, h: 50, recubrimiento: 4, longitud: 300 },
      refuerzo: { barras: barras1 },
    }),
    crearTipo({
      id: tidGen() + 1,
      codigo: 'CT-02',
      descripcion: 'Columna secundaria',
      material: { fc: 280, fy: 4200 },
      geometria: { tipo: 'rectangular', b: 30, h: 40, recubrimiento: 4, longitud: 300 },
      refuerzo: { barras: barras2 },
    }),
  ]
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
    tiposColumna: tiposIniciales(),
    vista: 'dashboard', // dashboard | editor | biblioteca
  }
}

// ── Aplicar tipo a columna (si no está sobreescrita) ──
function aplicarTipo(col, tipo) {
  if (!tipo || col.sobreescrito) return col
  return {
    ...col,
    material: { ...tipo.material },
    geometria: { ...tipo.geometria },
    sistema_estructural: tipo.sistema_estructural,
    refuerzo: JSON.parse(JSON.stringify(tipo.refuerzo)),
    superficie: null, resultados: null, dcr_max: null, estado: 'sin_calcular',
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
      return { ...state, columnas: [...state.columnas, nueva] }
    }

    case 'DUPLICAR_COLUMNA': {
      const orig = state.columnas.find(c => c.id === action.id)
      if (!orig) return state
      const copia = {
        ...JSON.parse(JSON.stringify(orig)),
        id: uid(),
        nombre: `${orig.nombre} (copia)`,
        superficie: null, resultados: null, dcr_max: null, estado: 'sin_calcular',
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
        columnas: state.columnas.map(c => c.id === id ? { ...c, ...changes } : c),
      }
    }

    case 'ACTUALIZAR_CAMPO_COLUMNA': {
      const { id, field, value } = action
      return {
        ...state,
        columnas: state.columnas.map(c => c.id === id ? { ...c, [field]: value } : c),
      }
    }

    // ── Asignar tipo a columna ──
    case 'ASIGNAR_TIPO': {
      const { colId, tipoId, forzar } = action
      const tipo = state.tiposColumna.find(t => t.id === tipoId)
      return {
        ...state,
        columnas: state.columnas.map(c => {
          if (c.id !== colId) return c
          const updated = { ...c, tipoId, sobreescrito: false }
          if (tipo && (forzar || !c.sobreescrito)) {
            return aplicarTipo(updated, tipo)
          }
          return updated
        }),
      }
    }

    case 'DESVINCULAR_TIPO': {
      return {
        ...state,
        columnas: state.columnas.map(c =>
          c.id === action.colId ? { ...c, tipoId: null, sobreescrito: false } : c
        ),
      }
    }

    case 'SET_SOBREESCRITO': {
      return {
        ...state,
        columnas: state.columnas.map(c =>
          c.id === action.colId ? { ...c, sobreescrito: action.value } : c
        ),
      }
    }

    // ── Tipos CRUD ──
    case 'AGREGAR_TIPO': {
      const nuevo = crearTipo(action.overrides || {})
      return { ...state, tiposColumna: [...state.tiposColumna, nuevo] }
    }

    case 'ACTUALIZAR_TIPO': {
      const { id, changes } = action
      const newTipos = state.tiposColumna.map(t => t.id === id ? { ...t, ...changes } : t)
      const tipoActualizado = newTipos.find(t => t.id === id)
      // Propagar a columnas no-sobreescritas que usen este tipo
      const newCols = state.columnas.map(c => {
        if (c.tipoId === id && !c.sobreescrito && tipoActualizado) {
          return aplicarTipo(c, tipoActualizado)
        }
        return c
      })
      return { ...state, tiposColumna: newTipos, columnas: newCols }
    }

    case 'DUPLICAR_TIPO': {
      const orig = state.tiposColumna.find(t => t.id === action.id)
      if (!orig) return state
      const copia = {
        ...JSON.parse(JSON.stringify(orig)),
        id: tidGen(),
        codigo: `${orig.codigo} (copia)`,
        superficie: null,
      }
      return { ...state, tiposColumna: [...state.tiposColumna, copia] }
    }

    case 'ELIMINAR_TIPO': {
      const newTipos = state.tiposColumna.filter(t => t.id !== action.id)
      // Desvincular columnas que usaban este tipo
      const newCols = state.columnas.map(c =>
        c.tipoId === action.id ? { ...c, tipoId: null } : c
      )
      return { ...state, tiposColumna: newTipos, columnas: newCols }
    }

    case 'IMPORTAR_COLUMNAS': {
      const nuevas = []
      for (const imp of action.columnas) {
        const existente = state.columnas.find(c => c.nombre === imp.nombre)
        if (existente && action.modo === 'agregar') {
          const maxId = existente.combinaciones.reduce((m, c) => Math.max(m, c.id || 0), 0)
          const combosNuevos = imp.combinaciones.map((c, i) => ({
            id: maxId + i + 1, label: c.label || `Combo ${maxId + i + 1}`,
            Pu: c.Pu, Mux: c.Mux, Muy: c.Muy, activa: true,
          }))
          nuevas.push({ ...existente, combinaciones: [...existente.combinaciones, ...combosNuevos], estado: 'sin_calcular' })
        } else if (existente && action.modo === 'sobreescribir') {
          const combos = imp.combinaciones.map((c, i) => ({
            id: i + 1, label: c.label || `Combo ${i + 1}`, Pu: c.Pu, Mux: c.Mux, Muy: c.Muy, activa: true,
          }))
          nuevas.push({ ...existente, eje: imp.eje || existente.eje, nivel: imp.nivel || existente.nivel, combinaciones: combos, superficie: null, resultados: null, dcr_max: null, estado: 'sin_calcular' })
        } else {
          nuevas.push(crearColumna({ nombre: imp.nombre, eje: imp.eje || '', nivel: imp.nivel || '', combinaciones: imp.combinaciones.map((c, i) => ({ id: i + 1, label: c.label || `Combo ${i + 1}`, Pu: c.Pu, Mux: c.Mux, Muy: c.Muy, activa: true })) }))
        }
      }
      const colsMap = new Map(state.columnas.map(c => [c.id, c]))
      for (const n of nuevas) colsMap.set(n.id, n)
      return { ...state, columnas: [...colsMap.values()] }
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
  return (
    <ProyectoContext.Provider value={{ ...state, columnaActiva, dispatch }}>
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
