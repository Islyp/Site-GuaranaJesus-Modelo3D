/**
 * ============================================================================
 *  BackgroundLayer — cores e grafismos atrás da lata
 * ============================================================================
 *
 * Camada fixa, ATRÁS do canvas 3D. Contém um "painel" por seção, empilhados
 * na mesma ordem da página. Cada painel tem:
 *
 *   ┌ ribbon  faixa de cor de acento que corre à frente na transição
 *   ├ crest   crista orgânica (onda SVG) na borda superior do painel
 *   ├ cor     o fundo da seção
 *   └ art     grafismos da seção, com parallax (data-art-speed / data-art-drift)
 *
 * As animações (subida dos painéis, crista, parallax) ficam em
 * animations/sectionTransitions.ts. Aqui é só a estrutura visual.
 *
 * Por que os grafismos ficam aqui e não nas seções? Para criar PROFUNDIDADE:
 * o que está nesta camada fica atrás da lata. Na seção Sabor, por exemplo,
 * "DIFERENTE." gigante passa por trás da lata, enquanto "O SABOR É" (no HTML)
 * passa na frente: texto → lata → texto → fundo.
 */
import type { CSSProperties, ReactNode } from 'react';
import { Arabesque } from './Arabesque';
import styles from './BackgroundLayer.module.css';

// Curvas desenhadas num viewBox 1440×200 e esticadas para a largura da tela
// (preserveAspectRatio="none"), então funcionam em qualquer resolução.
const CREST_PATH =
  'M0,120 C180,40 320,10 520,60 C720,110 860,150 1060,90 C1220,42 1340,30 1440,70 L1440,200 L0,200 Z';
const RIBBON_PATH =
  'M0,150 C200,70 380,40 600,95 C820,150 980,170 1180,110 C1300,74 1380,70 1440,90 L1440,200 L0,200 Z';

interface PanelProps {
  /** deve bater com o id do <section> correspondente */
  id: string;
  /** cor de fundo do painel (e da crista) */
  color: string;
  /** cor da faixa que antecede a crista na transição */
  accent?: string;
  /** ordem de empilhamento: painéis posteriores cobrem os anteriores */
  index: number;
  children?: ReactNode;
}

function Panel({ id, color, accent, index, children }: PanelProps) {
  return (
    <div className={styles.panel} data-bg-panel={id} style={{ '--panel': color, zIndex: index } as CSSProperties}>
      {/* O primeiro painel (Hero) já começa visível: não tem transição de entrada */}
      {index > 0 && (
        <>
          {accent && (
            <svg data-ribbon className={styles.ribbon} viewBox="0 0 1440 200" preserveAspectRatio="none">
              <path d={RIBBON_PATH} fill={accent} />
            </svg>
          )}
          <svg data-crest className={styles.crest} viewBox="0 0 1440 200" preserveAspectRatio="none">
            <path d={CREST_PATH} fill={color} />
          </svg>
        </>
      )}
      <div className={styles.art}>{children}</div>
    </div>
  );
}

/**
 * Textura de azulejos em linha fina (creme translúcido), com fade radial.
 * <pattern> repete um único ladrilho de 120×120 por toda a área — um SVG
 * leve, independentemente do tamanho da tela.
 */
function AzulejoPattern() {
  return (
    <svg className={styles.azulejos} data-art-speed="0.12" aria-hidden="true">
      <defs>
        <pattern id="azulejo" width="120" height="120" patternUnits="userSpaceOnUse">
          <rect width="120" height="120" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="60" cy="60" r="26" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M60 18 L72 48 L102 60 L72 72 L60 102 L48 72 L18 60 L48 48 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="60" cy="60" r="5" fill="currentColor" />
          <path d="M0 0 Q30 30 0 60 M120 0 Q90 30 120 60 M0 120 Q30 90 0 60 M120 120 Q90 90 120 60" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M0 0 Q30 30 60 0 M0 120 Q30 90 60 120 M120 0 Q90 30 60 0 M120 120 Q90 90 60 120" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
        {/* máscara: o padrão é forte perto do centro-direita e some nas bordas */}
        <radialGradient id="azulejoFade" cx="70%" cy="45%" r="70%">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="azulejoMask">
          <rect width="100%" height="100%" fill="url(#azulejoFade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#azulejo)" mask="url(#azulejoMask)" />
    </svg>
  );
}

/**
 * Parede de azulejos azul e branco, como nas fachadas do centro histórico de
 * São Luís (Patrimônio Mundial). O desenho da embalagem também se inspira neles.
 */
