/**
 * ============================================================================
 *  02 · História — "Do Maranhão para o Brasil"
 * ============================================================================
 *
 * Fundo creme, layout editorial assimétrico: o conteúdo começa a 30% da
 * largura, deixando a coluna esquerda livre para a lata (pequena e distante
 * nesta cena). Elementos:
 *   - título em duas linhas, a segunda recuada e em azul (Maranhão → Brasil)
 *   - carimbo circular girando, com parallax próprio
 *   - frase de apoio em serifada itálica
 *   - divisor com o arabesco da embalagem
 *   - três "fatos" numerados
 *
 * Fontes históricas: criação em 1927, em São Luís, pelo farmacêutico
 * Jesus Norberto Gomes (algumas fontes citam apenas "anos 1920").
 */
import { RevealText } from './RevealText';
import { Arabesque } from './Arabesque';
import styles from './StorySection.module.css';

/** Conteúdo dos fatos separado do JSX: fácil de revisar e traduzir. */
const FACTS = [
  { big: '1927', text: 'A fórmula nasce em São Luís, no laboratório do farmacêutico Jesus Norberto Gomes.' },
  { big: 'Rosa', text: 'Uma cor que deixou de ser detalhe e virou assinatura.' },
  { big: 'Gerações', text: 'Da mesa de domingo às festas de rua: um sabor passado adiante.' },
];

export function StorySection() {
  return (
    <section id="historia" className={styles.story} data-theme="dark">
      <div className={styles.head}>
        <p className={`eyebrow ${styles.index}`} data-reveal="fade">
          02 — História
        </p>
        <RevealText
          as="h2"
          className={`display ${styles.title}`}
          lineClassName={styles.titleLine}
          lines={['Do Maranhão', 'para o Brasil']}
        />
      </div>

      <div className={styles.body}>
        {/* Carimbo: texto seguindo um caminho circular (<textPath>) que gira
            via CSS, enquanto o conjunto se desloca com o scroll (parallax) */}
        <div className={styles.stamp} data-parallax="0.35" aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <defs>
              <path id="stampCircle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
            </defs>
            <text>
              <textPath href="#stampCircle">DESDE 1927 • SÃO LUÍS • MARANHÃO • GUARANÁ JESUS •</textPath>
            </text>
          </svg>
          <span className="serif">J</span>
        </div>

        <RevealText
          as="p"
          className={`serif ${styles.lead}`}
          lines={['Um sabor que nasceu no Maranhão', 'e conquistou diferentes gerações.']}
        />
      </div>

      <div className={styles.divider}>
        <span className={styles.rule} data-reveal="line" />
        <Arabesque className={styles.dividerOrnament} data-reveal="fade" />
      </div>

      <ol className={styles.facts}>
        {FACTS.map((f, i) => (
          // delay escalonado: os fatos entram um após o outro
          <li key={f.big} data-reveal="fade" data-delay={i * 0.12}>
            <span className={styles.factNum}>0{i + 1}</span>
            <span className={`display ${styles.factBig}`}>{f.big}</span>
            <p>{f.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
