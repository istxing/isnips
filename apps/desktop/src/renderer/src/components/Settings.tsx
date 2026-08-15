import React, { useState, useEffect } from 'react'

interface SettingsProps {
    onClose: () => void
}

type Theme = 'dark' | 'light' | 'system'
type Tab = 'appearance' | 'sync' | 'data' | 'about'

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('appearance')
    const [theme, setTheme] = useState<Theme>('dark')
    const [importing, setImporting] = useState(false)
    const [exporting, setExporting] = useState(false)

    useEffect(() => {
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') as Theme | null
        if (savedTheme) setTheme(savedTheme)
    }, [])

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme)
        localStorage.setItem('theme', newTheme)

        // Apply theme to document
        if (newTheme === 'light') {
            document.documentElement.classList.add('light-theme')
        } else {
            document.documentElement.classList.remove('light-theme')
        }
    }

    const handleExport = async () => {
        setExporting(true)
        try {
            const snips = await (window as any).electron.db.exportSnips()
            const blob = new Blob([JSON.stringify(snips, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `isnips-backup-${new Date().toISOString().split('T')[0]}.json`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Export failed:', err)
        } finally {
            setExporting(false)
        }
    }

    const handleImport = async () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            setImporting(true)
            try {
                const text = await file.text()
                const snips = JSON.parse(text)
                await (window as any).electron.db.importSnips(snips)
                alert('导入成功！请刷新应用查看新数据。')
            } catch (err) {
                console.error('Import failed:', err)
                alert('导入失败，请检查文件格式。')
            } finally {
                setImporting(false)
            }
        }
        input.click()
    }

    const handleClearAll = async () => {
        if (!confirm('确定要清空所有数据吗？此操作不可撤销！')) return
        if (!confirm('再次确认：所有 Snippets 将被永久删除！')) return

        try {
            await (window as any).electron.db.clearAll()
            alert('数据已清空！请刷新应用。')
        } catch (err) {
            console.error('Clear failed:', err)
        }
    }

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'appearance', label: '外观', icon: 'i-ph-paint-brush-bold' },
        { id: 'sync', label: '同步', icon: 'i-ph-cloud-bold' },
        { id: 'data', label: '数据', icon: 'i-ph-database-bold' },
        { id: 'about', label: '关于', icon: 'i-ph-info-bold' },
    ]

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex">
                {/* Sidebar */}
                <div className="w-48 border-r border-gray-800 p-4 flex flex-col gap-1">
                    <h2 className="text-lg font-bold text-gray-100 mb-4 px-2">设置</h2>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${activeTab === tab.id
                                    ? 'bg-blue-600/20 text-blue-400'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                }`}
                        >
                            <div className={`${tab.icon} text-lg`} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        <div className="i-ph-x-bold text-xl" />
                    </button>

                    {activeTab === 'appearance' && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-100 mb-6">外观设置</h3>
                            <div className="space-y-4">
                                <label className="text-sm text-gray-400">主题</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['dark', 'light', 'system'] as Theme[]).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => handleThemeChange(t)}
                                            className={`px-4 py-3 rounded-xl border transition-all ${theme === t
                                                    ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                                                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                                }`}
                                        >
                                            {t === 'dark' && '深色'}
                                            {t === 'light' && '浅色'}
                                            {t === 'system' && '跟随系统'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'sync' && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-100 mb-6">同步设置</h3>
                            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
                                <div className="i-ph-cloud-slash-bold text-4xl text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400 mb-2">云端同步功能即将推出</p>
                                <p className="text-sm text-gray-600">敬请期待多设备同步、实时备份等功能</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-100 mb-6">数据管理</h3>
                            <div className="space-y-4">
                                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                                    <h4 className="font-semibold text-gray-200 mb-2">导出数据</h4>
                                    <p className="text-sm text-gray-500 mb-3">将所有 Snippets 导出为 JSON 文件</p>
                                    <button
                                        onClick={handleExport}
                                        disabled={exporting}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-lg text-white transition-colors"
                                    >
                                        {exporting ? '导出中...' : '导出 JSON'}
                                    </button>
                                </div>

                                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                                    <h4 className="font-semibold text-gray-200 mb-2">导入数据</h4>
                                    <p className="text-sm text-gray-500 mb-3">从 JSON 文件恢复 Snippets</p>
                                    <button
                                        onClick={handleImport}
                                        disabled={importing}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 rounded-lg text-white transition-colors"
                                    >
                                        {importing ? '导入中...' : '选择文件'}
                                    </button>
                                </div>

                                <div className="bg-red-900/20 border border-red-900/50 rounded-xl p-4">
                                    <h4 className="font-semibold text-red-400 mb-2">危险操作</h4>
                                    <p className="text-sm text-gray-500 mb-3">清空所有数据，此操作不可撤销</p>
                                    <button
                                        onClick={handleClearAll}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition-colors"
                                    >
                                        清空所有数据
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-100 mb-6">关于 iSnips</h3>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                                        <span className="font-bold text-white text-3xl">i</span>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-100">iSnips</h4>
                                        <p className="text-gray-500">版本 1.0.0</p>
                                    </div>
                                </div>

                                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">作者</span>
                                        <span className="text-gray-200">istxing</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">许可证</span>
                                        <span className="text-gray-200">MIT</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Electron</span>
                                        <span className="text-gray-200">31.x</span>
                                    </div>
                                </div>

                                <a
                                    href="https://github.com/istxing/iSnips"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-gray-300"
                                >
                                    <div className="i-ph-github-logo-bold text-xl" />
                                    <span>在 GitHub 上查看源码</span>
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Settings
