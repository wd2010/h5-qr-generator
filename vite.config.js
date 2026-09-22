import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 移动端 H5：使用相对 base，方便部署到任意子路径 / 静态托管
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    host: true,
    port: 5173
  }
})
