/**
 * ============================================================================
 *  useCanInteraction — arrastar, clicar e deslizar na lata
 * ============================================================================
 *
 * Gestos suportados:
 *  - Mouse: arrastar gira (com inércia ao soltar); arrastar na vertical
 *    inclina; clique simples dá um giro de 360°.
 *  - Toque: deslizar na HORIZONTAL sobre a lata gira; toque simples dá 360°.
 *    Deslizar na VERTICAL continua rolando a página normalmente.
 *
 * Desafio de arquitetura: o canvas 3D fica atrás do HTML, com
 * pointer-events: none (para textos e links continuarem clicáveis). Então não
 * dá para ouvir eventos no canvas. A solução:
 *   1. ouvir os eventos na janela inteira;
 *   2. testar se o ponteiro está sobre a silhueta projetada da lata
 *      (calculada a cada frame pelo GuaranaCan → canInteraction.hit);
 *   3. só "capturar" o gesto quando o alvo não é um elemento de interface.
 *
 * Este hook só ESCREVE intenções em canInteraction (pendingSpin, inertia,
 * tilt, flourish). Quem transforma isso em rotação, com suavização, é o loop
 * do Three.js — assim a animação fica sempre sincronizada com o render.
 */
import { useEffect } from 'react';
import { gsap } from 'gsap';
import { canInteraction, isOverCan, spinFlourish } from '../state/canInteraction';

/** radianos de giro por pixel arrastado na horizontal */
const SPIN_PER_PX = 0.012;
/** radianos de inclinação por pixel arrastado na vertical */
const TILT_PER_PX = 0.005;
/** abaixo desta distância (px) o gesto conta como clique/toque, não arraste */
const TAP_TOLERANCE = 6;

/** Links, botões e campos têm prioridade: nunca iniciam um arraste da lata. */
function isInterfaceTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('a, button, input, [data-no-can]'));
}

export function useCanInteraction(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const state = canInteraction;

    // Rastreamento do gesto em andamento
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let moved = 0; // maior distância desde o início (distingue clique de arraste)
    // Última posição conhecida do mouse (para reavaliar o hover sem movimento)
    let mouse: { x: number; y: number; target: EventTarget | null } | null = null;

    /**
     * Liga/desliga o estado de hover. As classes no <html> permitem trocar o
     * cursor via CSS (grab/grabbing) e bloquear seleção de texto no arraste.
     */
    const setHover = (value: boolean) => {
      if (state.hovering === value) return;
      state.hovering = value;
      root.classList.toggle('can-hover', value);
    };

    // ---------------- ciclo do arraste: begin → move → end ----------------

    const begin = (x: number, y: number) => {
      state.dragging = true;
      state.inertia = 0;
      state.lastInteraction = performance.now();
      startX = lastX = x;
      startY = lastY = y;
      lastT = performance.now();
      moved = 0;
      root.classList.add('can-dragging');
    };

    const move = (x: number, y: number) => {
      const now = performance.now();
      const dx = x - lastX;
      const dy = y - lastY;
      const dt = Math.max(1, now - lastT) / 1000;

      // Giro imediato (consumido pelo próximo frame 3D)…
      state.pendingSpin += dx * SPIN_PER_PX;
      // …e velocidade instantânea, usada como inércia quando o usuário soltar.
      state.inertia = (dx * SPIN_PER_PX) / dt;
      // Inclinação limitada para a lata nunca "deitar" completamente.
      state.tilt = Math.max(-0.7, Math.min(0.7, state.tilt + dy * TILT_PER_PX));

      state.lastInteraction = now;
      moved = Math.max(moved, Math.hypot(x - startX, y - startY));
      lastX = x;
      lastY = y;
      lastT = now;
    };

    const end = () => {
      if (!state.dragging) return;
      state.dragging = false;
      // Se o usuário parou antes de soltar, não deve haver arremesso.
      if (performance.now() - lastT > 80) state.inertia = 0;
      // Limite de velocidade: um "flick" muito rápido não vira um pião infinito.
      state.inertia = Math.max(-18, Math.min(18, state.inertia));
      root.classList.remove('can-dragging');
      // Quase sem movimento = clique → giro de 360°
      if (moved < TAP_TOLERANCE) spinFlourish();
    };

    // ---------------- mouse / caneta (Pointer Events) ----------------

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // toque é tratado mais abaixo
      mouse = { x: e.clientX, y: e.clientY, target: e.target };
      if (state.dragging) {
        move(e.clientX, e.clientY);
        return;
      }
      setHover(!isInterfaceTarget(e.target) && isOverCan(e.clientX, e.clientY));
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      if (isInterfaceTarget(e.target) || !isOverCan(e.clientX, e.clientY)) return;
      // Cancelar o pointerdown suprime o mousedown → sem seleção de texto
      // enquanto o usuário arrasta sobre títulos e parágrafos.
      e.preventDefault();
      begin(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') end();
    };

    // ---------------- toque (Touch Events) ----------------
    //
    // Pointer Events com toque são cancelados assim que o navegador decide
    // rolar a página. Com Touch Events conseguimos decidir NÓS a intenção:
    //   - movimento predominantemente horizontal → é giro: preventDefault()
    //   - movimento predominantemente vertical   → é scroll: não interferimos

    let touchCandidate = false; // o toque começou sobre a lata?
    let touchDecided = false; // já sabemos se é giro ou scroll?

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchDecided = false;
      touchCandidate =
        e.touches.length === 1 && !isInterfaceTarget(e.target) && isOverCan(t.clientX, t.clientY, 1.15);
      if (touchCandidate) {
        startX = lastX = t.clientX;
        startY = lastY = t.clientY;
        moved = 0;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchCandidate) return;
      const t = e.touches[0];

      if (!touchDecided) {
        const dx = Math.abs(t.clientX - startX);
        const dy = Math.abs(t.clientY - startY);
        if (dx < 8 && dy < 8) return; // ainda ambíguo: espera mais movimento
        touchDecided = true;
        if (dy > dx) {
          touchCandidate = false; // é scroll — devolve o gesto ao navegador
          return;
        }
        begin(startX, startY);
      }

      if (state.dragging) {
        e.preventDefault(); // só possível porque o listener é { passive: false }
        move(t.clientX, t.clientY);
      }
    };

    const onTouchEnd = () => {
      if (state.dragging) end();
      else if (touchCandidate && !touchDecided) spinFlourish(); // toque simples
      touchCandidate = false;
    };

    // ---------------- hover durante o scroll ----------------
    // A lata se move com a rolagem mesmo com o mouse parado. Reavaliar o hover
    // a cada tick do GSAP mantém o cursor "girar" sempre correto.
    const tick = () => {
      if (mouse && !state.dragging) setHover(!isInterfaceTarget(mouse.target) && isOverCan(mouse.x, mouse.y));
    };
    gsap.ticker.add(tick);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', end); // soltar fora da janela
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('blur', end);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      root.classList.remove('can-hover', 'can-dragging');
    };
  }, [enabled]);
}
