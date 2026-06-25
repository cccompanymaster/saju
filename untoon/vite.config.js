import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// 모바일 앱 프레임 데모. base를 상대경로로 두어 정적 호스팅/서브경로 배포에 유연.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: './',
});
