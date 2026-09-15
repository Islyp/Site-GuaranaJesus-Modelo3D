/**
 * ============================================================================
 *  sections — mapa dos capítulos da experiência
 * ============================================================================
 *
 * Fonte única da ordem e dos nomes das seções. Usada pela navegação, pelo
 * contador lateral (01 / 06) e pelo tipo SectionId.
 *
 * O `id` precisa ser igual ao id do <section> no HTML e ao do painel de cor
 * na BackgroundLayer (data-bg-panel), e é usado nas âncoras do roteiro 3D
 * (scrollTimeline.ts).
 */
export const SECTIONS = [
  { id: 'hero', label: 'Início', nav: false }, // acessível pelo logo da navegação
  { id: 'historia', label: 'História', nav: true },
  { id: 'sabor', label: 'Sabor', nav: true },
  { id: 'produto', label: 'Produto', nav: true },
  { id: 'maranhao', label: 'Maranhão', nav: true },
  { id: 'final', label: 'Final', nav: false },
] as const; // "as const" → ids viram tipos literais ('hero' | 'historia' | …)

/** União dos ids válidos, derivada automaticamente da lista acima. */
export type SectionId = (typeof SECTIONS)[number]['id'];
