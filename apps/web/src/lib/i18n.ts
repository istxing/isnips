/**
 * iSnips 国际化多语言配置保留字典
 * 默认语言：zh-CN (简体中文)
 */

export type Locale = 'zh-CN' | 'en-US';

export const i18nConfig = {
  defaultLocale: 'zh-CN' as Locale,
  locales: ['zh-CN', 'en-US'] as Locale[],
};

export const dictionaries = {
  'zh-CN': {
    brand: 'iSnips',
    tagline: '个人信息空间',
    nav: {
      home: '超级主页',
      index: '索引库',
      all: '全部',
      notes: '闪记',
      clips: '片段',
      clipboard: '剪贴板',
      rss: 'RSS 订阅',
      knowledge: '知识沉淀',
      documents: '文档',
      reports: '阶段报告',
      settings: '设置与安全',
      newRecord: '新建记录',
      searchPrompt: '搜索全部索引',
    },
    common: {
      save: '保存',
      cancel: '取消',
      edit: '编辑',
      delete: '删除',
      copy: '复制',
      copied: '已复制',
      export: '导出',
      login: '登录',
      register: '注册',
      logout: '退出登录',
      credits: '算力点',
      privacy: '隐私',
      loading: '加载中...',
      empty: '暂无匹配数据',
    },
  },
  'en-US': {
    brand: 'iSnips',
    tagline: 'Personal Information OS',
    nav: {
      home: 'Super Home',
      index: 'Index',
      all: 'All',
      notes: 'Quick Notes',
      clips: 'Clips',
      clipboard: 'Clipboard',
      rss: 'RSS Feeds',
      knowledge: 'Knowledge',
      documents: 'Documents',
      reports: 'Reports',
      settings: 'Settings',
      newRecord: 'New Record',
      searchPrompt: 'Search Index',
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      copy: 'Copy',
      copied: 'Copied',
      export: 'Export',
      login: 'Sign In',
      register: 'Sign Up',
      logout: 'Log Out',
      credits: 'Credits',
      privacy: 'Private',
      loading: 'Loading...',
      empty: 'No items found',
    },
  },
};

export function getDictionary(locale: Locale = 'zh-CN') {
  return dictionaries[locale] || dictionaries['zh-CN'];
}