function AzulejoTiles() {
  return (
    <svg className={styles.tiles} aria-hidden="true">
      <defs>
        <pattern id="azulejoAzul" width="96" height="96" patternUnits="userSpaceOnUse">
          {/* base esmaltada + rejunte */}
          <rect width="96" height="96" fill="#f4f1ea" />
          <rect x="0.5" y="0.5" width="95" height="95" fill="none" stroke="#d9d3c6" />
          {/* flor central com miolo rosa (eco da cor da marca) */}
          <circle cx="48" cy="48" r="20" fill="none" stroke="#2a4a9f" strokeWidth="3" />
          <path d="M48 14 L57 39 L82 48 L57 57 L48 82 L39 57 L14 48 L39 39 Z" fill="#2a4a9f" />
          <circle cx="48" cy="48" r="6" fill="#f4f1ea" />
          <circle cx="48" cy="48" r="3" fill="#e84b85" />
          {/* cantos: ao juntar 4 azulejos, formam uma segunda flor */}
          <path d="M0 0 Q20 4 24 24 Q4 20 0 0Z M96 0 Q76 4 72 24 Q92 20 96 0Z M0 96 Q20 92 24 72 Q4 76 0 96Z M96 96 Q76 92 72 72 Q92 76 96 96Z" fill="#2a4a9f" />
          <circle cx="48" cy="4" r="2.5" fill="#2a4a9f" />
          <circle cx="48" cy="92" r="2.5" fill="#2a4a9f" />
          <circle cx="4" cy="48" r="2.5" fill="#2a4a9f" />
          <circle cx="92" cy="48" r="2.5" fill="#2a4a9f" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#azulejoAzul)" />
    </svg>
  );
}

export function BackgroundLayer() {
  return (
    <div className={styles.layer} aria-hidden="true">
      {/* 01 — HERO · rosa intenso: raios de sol, anel e medalhão de arabescos */}
      <Panel id="hero" color="var(--rosa)" index={0}>
        <div className={styles.heroGlow} />
        <div className={styles.sunburst} data-art-speed="0.08" />
        <div className={styles.heroRing} data-art-speed="0.15" />
        <div className={styles.heroMedallion} data-art-speed="0.05">
          <Arabesque variant="medallion" azul="var(--azul)" rosa="var(--creme)" />
        </div>
      </Panel>

      {/* 02 — HISTÓRIA · creme: grade editorial e "1927" gigante */}
      <Panel id="historia" color="var(--creme)" accent="var(--azul)" index={1}>
        <div className={styles.grid} />
        <span className={styles.bigYear} data-art-speed="0.25">
          1927
        </span>
      </Panel>

      {/* 03 — SABOR · magenta: formas orgânicas e "DIFERENTE." atrás da lata */}
      <Panel id="sabor" color="var(--magenta)" accent="var(--rosa-claro)" index={2}>
        <div className={`${styles.blob} ${styles.blobA}`} data-art-speed="0.2" />
        <div className={`${styles.blob} ${styles.blobB}`} data-art-speed="0.35" />
        <span className={styles.giantWord} data-art-drift="18">
          Diferente.
        </span>
      </Panel>

      {/* 04 — PRODUTO · rosa claro: luz de vitrine e anéis concêntricos */}
      <Panel id="produto" color="var(--rosa-claro)" accent="var(--azul)" index={3}>
        <div className={styles.spotlight} />
        <div className={styles.rings}>
          <span />
          <span />
          <span />
        </div>
      </Panel>

      {/* 05 — MARANHÃO · vermelho: azulejos e fitas de bumba-meu-boi */}
      <Panel id="maranhao" color="var(--vermelho)" accent="var(--magenta)" index={4}>
        <AzulejoPattern />
        <div className={styles.tileWall} data-art-speed="0.3">
          <AzulejoTiles />
        </div>
        <div className={styles.fitas}>
          {/* --i defasa o balanço de cada fita (animation-delay no CSS) */}
          {['#f4ebdd', '#e5177b', '#f2b233', '#2f8f4e', '#1d4ea8', '#f7cadb', '#f4ebdd'].map((c, i) => (
            <span key={i} style={{ '--c': c, '--i': i } as CSSProperties} />
          ))}
        </div>
      </Panel>

      {/* 06 — FINAL · vinho quase preto: brilho e feixes de luz de palco */}
      <Panel id="final" color="var(--vinho)" accent="var(--azul-escuro)" index={5}>
        <div className={styles.finalGlow} />
        <div className={styles.beams} />
      </Panel>
    </div>
  );
}
