/**
 * ============================================================================
 *  PageContent — a narrativa, na ordem em que é contada
 * ============================================================================
 *
 *   01 Hero      rosa         impacto: "um sabor que não passa despercebido"
 *   02 História  creme        origem: do Maranhão para o Brasil
 *   03 Sabor     magenta      personalidade: tipografia gigante em camadas
 *   04 Produto   rosa claro   a lata como ícone (seção "presa" com legendas)
 *   05 Maranhão  vermelho     emoção: azulejos, bumba-meu-boi, slogan
 *   06 Final     vinho        encerramento de filme, com faixas de cinema
 *
 * Cada seção cuida apenas do seu conteúdo HTML. A cor de fundo, a lata e a
 * câmera são controladas globalmente (BackgroundLayer + scrollTimeline).
 */
import { Hero } from './Hero';
import { StorySection } from './StorySection';
import { FlavorSection } from './FlavorSection';
import { ProductSection } from './ProductSection';
import { MaranhaoSection } from './MaranhaoSection';
import { FinalSection } from './FinalSection';

export function PageContent() {
  return (
    <>
      <Hero />
      <StorySection />
      <FlavorSection />
      <ProductSection />
      <MaranhaoSection />
      <FinalSection />
    </>
  );
}
