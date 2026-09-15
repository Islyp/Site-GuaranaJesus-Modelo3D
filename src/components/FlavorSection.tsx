/**
 * ============================================================================
 *  03 · Sabor — "O sabor é diferente."
 * ============================================================================
 *
 * A seção mais ousada: tipografia gigante distribuída em PLANOS diferentes,
 * para a lata parecer estar "entre" as palavras.
 *
 *   frente   "O SABOR é"          → este componente (HTML, acima do canvas)
 *   meio     a lata 3D            → canvas
 *   fundo    "DIFERENTE." gigante → BackgroundLayer (atrás do canvas)
 *
 * Estrutura "sticky": a seção tem 220% da altura da tela, mas o conteúdo fica
 * preso enquanto o usuário rola. Nesse tempo, a palavra de fundo desliza na
 * horizontal e as etiquetas se movem em velocidades diferentes (parallax).
 */
import styles from './FlavorSection.module.css';

/** Etiquetas flutuantes: `speed` diferente em cada uma = profundidades diferentes. */
const TAGS = [
  { word: 'Doce', className: styles.tagA, speed: 0.9 },
  { word: 'Cravo', className: styles.tagB, speed: 0.4 },
  { word: 'Canela', className: styles.tagC, speed: 1.2 },
  { word: 'Rosa', className: styles.tagD, speed: 0.65 },
];

export function FlavorSection() {
  return (
    <section id="sabor" className={styles.flavor} data-theme="light">
      <div className={styles.sticky}>
        {/* A frase visual está quebrada em camadas (e metade dela no fundo);
            leitores de tela recebem a frase inteira neste título oculto */}
        <h2 className={styles.srOnly}>O sabor é diferente.</h2>

        <p className={`eyebrow ${styles.index}`} data-reveal="fade">
          03 — Personalidade
        </p>

        <div className={styles.front} aria-hidden="true" data-reveal="words" data-start="top 75%">
          <span className="reveal-mask">
            <span className={`display reveal-inner ${styles.o}`} data-flavor-word>
              O sabor
            </span>
          </span>
          <span className="reveal-mask">
            <span className={`serif reveal-inner ${styles.e}`} data-flavor-word>
              é
            </span>
          </span>
        </div>

        {TAGS.map((t) => (
          <span key={t.word} className={`${styles.tag} ${t.className}`} data-parallax={t.speed} aria-hidden="true">
            {t.word}
          </span>
        ))}

        <div className={styles.copy}>
          <p data-reveal="fade">
            Doce, perfumado, com notas que lembram cravo e canela. Não tenta ser igual a nenhum outro — e é exatamente
            por isso que ninguém esquece.
          </p>
          <p className={`serif ${styles.sign}`} data-reveal="fade" data-delay="0.15">
            Nada tem gosto de Jesus.
          </p>
        </div>
      </div>
    </section>
  );
}
