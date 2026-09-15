/**
 * ============================================================================
 *  Navbar — navegação minimalista fixa
 * ============================================================================
 *
 * - Logo tipográfico "GUARANÁ Jesus" (volta ao topo).
 * - Links para os capítulos, com o capítulo atual sublinhado.
 * - No celular, os links dão lugar ao nome do capítulo atual.
 *
 * A cor da navegação não é definida aqui: ela herda --ink, variável que muda
 * conforme o tema da seção ativa (clara/escura). Assim a navegação permanece
 * legível sobre rosa, creme, vermelho ou vinho, sem lógica extra.
 */
import type { MouseEvent } from 'react';
import { scrollToTarget } from '../animations/smoothScroll';
import { SECTIONS, type SectionId } from './sections';
import styles from './Navbar.module.css';

export function Navbar({ active }: { active: SectionId }) {
  // Links continuam sendo <a href="#…"> (funcionam sem JS e são acessíveis),
  // mas com JS a rolagem passa pelo Lenis, mantendo a animação sincronizada.
  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    scrollToTarget(id === 'hero' ? 0 : `#${id}`);
  };

  const current = SECTIONS.find((s) => s.id === active);

  return (
    <header className={styles.nav}>
      {/* data-intro="fade": aparece na sequência de abertura (textAnimations.ts) */}
      <a href="#hero" className={styles.brand} onClick={(e) => go(e, 'hero')} data-intro="fade">
        Guaraná <span>Jesus</span>
      </a>

      <nav aria-label="Navegação principal" className={styles.links} data-intro="fade">
        {SECTIONS.filter((s) => s.nav).map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => go(e, s.id)}
            className={s.id === active ? styles.active : undefined}
            // aria-current informa ao leitor de tela qual capítulo está em foco
            aria-current={s.id === active ? 'true' : undefined}
          >
            {s.label}
          </a>
        ))}
      </nav>

      {/* só no mobile (via CSS) */}
      <span className={styles.mobileLabel} aria-hidden="true">
        {current?.label}
      </span>
    </header>
  );
}
