import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

// 移动端 H5：使用相对 base，方便部署到任意子路径 / 静态托管
// 多页应用（MPA）：index.html 为主页，bridge.html 为「微信原生接口保存」演示页
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    host: true,
    port: 5173
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        bridge: resolve(__dirname, 'bridge.html')
      }
    }
  }
})
