import { create } from 'zustand'
import { nanoid } from 'nanoid'

interface Snip {
    id: string
    title: string
    content: string
    tags: string
    createdAt: string
    updatedAt: string
}

interface SnipStore {
    snips: Snip[]
    loading: boolean
    error: string | null

    // Actions
    fetchSnips: () => Promise<void>
    addSnip: (snip: Partial<Snip>) => Promise<void>
    updateSnip: (id: string, updates: Partial<Snip>) => Promise<void>
    deleteSnip: (id: string) => Promise<void>
}

export const useSnipStore = create<SnipStore>((set, get) => ({
    snips: [],
    loading: false,
    error: null,

    fetchSnips: async () => {
        set({ loading: true })
        try {
            const snips = await (window as any).electron.db.getSnips()
            set({ snips, loading: false })
        } catch (err: any) {
            set({ error: err.message, loading: false })
        }
    },

    addSnip: async (partialSnip) => {
        const newSnip: Snip = {
            id: nanoid(),
            title: partialSnip.title || 'Untitled',
            content: partialSnip.content || '',
            tags: partialSnip.tags || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }

        try {
            await (window as any).electron.db.addSnip(newSnip)
            set((state) => ({ snips: [newSnip, ...state.snips] }))
        } catch (err: any) {
            set({ error: err.message })
        }
    },

    updateSnip: async (id, updates) => {
        try {
            await (window as any).electron.db.updateSnip(id, updates)
            const updatedAt = new Date().toISOString()
            set((state) => ({
                snips: state.snips.map((s) =>
                    s.id === id ? { ...s, ...updates, updatedAt } : s
                )
            }))
        } catch (err: any) {
            set({ error: err.message })
        }
    },

    deleteSnip: async (id) => {
        try {
            await (window as any).electron.db.deleteSnip(id)
            set((state) => ({
                snips: state.snips.filter((s) => s.id !== id)
            }))
        } catch (err: any) {
            set({ error: err.message })
        }
    },
}))
