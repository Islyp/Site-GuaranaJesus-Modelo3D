/**
 * Configuração do Vite.
 *
 * Não é preciso configurar code splitting manualmente: o import dinâmico
 * em App.tsx (React.lazy → three/GuaranaScene) já coloca Three.js, React
 * Three Fiber e drei em um chunk separado, carregado depois do HTML.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // permite abrir o servidor de desenvolvimento por um túnel Cloudflare
    // (útil para testar no celular fora da rede local)
    allowedHosts: ['.trycloudflare.com'],
  },
  build: {
    // o chunk do Three.js tem ~1 MB sem compressão (~280 KB gzip), o que é
    // esperado para uma cena 3D; o limite evita um aviso irrelevante no build
    chunkSizeWarningLimit: 1100,
  },
});
