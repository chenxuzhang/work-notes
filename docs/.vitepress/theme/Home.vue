<template>
  <div class="hero-vite-container">
    <!-- 左右分栏核心网格 -->
    <div class="hero-vite-grid">
      <!-- 左侧信息区 -->
      <div class="hero-left-pane">
        <div>
          <div class="hero-badge">WORK NOTES · DEV LOG</div>
          <h1 class="hero-title">
            面向实战的<br />工作沉淀手册
          </h1>
          <p class="hero-desc">
            记录日常排错、业务方案与常用速查备忘。<br />
            让每一个踩过的坑都有据可循，拿来即抄。
          </p>
          <div class="hero-actions">
            <a href="/work-notes/bugs/" class="hero-btn-primary">开始排错</a>
            <a href="https://github.com/chenxuzhang/work-notes" target="_blank" class="hero-btn-secondary">GitHub 仓库</a>
          </div>
        </div>

        <!-- 黑客风格终端命令框 -->
        <div class="hero-terminal">
          <div class="hero-terminal-header">
            <span class="hero-terminal-tab active">Git</span>
            <span class="hero-terminal-tab">Docker</span>
            <span class="hero-terminal-tab">Linux</span>
          </div>
          <div class="hero-terminal-body">
            <span class="prompt">$</span>
            <span>git clone git@github.com:chenxuzhang/work-notes.git</span>
          </div>
        </div>
      </div>

      <!-- 右侧 3D 等距架构透视矢量图 -->
      <div class="hero-right-pane">
        <svg class="iso-graphic-svg" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="planeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1f2433" />
              <stop offset="100%" stop-color="#11141f" />
            </linearGradient>
            <linearGradient id="purpleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#bd34fe" />
              <stop offset="100%" stop-color="#7c3aed" />
            </linearGradient>
            <filter id="neonBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <!-- 连线骨架 -->
          <path d="M 120 220 L 250 300" stroke="#374151" stroke-width="2" stroke-dasharray="4 4" />
          <path d="M 380 220 L 250 300" stroke="#374151" stroke-width="2" stroke-dasharray="4 4" />
          <path d="M 250 150 L 250 300" stroke="#7c3aed" stroke-width="2" opacity="0.6" />

          <!-- 顶部悬浮大主平面 (虚线框) -->
          <g opacity="0.6">
            <path d="M 250 80 L 390 150 L 250 220 L 110 150 Z" stroke="#6b7280" stroke-width="1.5" stroke-dasharray="6 4" fill="none" />
            <text x="235" y="155" fill="#9ca3af" font-size="12" font-family="monospace">.DOCS</text>
          </g>

          <!-- 核心等距立体方块 (主基座) -->
          <g>
            <path d="M 140 310 L 250 365 L 360 310 L 360 330 L 250 385 L 140 330 Z" fill="url(#purpleGlow)" filter="url(#neonBlur)" opacity="0.9" />
            <path d="M 140 310 L 250 365 L 250 385 L 140 330 Z" fill="#6b21a8" />
            <path d="M 360 310 L 250 365 L 250 385 L 360 330 Z" fill="#9333ea" />
            <path d="M 250 255 L 360 310 L 250 365 L 140 310 Z" fill="url(#planeGrad)" stroke="#a855f7" stroke-width="1.5" />
            <text x="205" y="315" fill="#ffffff" font-size="14" font-weight="bold" font-family="monospace">WORK_NOTES</text>
          </g>

          <!-- 左侧卫星小方块 (.bugs) -->
          <g>
            <path d="M 80 220 L 130 245 L 130 255 L 80 230 Z" fill="#7c3aed" />
            <path d="M 180 220 L 130 245 L 130 255 L 180 230 Z" fill="#a855f7" />
            <path d="M 130 195 L 180 220 L 130 245 L 80 220 Z" fill="#1e2230" stroke="#c084fc" stroke-width="1.2" />
            <text x="110" y="224" fill="#d8b4fe" font-size="11" font-family="monospace">.bugs</text>
          </g>

          <!-- 右侧卫星小方块 (.solutions) -->
          <g>
            <path d="M 320 220 L 370 245 L 370 255 L 320 230 Z" fill="#0284c7" />
            <path d="M 420 220 L 370 245 L 370 255 L 420 230 Z" fill="#38bdf8" />
            <path d="M 370 195 L 420 220 L 370 245 L 320 220 Z" fill="#1e2230" stroke="#38bdf8" stroke-width="1.2" />
            <text x="345" y="224" fill="#7dd3fc" font-size="11" font-family="monospace">.sol</text>
          </g>

          <!-- 底部微型卫星 (.cheats) -->
          <g>
            <path d="M 110 380 L 145 397 L 145 404 L 110 387 Z" fill="#7c3aed" />
            <path d="M 180 380 L 145 397 L 145 404 L 180 387 Z" fill="#9333ea" />
            <path d="M 145 363 L 180 380 L 145 397 L 110 380 Z" fill="#1e2230" stroke="#c084fc" stroke-width="1" />
            <text x="130" y="383" fill="#e9d5ff" font-size="9" font-family="monospace">.cmd</text>
          </g>

          <g>
            <path d="M 320 380 L 355 397 L 355 404 L 320 387 Z" fill="#475569" />
            <path d="M 390 380 L 355 397 L 355 404 L 390 387 Z" fill="#64748b" />
            <path d="M 355 363 L 390 380 L 355 397 L 320 380 Z" fill="#1e2230" stroke="#94a3b8" stroke-width="1" />
            <text x="340" y="383" fill="#cbd5e1" font-size="9" font-family="monospace">.sop</text>
          </g>
        </svg>
      </div>
    </div>

    <!-- 下方特征卡片区域 -->
    <div class="features-section">
      <div class="feature-box">
        <div class="feature-box-icon">⚡</div>
        <div class="feature-box-title">极速全局检索</div>
        <div class="feature-box-desc">按快捷键 Cmd+K / Ctrl+K，直接毫秒级搜索历史代码与排错现场。</div>
      </div>
      <div class="feature-box">
        <div class="feature-box-icon">🐛</div>
        <div class="feature-box-title">踩坑排错手册</div>
        <div class="feature-box-desc">记录生产与测试环境真实报错、排查链路与最终解法，拒绝二次踩坑。</div>
      </div>
      <div class="feature-box">
        <div class="feature-box-icon">💡</div>
        <div class="feature-box-title">方案与架构实现</div>
        <div class="feature-box-desc">复杂业务拆解、通用中间件封装、核心配置代码片段，开箱即可复用。</div>
      </div>
      <div class="feature-box">
        <div class="feature-box-icon">📋</div>
        <div class="feature-box-title">常用速查 & SOP</div>
        <div class="feature-box-desc">Docker、Linux、Git、Nginx 等高频但易忘命令与参数一站式整理备忘。</div>
      </div>
    </div>
  </div>
</template>
