/**
 * ============================================================================
 *  ScrollProgress — indicador de progresso
 * ============================================================================
 *
 * Uma linha vertical discreta na lateral direita com o contador de capítulo
 * ("02 … 06"), no espírito de uma timecode de filme.
 *
 * Performance: a linha é atualizada ~60×/s, mas sem re-render do React.
 * O componente assina o scrollStore e escreve o transform direto no DOM.
 * Só o número do capítulo depende de props (muda poucas vezes por página).
 */
import { useEffect, useRef } from 'react';
import { subscribeScroll } from '../state/scrollStore';
import { SECTIONS, type SectionId } from './sections';
import styles from './ScrollProgress.module.css';

export function ScrollProgress({ active }: { active: SectionId }) {
  const fill = useRef<HTMLSpanElement>(null);
  const index = SECTIONS.findIndex((s) => s.id === active);

  useEffect(
    () =>
      subscribeScroll(({ progress }) => {
        // scaleY em vez de height: transform é composto na GPU, sem reflow
        if (fill.current) fill.current.style.transform = `scaleY(${progress})`;
      }),
    []
  );

  return (
    <div className={styles.progress} aria-hidden="true" data-intro="fade">
      <span className={styles.count}>{String(index + 1).padStart(2, '0')}</span>
      <span className={styles.track}>
        <span ref={fill} className={styles.fill} />
      </span>
      <span className={styles.count}>{String(SECTIONS.length).padStart(2, '0')}</span>
    </div>
  );
}
