/**
 * ============================================================================
 *  useMediaQuery — media queries do CSS dentro do React
 * ============================================================================
 *
 * Retorna true/false para uma media query e se atualiza sozinho quando ela
 * muda (girar o celular, redimensionar a janela, ativar "reduzir movimento"
 * nas configurações do sistema).
 *
 * As queries ficam exportadas como constantes para que JS e CSS usem
 * exatamente o mesmo breakpoint (767px também aparece nos *.module.css).
 */
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string) {
  // Valor inicial lido de forma síncrona: evita um primeiro render "errado"
  // (ex.: montar a timeline de desktop e trocá-la logo em seguida no celular).
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Celulares: layout empilhado e roteiro 3D próprio. */
export const MOBILE_QUERY = '(max-width: 767px)';

/** Acessibilidade: usuário pediu menos movimento no sistema operacional. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
