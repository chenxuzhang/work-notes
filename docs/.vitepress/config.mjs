import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Work Notes",
  description: "工作踩坑与实用备忘，拿来即用",
  
  // 对应 GitHub 仓库名
  base: '/work-notes/',

  // 显示最近更新时间（依赖 git commit）
  lastUpdated: true,

  themeConfig: {
    // 开启本地即时搜索（按 Ctrl+K 或 Cmd+K 秒查）
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

    // 顶部导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '🐛 踩坑排错', link: '/bugs/' },
      { text: '💡 方案实现', link: '/solutions/' },
      { text: '📋 常用备忘', link: '/cheatsheets/' },
      { text: '🔬 原理剖析', link: '/internals/' }
    ],

    // 左侧分类侧边栏
    sidebar: {
      '/bugs/': [
        {
          text: '踩坑排错',
          items: [
            { text: '排错索引与示例', link: '/bugs/' }
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
            { text: '常用命令速查', link: '/cheatsheets/' }
          ]
        }
      ],
      '/internals/': [
        {
          text: '原理与源码剖析',
          items: [
            { text: '分类索引', link: '/internals/' }
          ]
        },
        {
          text: 'OpenCode v1.18.12',
          items: [
            { text: 'opencode run 会话压缩：何时触发', link: '/internals/opencode-v1.18.12/opencode-v1.18.12-compaction' },
            { text: 'opencode run 会话压缩：哪些保留，哪些摘要', link: '/internals/opencode-v1.18.12/opencode-v1.18.12-run-compaction-retention' }
          ]
        }
      ]
    },

    // 右侧大纲导航
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
