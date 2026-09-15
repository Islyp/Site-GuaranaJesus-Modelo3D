/**
 * ============================================================================
 *  CameraRig — a câmera como personagem discreto
 * ============================================================================
 *
 * A câmera participa da narrativa sem competir com a lata:
 *  - scroll: aproxima (dolly-in) nas cenas de impacto e afasta nas cenas
 *    contemplativas, com leves deslocamentos laterais (valores em scenePose);
 *  - mouse: um parallax de poucos centímetros que dá sensação de
 *    profundidade, quase imperceptível.
 *
 * Todo movimento passa por `damp` (amortecimento exponencial), então a câmera
 * nunca dá trancos, mesmo quando o scroll muda de direção bruscamente.
 */
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { scenePose } from '../animations/scrollTimeline';
import { pointer } from '../state/pointer';

const lookTarget = new THREE.Vector3();
const damp = THREE.MathUtils.damp;

export function CameraRig() {
  // posição atual (suavizada) da câmera
  const current = useRef({ x: 0, y: 0, z: 6 });

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const p = scenePose;
    const c = current.current;

    // alvo = posição do roteiro + parallax do mouse
    c.x = damp(c.x, p.camX + pointer.x * 0.22, 3, dt);
    c.y = damp(c.y, p.camY + pointer.y * 0.14, 3, dt);
    c.z = damp(c.z, p.camZ, 3, dt);

    camera.position.set(c.x, c.y, c.z);

    // A câmera olha para um ponto que se move MENOS que ela (35%). Isso cria
    // uma leve mudança de ângulo — perspectiva de verdade, não só translação.
    lookTarget.set(p.camX * 0.35, p.camY * 0.35, 0);
    camera.lookAt(lookTarget);
  });

  // Componente "sem visual": só controla a câmera padrão do Canvas
  return null;
}
