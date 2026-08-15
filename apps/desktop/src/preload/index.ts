import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
    ping: () => ipcRenderer.invoke('ping'),
    store: {
        get: (key: string) => ipcRenderer.invoke('store:get', key),
        set: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
    },
    db: {
        getSnips: () => ipcRenderer.invoke('db:get-snips'),
        addSnip: (snip: any) => ipcRenderer.invoke('db:add-snip', snip),
        updateSnip: (id: string, updates: any) => ipcRenderer.invoke('db:update-snip', id, updates),
        deleteSnip: (id: string) => ipcRenderer.invoke('db:delete-snip', id),
        exportSnips: () => ipcRenderer.invoke('db:export-snips'),
        importSnips: (snips: any[]) => ipcRenderer.invoke('db:import-snips', snips),
        clearAll: () => ipcRenderer.invoke('db:clear-all'),
    }
})
