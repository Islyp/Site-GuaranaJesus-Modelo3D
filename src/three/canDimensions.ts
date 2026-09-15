/**
 * ============================================================================
 *  canDimensions — contrato entre o modelo 3D e o resto do projeto
 * ============================================================================
 *
 * Constantes compartilhadas pelo placeholder, pelo carregador de GLB e pela
 * lógica de interação. Mudar o modelo 3D não exige mexer no roteiro de
 * animação, desde que ele respeite estas referências.
 */

/**
 * Altura de referência da lata no mundo 3D (≈ 124 mm, 1 unidade = 100 mm).
 * O placeholder é construído nessa altura e o GLB é escalado para ela.
 */
export const CAN_HEIGHT = 1.24;

/**
 * Caminho do modelo final. Basta colocar o arquivo em /public/models/ —
 * a troca pelo placeholder é automática (ver GuaranaCan.tsx).
 */
export const CAN_MODEL_URL = '/models/guarana-jesus-can.glb';

/**
 * Arte oficial planificada do rótulo (opcional). Se existir em
 * /public/textures/, substitui o rótulo desenhado por código
 * (ver labelTexture.ts).
 */
export const LABEL_TEXTURE_URL = '/textures/guarana-jesus-label.png';
