import React, { useState } from 'react'
import { format } from 'date-fns'

interface Snip {
    id: string
    title: string
    content: string
    tags: string
    createdAt: string
    updatedAt: string
}

interface SnippetListProps {
    snips: Snip[]
    onSelect: (snip: Snip) => void
    selectedId?: string
}

const SnippetList: React.FC<SnippetListProps> = ({ snips, onSelect, selectedId }) => {
    const [search, setSearch] = useState('')

    const filteredSnips = snips.filter(snip =>
        snip.title.toLowerCase().includes(search.toLowerCase()) ||
        snip.content.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="w-80 bg-gray-850 border-r border-gray-800 flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-gray-800">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                        <div className="i-ph-magnifying-glass-bold" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search snippets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-gray-800 border-none rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredSnips.length === 0 ? (
                    <div className="p-8 text-center text-gray-600 flex flex-col items-center gap-2">
                        <div className="i-ph-empty-bold text-4xl opacity-20" />
                        <p className="text-sm">No snippets found</p>
                    </div>
                ) : (
                    filteredSnips.map((snip) => (
                        <button
                            key={snip.id}
                            onClick={() => onSelect(snip)}
                            className={`w-full text-left p-4 border-b border-gray-800 transition-all group ${selectedId === snip.id
                                ? 'bg-blue-600/10 border-l-4 border-l-blue-600'
                                : 'hover:bg-gray-800 border-l-4 border-l-transparent'
                                }`}
                        >
                            <h3 className={`font-medium mb-1 truncate ${selectedId === snip.id ? 'text-blue-400' : 'text-gray-200'
                                }`}>
                                {snip.title || 'Untitled Snippet'}
                            </h3>
                            <p className="text-xs text-gray-500 truncate mb-2">
                                {snip.content}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-gray-600 font-medium">
                                <span className="flex items-center gap-1">
                                    <div className="i-ph-clock-bold" />
                                    {(() => {
                                        try {
                                            return format(new Date(snip.updatedAt), 'MMM d, h:mm a')
                                        } catch (e) {
                                            return 'Unknown Date'
                                        }
                                    })()}
                                </span>
                                <div className="flex gap-1">
                                    {snip.tags.split(',').filter(Boolean).slice(0, 2).map(tag => (
                                        <span key={tag} className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    )
}

export default SnippetList
