import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // ตั้งค่า @ ให้ชี้ไปที่โฟลเดอร์ src
      // (Path Alias = ทางลัดสำหรับ import)
      '@': path.resolve(__dirname, './src'),
      // ตั้งค่า @mock-data ให้ชี้ไปที่โฟลเดอร์ mock-data
      '@mock-data': path.resolve(__dirname, '../mock-data'),
    },
  },
})
