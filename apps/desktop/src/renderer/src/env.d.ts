/// <reference types="vite/client" />

interface Window {
    electron: {
        ping: () => Promise<string>
        store: {
            get: (key: string) => Promise<any>
            set: (key: string, value: any) => Promise<void>
        }
        db: {
            getSnips: () => Promise<any[]>
            addSnip: (snip: any) => Promise<any>
            updateSnip: (id: string, updates: any) => Promise<any>
            deleteSnip: (id: string) => Promise<any>
            exportSnips: () => Promise<any[]>
            importSnips: (snips: any[]) => Promise<{ imported: number }>
            clearAll: () => Promise<{ success: boolean }>
        }
    }
}
