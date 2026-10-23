import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Work Notes",
  description: "工作踩坑与实用备忘，拿来即用",
  base: '/work-notes/',
  lastUpdated: true,

  // 默认暗黑主题（Vite 官网同款纯黑硬核风格）
  appearance: 'dark',

  head: [
    ['link', { rel: 'icon', href: '/work-notes/logo.svg' }]
  ],

  themeConfig: {
    logo: '/logo.svg',

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索文档、排错、备忘...', buttonAriaLabel: '搜索' },
              modal: {
                noResultsText: '无法找到相关记录',
                resetButtonTitle: '清除搜索条件',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
              }
            }
          }
        }
      }
    },

    nav: [
      { text: '首页', link: '/' },
      { text: '🐛 踩坑排错', link: '/bugs/' },
      { text: '💡 方案实现', link: '/solutions/' },
      { text: '📋 常用备忘', link: '/cheatsheets/' }
    ],

    sidebar: {
      '/bugs/': [
        {
          text: '踩坑排错',
          items: [
            { text: '排错索引与示例', link: '/bugs/' },
            { text: 'MySQL 超时排查', link: '/bugs/example-mysql-timeout' }
          ]
        }
      ],
      '/solutions/': [
        {
          text: '方案实现',
          items: [
            { text: '方案索引与示例', link: '/solutions/' }
          ]
        }
      ],
      '/cheatsheets/': [
        {
          text: '常用备忘',
          items: [
            { text: '常用命令速查', link: '/cheatsheets/' },
            { text: 'Docker 常用命令', link: '/cheatsheets/docker-common' }
          ]
        }
      ]
    },

    outline: {
      level: [2, 3],
      label: '本页大纲'
    },

    footer: {
      message: '个人工作备忘与技术沉淀',
      copyright: 'Copyright © 2026'
    }
  }
})
