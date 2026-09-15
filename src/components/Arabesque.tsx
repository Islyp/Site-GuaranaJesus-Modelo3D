/**
 * ============================================================================
 *  Arabesque — os arabescos da lata como grafismo da página
 * ============================================================================
 *
 * Renderiza em SVG exatamente os mesmos caminhos usados no rótulo 3D
 * (gerados por three/ornament.ts). Isso amarra a identidade: o ornamento que
 * aparece na lata girando é o mesmo do divisor da seção História e do
 * medalhão atrás da lata no Hero.
 *
 * As cores são parametrizáveis (CSS variables), então o mesmo desenho
 * funciona em azul/rosa sobre creme ou azul/creme sobre rosa.
 */
import { useMemo, type CSSProperties } from 'react';
import { ornamentMotif, ORNAMENT_VIEWBOX } from '../three/ornament';

interface Props {
  /** "motif" = meio arabesco · "medallion" = motivo + espelho vertical (como na lata) */
  variant?: 'motif' | 'medallion';
  /** cor aplicada às formas "azuis" do motivo */
  azul?: string;
  /** cor aplicada às formas "rosa" do motivo */
  rosa?: string;
  className?: string;
  style?: CSSProperties;
  /** repassa data-attributes (ex.: data-reveal) para o <svg> */
  [data: `data-${string}`]: string | number | undefined;
}

export function Arabesque({ variant = 'motif', azul = 'var(--azul)', rosa = 'var(--rosa)', className, style, ...rest }: Props) {
  // A geração dos caminhos envolve centenas de pontos: calculamos uma vez só
  const top = useMemo(() => ornamentMotif(0), []);
  const bottom = useMemo(() => ornamentMotif(1), []);
  const fill = (c: 'azul' | 'rosa') => (c === 'azul' ? azul : rosa);

  const medallion = variant === 'medallion';
  // O medalhão empilha dois motivos (100 unidades cada) → viewBox com o dobro da altura
  const viewBox = medallion ? '-52 -2 104 206' : ORNAMENT_VIEWBOX;

  return (
    <svg className={className} style={style} viewBox={viewBox} aria-hidden="true" {...rest}>
      {top.map((s, i) => (
        <path key={`t${i}`} d={s.d} fill={fill(s.color)} />
      ))}
      {medallion && (
        // segundo motivo espelhado na vertical, encostado embaixo do primeiro
        <g transform="translate(0 202) scale(1 -1)">
          {bottom.map((s, i) => (
            <path key={`b${i}`} d={s.d} fill={fill(s.color)} />
          ))}
        </g>
      )}
    </svg>
  );
}
