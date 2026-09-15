/**
 * ============================================================================
 *  01 · Hero — abertura
 * ============================================================================
 *
 * Composição editorial em três faixas (grid de 3 linhas):
 *   topo    → categoria + selo oval "desde 1927" (eco do logo da lata)
 *   meio    → "GUARANÁ / JESUS" gigante, à esquerda da lata
 *   base    → headline, subtítulo, dica de interação e indicador de scroll
 *
 * Aqui não há fotografia: a protagonista é a lata 3D, posicionada à direita
 * pelo roteiro (scrollTimeline.ts). Os elementos com data-intro entram na
 * sequência de abertura (playIntro), sem depender de scroll.
 */
import { RevealText } from './RevealText';
import styles from './Hero.module.css';

export function Hero() {
  return (
    // data-theme="light": texto claro sobre o rosa (lido por sectionTransitions)
    <section id="hero" className={styles.hero} data-theme="light">
      <div className={styles.top}>
        <p className="eyebrow" data-intro="fade">
          Refrigerante de guaraná <span className={styles.sep}>/</span> São Luís, MA
        </p>
        <p className={styles.since} data-intro="fade">
          <span className={styles.sinceSmall}>desde</span>
          <span className={styles.sinceYear}>1927</span>
        </p>
      </div>

      {/* Um único <h1> com duas palavras em tamanhos diferentes */}
      <h1 className={styles.title}>
        <RevealText
          as="span"
          mode="intro"
          lines={['Guaraná']}
          className={`display ${styles.guarana}`}
        />
        <RevealText as="span" mode="intro" lines={['Jesus']} className={`display ${styles.jesus}`} />
      </h1>

      <div className={styles.bottom}>
        <div className={styles.headlineWrap}>
          <span className={styles.rule} data-intro="line" />
          <p className={`display ${styles.headline}`} data-intro="fade">
            Um sabor que não passa despercebido.
          </p>
          <p className={`serif ${styles.sub}`} data-intro="fade">
            Do Maranhão para o Brasil.
          </p>
          {/* Dica de interação: o texto certo é escolhido pelo CSS conforme o
              tipo de ponteiro (mouse → "Arraste", toque → "Deslize") */}
          <p className={styles.dragHint} data-intro="fade">
            <span className={styles.dragIcon} aria-hidden="true">
              ‹ ›
            </span>
            <span className={styles.hintFine}>Arraste a lata para girar</span>
            <span className={styles.hintTouch}>Deslize a lata para girar</span>
          </p>
        </div>

        <div className={styles.scroll} data-intro="fade" aria-hidden="true">
          <span className={styles.scrollLine} />
          <span className="eyebrow">Role</span>
        </div>
      </div>
    </section>
  );
}
