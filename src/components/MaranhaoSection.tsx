/**
 * ============================================================================
 *  05 · Maranhão — "Uma história que começa no Maranhão."
 * ============================================================================
 *
 * A seção emocional. Em vez de fotos de banco de imagens, uma composição
 * gráfica com referências culturais de São Luís (na BackgroundLayer):
 * azulejos portugueses azul e branco e fitas coloridas do bumba-meu-boi.
 *
 * Neste componente:
 *   - coordenadas geográficas de São Luís como detalhe editorial;
 *   - título em três linhas escalonadas;
 *   - texto + slogan oficial da marca ("O sabor de viver o Maranhão");
 *   - faixa de palavras que atravessa a tela conforme o scroll.
 *
 * Enquanto isso, a lata cruza a tela na diagonal (roteiro 3D).
 */
import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { RevealText } from './RevealText';
import styles from './MaranhaoSection.module.css';

/** Palavras da faixa: lugares e símbolos culturais do Maranhão. */
const WORDS = ['São Luís', 'Ilha do Amor', 'Bumba-meu-boi', 'Azulejos', 'Reggae', 'Lençóis', 'Guaraná Jesus'];

export function MaranhaoSection() {
  const root = useRef<HTMLElement>(null);
  const band = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!root.current || !band.current) return;
    const ctx = gsap.context(() => {
      // faixa de palavras atravessa a tela conforme o scroll (e volta ao subir)
      gsap.fromTo(
        band.current,
        { xPercent: 0 },
        {
          xPercent: -50,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
        }
      );
    }, root);
    return () => ctx.revert();
  }, []);

  // A lista é duplicada e a faixa anda exatamente -50%: o fim da animação
  // mostra a mesma sequência do início, sem "buraco" no lado direito.
  const loop = [...WORDS, ...WORDS];

  return (
    <section id="maranhao" ref={root} className={styles.maranhao} data-theme="light">
      <div className={styles.meta}>
        <p className="eyebrow" data-reveal="fade">
          05 — Maranhão
        </p>
        <p className="eyebrow" data-reveal="fade" data-delay="0.1">
          2°31′S · 44°18′W
        </p>
      </div>

      <RevealText
        as="h2"
        className={`display ${styles.title}`}
        lineClassName={styles.titleLine}
        lines={['Uma história', 'que começa', 'no Maranhão.']}
      />

      <div className={styles.text}>
        <span className={styles.rule} data-reveal="line" />
        <p data-reveal="fade">
          Azulejos nas fachadas do centro histórico de São Luís, o brilho bordado do bumba-meu-boi, o balanço da Ilha do
          Amor. O Guaraná Jesus carrega esse jeito maranhense de celebrar: alegre, colorido e cheio de orgulho.
        </p>
        <p className={`serif ${styles.quote}`} data-reveal="fade" data-delay="0.15">
          “O sabor de viver o Maranhão.”
        </p>
      </div>

      <div className={styles.bandWrap} aria-hidden="true">
        <div ref={band} className={styles.band}>
          {loop.map((w, i) => (
            <span key={i} className={i % 2 ? 'serif' : 'display'}>
              {w}
              <i>✦</i>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
