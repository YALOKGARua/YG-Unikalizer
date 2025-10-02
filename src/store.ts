import { create } from 'zustand'

type Progress = { current: number; total: number; lastFile: string; etaMs?: number; speedBps?: number; percent?: number }

type AppState = {
  files: string[]
  results: { src: string; out: string }[]
  selected: Set<number>
  outputDir: string
  progress: Progress
  busy: boolean
  setFiles: (files: string[] | ((prev: string[]) => string[])) => void
  addFiles: (files: string[]) => void
  removeAt: (index: number) => void
  clearFiles: () => void
  setOutputDir: (dir: string) => void
  setBusy: (v: boolean) => void
  setProgress: (p: Progress) => void
  pushResult: (r: { src: string; out: string }) => void
  setSelected: (sel: Set<number>) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  files: [],
  results: [],
  selected: new Set<number>(),
  outputDir: '',
  progress: { current: 0, total: 0, lastFile: '' },
  busy: false,
  setFiles: (files) => set(state => ({ files: typeof files === 'function' ? (files as (prev: string[]) => string[])(state.files) : files })),
  addFiles: (incoming) => set(state => ({ files: Array.from(new Set([...(state.files||[]), ...incoming])) })),
  removeAt: (index) => set(state => ({ files: state.files.filter((_, i) => i !== index), selected: new Set(Array.from(state.selected).filter(i => i !== index)) })),
  clearFiles: () => set({ files: [], results: [], selected: new Set(), progress: { current: 0, total: 0, lastFile: '' } }),
  setOutputDir: (dir) => set({ outputDir: dir }),
  setBusy: (v) => set({ busy: v }),
  setProgress: (p) => set({ progress: p }),
  pushResult: (r) => set(state => ({ results: [...state.results, r] })),
  setSelected: (sel) => set({ selected: new Set(sel) }),
}))