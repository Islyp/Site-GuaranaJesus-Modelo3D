/**
 * ============================================================================
 *  Guaraná Jesus — Experiência digital de marca
 *  Ponto de entrada da aplicação
 * ============================================================================
 *
 * Responsabilidades deste arquivo:
 *  1. Carregar os estilos globais (tokens de cor, tipografia, utilitários).
 *  2. Desligar a restauração automática de scroll do navegador.
 *  3. Montar o <App /> dentro do #root definido no index.html.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Toda a narrativa (posição da lata, câmera, cores) é derivada do scroll.
// Se o navegador restaurasse a posição ao recarregar, a página poderia abrir
// "no meio do filme", antes de a timeline ser montada. Por isso: manual.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')!).render(
  // StrictMode executa os efeitos duas vezes em desenvolvimento. Todas as
  // animações (Lenis, GSAP, listeners) retornam funções de limpeza, então
  // montar → desmontar → montar de novo é seguro e ajuda a detectar vazamentos.
  <StrictMode>
    <App />
  </StrictMode>
);
