/**
 * ============================================================================
 *  04 · Produto — "Um ícone em uma lata."
 * ============================================================================
 *
 * Seção "presa" (sticky) com 300% da altura da tela. Enquanto o usuário rola:
 *   - a lata, centralizada, dá uma volta completa mostrando toda a embalagem
 *     (definido no roteiro 3D, scrollTimeline.ts);
 *   - quatro legendas surgem uma a uma ao redor dela, com linhas-guia que se
 *     desenham em direção à lata;
 *   - no fim, entram as especificações (350 ml · alumínio · sirva gelado).
 *
 * Tudo com scrub: o progresso das legendas é o progresso do scroll dentro da
 * seção — voltar a rolagem as recolhe na ordem inversa.
 */
import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { RevealText } from './RevealText';
import styles from './ProductSection.module.css';

/** Legendas ao redor da lata; `className` define a posição de cada uma. */
const CALLOUTS = [
  { label: 'Identidade', text: 'O rosa que se reconhece de longe, em qualquer prateleira.', className: styles.c1 },
  { label: 'Maranhão', text: 'Nascido em São Luís, com sotaque de origem.', className: styles.c2 },
  { label: 'Sabor', text: 'Doce, perfumado e inconfundível.', className: styles.c3 },
  { label: 'Personalidade', text: 'Uma lata que não pede licença.', className: styles.c4 },
];

export function ProductSection() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    // gsap.context com escopo em `root`: os seletores abaixo só encontram
    // elementos desta seção, e ctx.revert() desfaz tudo ao desmontar
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>('[data-callout]');

      // Timeline de duração relativa (0 → 1) amarrada ao trecho em que a
      // seção está presa: do topo da seção no topo da tela até o fim dela.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      });

      // Cada legenda ocupa uma "janela" de 20% da timeline: primeiro a linha
      // se desenha, logo depois número, título e texto sobem das máscaras.
      items.forEach((item, i) => {
        const line = item.querySelector('[data-callout-line]');
        const content = item.querySelectorAll('[data-callout-text]');
        const at = 0.08 + i * 0.2;
        tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.1, ease: 'power2.out' }, at)
          .fromTo(content, { yPercent: 110 }, { yPercent: 0, duration: 0.1, stagger: 0.02, ease: 'power3.out' }, at + 0.04);
      });
      // especificações no trecho final (90%)
      tl.fromTo('[data-spec]', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.08, stagger: 0.02 }, 0.9);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="produto" ref={root} className={styles.product} data-theme="dark">
      <div className={styles.sticky}>
        <div className={styles.head}>
          <p className={`eyebrow ${styles.index}`} data-reveal="fade">
            04 — Produto
          </p>
          <RevealText
            as="h2"
            className={`display ${styles.title}`}
            lines={['Um ícone', 'em uma lata.']}
            start="top 70%"
          />
        </div>

        {CALLOUTS.map((c, i) => (
          <div key={c.label} className={`${styles.callout} ${c.className}`} data-callout>
            <span className={styles.line} data-callout-line />
            <div className={styles.calloutBody}>
              <span className="reveal-mask">
                <span className={`reveal-inner ${styles.num}`} data-callout-text>
                  0{i + 1}
                </span>
              </span>
              <span className="reveal-mask">
                <span className={`display reveal-inner ${styles.label}`} data-callout-text>
                  {c.label}
                </span>
              </span>
              <span className="reveal-mask">
                <span className={`reveal-inner ${styles.text}`} data-callout-text>
                  {c.text}
                </span>
              </span>
            </div>
          </div>
        ))}

        <ul className={styles.specs}>
          <li data-spec>350 ml</li>
          <li data-spec>Alumínio reciclável</li>
          <li data-spec>Sirva gelado</li>
        </ul>
      </div>
    </section>
  );
}
