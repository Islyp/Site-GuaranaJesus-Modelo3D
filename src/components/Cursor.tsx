/**
 * ============================================================================
 *  Cursor — cursor customizado (apenas desktop)
 * ============================================================================
 *
 * Duas peças com velocidades diferentes, o que dá sensação de peso:
 *  - ponto: segue o mouse quase instantaneamente (0.12 s)
 *  - anel:  segue com atraso suave (0.5 s)
 *
 * Estados:
 *  - sobre links/botões → o anel expande
 *  - sobre a lata       → o anel vira um círculo azul com "girar"
 *  - arrastando a lata  → o círculo se contrai e inverte as cores
 *
 * Só é ativado em dispositivos com ponteiro preciso (pointer: fine); em
 * telas de toque o cursor nativo (inexistente) é mantido.
 */
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { canInteraction } from '../state/canInteraction';
import styles from './Cursor.module.css';

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine || !dot.current || !ring.current) return;

    // Esconde o cursor nativo (ver globals.css → html.has-cursor)
    document.documentElement.classList.add('has-cursor');

    // quickTo cria "setters" otimizados: reaproveitam o mesmo tween em vez de
    // criar um novo a cada evento de mouse
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.5, ease: 'power3' });
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.5, ease: 'power3' });

    // o ponteiro está sobre algo clicável?
    let interactive = false;

    const onMove = (e: PointerEvent) => {
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      interactive = Boolean((e.target as HTMLElement).closest('a, button, [data-cursor]'));
    };

    // Os estados visuais são sincronizados a cada tick, e não só no movimento
    // do mouse: a lata pode passar por baixo de um cursor parado (scroll), e
    // o fim do arraste acontece no pointerup.
    const sync = () => {
      const overCan = !interactive && (canInteraction.hovering || canInteraction.dragging);
      ring.current?.classList.toggle(styles.hover, interactive);
      dot.current?.classList.toggle(styles.hover, interactive || overCan);
      ring.current?.classList.toggle(styles.can, overCan);
      ring.current?.classList.toggle(styles.grabbing, canInteraction.dragging);
    };
    gsap.ticker.add(sync);

    // Some ao sair da janela, reaparece ao voltar
    const onLeave = () => gsap.to([dot.current, ring.current], { autoAlpha: 0, duration: 0.3 });
    const onEnter = () => gsap.to([dot.current, ring.current], { autoAlpha: 1, duration: 0.3 });

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    window.addEventListener('pointerup', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerenter', onEnter);
    return () => {
      gsap.ticker.remove(sync);
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      window.removeEventListener('pointerup', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerenter', onEnter);
    };
  }, []);

  return (
    <>
      <div ref={ring} className={styles.ring} aria-hidden="true">
        {/* visível só no estado "sobre a lata" */}
        <span className={styles.label}>girar</span>
      </div>
      <div ref={dot} className={styles.dot} aria-hidden="true" />
    </>
  );
}
