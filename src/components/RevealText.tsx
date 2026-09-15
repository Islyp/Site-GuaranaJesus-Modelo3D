/**
 * ============================================================================
 *  RevealText — texto preparado para "mask reveal"
 * ============================================================================
 *
 * Quebra um título em linhas e palavras, envolvendo cada palavra em duas
 * camadas:
 *
 *   <span class="reveal-mask">      ← janela com overflow: hidden (parada)
 *     <span class="reveal-inner">   ← conteúdo que o GSAP move de baixo p/ cima
 *       Palavra
 *
 * O resultado é o efeito editorial de palavras "surgindo de dentro de uma
 * fenda". A animação em si fica em textAnimations.ts.
 *
 * Acessibilidade: leitores de tela recebem o texto inteiro via aria-label no
 * elemento principal; as dezenas de <span> internos ficam aria-hidden, para
 * não serem lidos palavra por palavra.
 *
 * Uso:
 *   <RevealText as="h2" lines={['Do Maranhão', 'para o Brasil']} />
 */
import type { CSSProperties } from 'react';

interface Props {
  /** Uma string por linha visual (a quebra de linha é intencional/editorial) */
  lines: string[];
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span';
  className?: string;
  /** classe aplicada a cada linha (ex.: recuo ou cor diferente na 2ª linha) */
  lineClassName?: string;
  /** "words" → revela ao entrar no scroll · "intro" → revela na abertura da página */
  mode?: 'words' | 'intro';
  /** atraso da animação, em segundos */
  delay?: number;
  /** ponto de disparo no scroll (sintaxe do ScrollTrigger, ex.: "top 70%") */
  start?: string;
  style?: CSSProperties;
}

export function RevealText({
  lines,
  as: Tag = 'p',
  className,
  lineClassName,
  mode = 'words',
  delay,
  start,
  style,
}: Props) {
  const label = lines.join(' ');

  // Os data-attributes são o "contrato" com textAnimations.ts
  const dataProps =
    mode === 'intro'
      ? { 'data-intro': 'title' }
      : { 'data-reveal': 'words', 'data-delay': delay, 'data-start': start };

  return (
    <Tag className={className} aria-label={label} style={style} {...dataProps}>
      {lines.map((line, li) => (
        <span key={li} className={lineClassName} style={{ display: 'block' }} aria-hidden="true">
          {line.split(' ').map((word, wi, arr) => (
            <span key={wi} className="reveal-mask">
              <span className="reveal-inner">
                {word}
                {/* espaço não separável DENTRO da máscara: mantém o espaçamento
                    entre palavras mesmo com cada palavra em um inline-block */}
                {wi < arr.length - 1 ? ' ' : ''}
              </span>
            </span>
          ))}
        </span>
      ))}
    </Tag>
  );
}
