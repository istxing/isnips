import Store from 'electron-store'
import Database from 'better-sqlite3'
import { app, ipcMain } from 'electron'
import path from 'path'

// electron-store for configuration
export const store = new Store({
    name: 'config',
    defaults: {
        theme: 'dark',
        syncEnabled: false,
    }
})

// SQLite for business data
const dbPath = app.isPackaged
    ? path.join(app.getPath('userData'), 'database.sqlite')
    : path.join(__dirname, '../../database.sqlite')

export const db = new Database(dbPath)

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS snips (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    tags TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

export function setupDatabaseHandlers() {
    // Store handlers
    ipcMain.handle('store:get', (_, key) => store.get(key))
    ipcMain.handle('store:set', (_, key, value) => store.set(key, value))

    // DB handlers
    ipcMain.handle('db:get-snips', () => {
        return db.prepare('SELECT * FROM snips ORDER BY createdAt DESC').all()
    })

    ipcMain.handle('db:add-snip', (_, snip) => {
        const stmt = db.prepare(`
      INSERT INTO snips (id, title, content, tags, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
        return stmt.run(snip.id, snip.title, snip.content, snip.tags, snip.createdAt, snip.updatedAt)
    })

    ipcMain.handle('db:update-snip', (_, id, updates) => {
        const sets = Object.keys(updates).map(key => `${key} = ?`).join(', ')
        const values = Object.values(updates)
        const stmt = db.prepare(`UPDATE snips SET ${sets}, updatedAt = ? WHERE id = ?`)
        return stmt.run(...values, new Date().toISOString(), id)
    })

    ipcMain.handle('db:delete-snip', (_, id) => {
        const stmt = db.prepare('DELETE FROM snips WHERE id = ?')
        return stmt.run(id)
    })

    // Export all snips as JSON
    ipcMain.handle('db:export-snips', () => {
        return db.prepare('SELECT * FROM snips ORDER BY createdAt DESC').all()
    })

    // Import snips from JSON (merge mode - adds to existing)
    ipcMain.handle('db:import-snips', (_, snips: any[]) => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO snips (id, title, content, tags, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
        `)
        const insertMany = db.transaction((items: any[]) => {
            for (const snip of items) {
                stmt.run(
                    snip.id,
                    snip.title || '',
                    snip.content || '',
                    snip.tags || '',
                    snip.createdAt || new Date().toISOString(),
                    snip.updatedAt || new Date().toISOString()
                )
            }
        })
        insertMany(snips)
        return { imported: snips.length }
    })

    // Clear all data
    ipcMain.handle('db:clear-all', () => {
        db.prepare('DELETE FROM snips').run()
        return { success: true }
    })
}
