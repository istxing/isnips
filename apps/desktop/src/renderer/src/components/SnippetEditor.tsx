import React, { useState, useEffect } from 'react'

interface Snip {
    id: string
    title: string
    content: string
    tags: string
    createdAt: string
    updatedAt: string
}

interface SnippetEditorProps {
    snip: Snip | null
    onSave: (snip: Partial<Snip>) => void
    onDelete: (id: string) => void
}

const SnippetEditor: React.FC<SnippetEditorProps> = ({ snip, onSave, onDelete }) => {
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [tags, setTags] = useState('')
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
        if (snip) {
            setTitle(snip.title)
            setContent(snip.content)
            setTags(snip.tags)
            setIsEditing(false)
        } else {
            setTitle('')
            setContent('')
            setTags('')
            setIsEditing(true)
        }
    }, [snip])

    const handleSave = () => {
        onSave({
            title,
            content,
            tags,
        })
        setIsEditing(false)
    }

    if (!snip && !isEditing) {
        return (
            <div className="flex-1 bg-gray-900 flex flex-col items-center justify-center text-gray-600 gap-4">
                <div className="i-ph-code-bold text-6xl opacity-10" />
                <p>Select a snippet to view or create a new one</p>
            </div>
        )
    }

    return (
        <div className="flex-1 bg-gray-900 flex flex-col overflow-hidden">
            <div className="p-4 bg-gray-850 border-b border-gray-800 flex items-center justify-between">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Snippet Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={!isEditing}
                        className="w-full bg-transparent border-none text-xl font-bold text-gray-100 placeholder-gray-700 focus:ring-0 outline-none"
                    />
                </div>
                <div className="flex items-center gap-3 ml-4">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => snip ? setIsEditing(false) : null}
                                className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                                disabled={!snip}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-900/20 font-medium"
                            >
                                Save Changes
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-gray-800 transition-all"
                                title="Edit"
                            >
                                <div className="i-ph-pencil-simple-bold" />
                            </button>
                            <button
                                onClick={() => snip && onDelete(snip.id)}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all"
                                title="Delete"
                            >
                                <div className="i-ph-trash-bold" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                    <div className="i-ph-hash-bold text-gray-600" />
                    <input
                        type="text"
                        placeholder="Tags (comma separated)"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        disabled={!isEditing}
                        className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-1 text-sm text-gray-400 placeholder-gray-600 focus:ring-1 focus:ring-blue-600 outline-none w-64"
                    />
                </div>

                <div className="flex-1 bg-gray-850 rounded-xl border border-gray-800 overflow-hidden relative">
                    <textarea
                        placeholder="Your snippet content here..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={!isEditing}
                        className="w-full h-full bg-transparent border-none p-6 text-gray-300 font-mono text-sm resize-none focus:ring-0 outline-none leading-relaxed"
                    />
                </div>
            </div>

            {snip && (
                <div className="px-6 py-3 border-t border-gray-800 text-[10px] text-gray-600 flex gap-6">
                    <span>Created: {new Date(snip.createdAt).toLocaleString()}</span>
                    <span>Last Updated: {new Date(snip.updatedAt).toLocaleString()}</span>
                </div>
            )}
        </div>
    )
}

export default SnippetEditor
