/**
 * ============================================================================
 *  06 · Final — encerramento de filme
 * ============================================================================
 *
 * Fundo vinho quase preto, lata grande e inclinada (parando com o logo de
 * frente) e três recursos de linguagem cinematográfica:
 *
 *   - LETTERBOX: faixas pretas que entram no topo e na base, como a mudança
 *     de proporção de tela no final de um filme. Elas têm a mesma altura da
 *     navegação, para os links ficarem inteiros dentro da faixa superior.
 *   - título monumental "GUARANÁ / JESUS", dimensionado também pela ALTURA da
 *     tela para nunca entrar sob as faixas em monitores baixos;
 *   - créditos no rodapé, sobre a faixa inferior.
 *
 * CTA: "Conheça a história" leva de volta à seção 02 — o filme pode ser
 * assistido de novo.
 */
import { useLayoutEffect, useRef, type MouseEvent } from 'react';
import { gsap } from 'gsap';
import { scrollToTarget } from '../animations/smoothScroll';
import { RevealText } from './RevealText';
import styles from './FinalSection.module.css';

export function FinalSection() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-letterbox]',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'power2.inOut',
          // completa quando a seção cobre a tela (não depende de chegar ao fim da página)
          scrollTrigger: { trigger: root.current, start: 'top 60%', end: 'top top', scrub: true },
        }
      );
    }, root);
    return () => ctx.revert();
  }, []);

  const toStory = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    scrollToTarget('#historia');
  };

  return (
    <section id="final" ref={root} className={styles.final} data-theme="light">
      {/* Faixas de cinema: position fixed (cobrem a tela, não a seção) e
          scaleY animado a partir da borda da tela */}
      <span className={`${styles.bar} ${styles.barTop}`} data-letterbox aria-hidden="true" />
      <span className={`${styles.bar} ${styles.barBottom}`} data-letterbox aria-hidden="true" />

      <div className={styles.inner}>
        <p className={`eyebrow ${styles.index}`} data-reveal="fade">
          06 — Fim?
        </p>

        <h2 className={styles.title}>
          <RevealText as="span" lines={['Guaraná']} className={`display ${styles.guarana}`} />
          <RevealText as="span" lines={['Jesus']} className={`display ${styles.jesus}`} delay={0.1} />
        </h2>

        <div className={styles.bottom}>
          <p className={`display ${styles.sub}`} data-reveal="fade">
            Um sabor que você <br />
            não esquece.
          </p>

          <a href="#historia" className={styles.cta} onClick={toStory} data-reveal="fade" data-delay="0.1">
            <span>Conheça a história</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </a>
        </div>
      </div>

      <footer className={styles.credits}>
        <span>Guaraná Jesus — uma experiência digital de marca</span>
        <span>Maranhão · Brasil</span>
        <span>Conceito · modelo 3D ilustrativo</span>
      </footer>
    </section>
  );
}
