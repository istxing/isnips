import React from 'react'

interface SidebarProps {
    currentTag: string | null
    setCurrentTag: (tag: string | null) => void
    tags: string[]
    onSettingsClick: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ currentTag, setCurrentTag, tags, onSettingsClick }) => {
    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
            <div className="p-4 border-b border-gray-800 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <span className="font-bold text-white text-lg">i</span>
                </div>
                <span className="font-bold text-xl text-gray-100">iSnips</span>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                <button
                    onClick={() => setCurrentTag(null)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentTag === null ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        }`}
                >
                    <div className="i-ph-stack-simple-bold text-lg" />
                    <span>All Snips</span>
                </button>

                <div className="mt-6 mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">Tags</span>
                </div>

                {tags.length === 0 ? (
                    <div className="px-3 py-10 text-center">
                        <p className="text-xs text-gray-600 italic">No tags yet</p>
                    </div>
                ) : (
                    tags.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => setCurrentTag(tag)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentTag === tag ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                }`}
                        >
                            <div className="i-ph-hash-bold text-lg" />
                            <span className="truncate">{tag}</span>
                        </button>
                    ))
                )}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={onSettingsClick}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-200 w-full transition-colors"
                >
                    <div className="i-ph-gear-bold text-lg" />
                    <span>Settings</span>
                </button>
            </div>
        </div>
    )
}

export default Sidebar
