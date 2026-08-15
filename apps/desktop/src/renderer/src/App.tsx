import { useState, useEffect, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import SnippetList from './components/SnippetList'
import SnippetEditor from './components/SnippetEditor'
import Settings from './components/Settings'
import { useSnipStore } from './store'

function App() {
    const { snips, loading, fetchSnips, addSnip, updateSnip, deleteSnip } = useSnipStore()
    const [selectedId, setSelectedId] = useState<string | undefined>()
    const [currentTag, setCurrentTag] = useState<string | null>(null)
    const [showSettings, setShowSettings] = useState(false)

    useEffect(() => {
        fetchSnips()
    }, [])

    const selectedSnip = useMemo(() =>
        snips.find(s => s.id === selectedId) || null
        , [snips, selectedId])

    const tags = useMemo(() => {
        const allTags = snips.flatMap(s => s.tags.split(',').map(t => t.trim()).filter(Boolean))
        return Array.from(new Set(allTags)).sort()
    }, [snips])

    const filteredSnips = useMemo(() => {
        if (!currentTag) return snips
        return snips.filter(s => s.tags.split(',').map(t => t.trim()).includes(currentTag))
    }, [snips, currentTag])

    const handleCreateNew = () => {
        setSelectedId(undefined)
    }

    const handleSave = async (updates: any) => {
        if (selectedId) {
            await updateSnip(selectedId, updates)
        } else {
            await addSnip(updates)
            // Note: addSnip generates an ID but we don't have it here yet in a simple way
            // We could use return value or look at state. For now just clear selection
            setSelectedId(undefined)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this snippet?')) {
            await deleteSnip(id)
            setSelectedId(undefined)
        }
    }

    return (
        <div className="h-screen w-screen flex bg-gray-900 text-gray-200 overflow-hidden font-sans">
            <Sidebar
                tags={tags}
                currentTag={currentTag}
                setCurrentTag={setCurrentTag}
                onSettingsClick={() => setShowSettings(true)}
            />

            <SnippetList
                snips={filteredSnips}
                onSelect={(s) => setSelectedId(s.id)}
                selectedId={selectedId}
            />

            <main className="flex-1 flex flex-col min-w-0">
                <div className="h-12 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-400">
                            {currentTag ? `Tagged: ${currentTag}` : 'All Snippets'}
                        </span>
                        <span className="text-gray-700">•</span>
                        <span className="text-xs text-gray-500">{filteredSnips.length} items</span>
                    </div>

                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-lg shadow-blue-900/20"
                    >
                        <div className="i-ph-plus-bold" />
                        New Snippet
                    </button>
                </div>

                <SnippetEditor
                    snip={selectedSnip}
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            </main>

            {loading && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {showSettings && (
                <Settings onClose={() => setShowSettings(false)} />
            )}
        </div>
    )
}

export default App
