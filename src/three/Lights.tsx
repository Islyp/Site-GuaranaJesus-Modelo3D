/**
 * ============================================================================
 *  Lights — iluminação de estúdio para produto
 * ============================================================================
 *
 * A iluminação imita uma foto publicitária de lata:
 *
 *  - ENVIRONMENT com Lightformers: um "estúdio virtual" com softboxes em
 *    faixa. Metais não têm cor própria, eles refletem o ambiente — são essas
 *    faixas que desenham os reflexos verticais longos no corpo cilíndrico.
 *    Tudo é gerado localmente (sem baixar HDRIs), então funciona offline.
 *
 *  - LUZES DIRETAS, cujas intensidades seguem o roteiro do scroll:
 *      key   luz principal, frontal-superior (volume e leitura do rótulo)
 *      rimL  recorte rosa por trás à esquerda (contorno da silhueta)
 *      rimR  recorte suave por trás à direita
 *      fill  hemisfério: céu rosado / chão vinho (preenche as sombras)
 *      glow  ponto rosa abaixo da lata (brilho de "vitrine")
 *
 * O parâmetro `warmth` do roteiro esquenta a luz em cenas emocionais
 * (Maranhão, Final) — a temperatura de cor também conta a história.
 */
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { scenePose } from '../animations/scrollTimeline';

// Cores pré-alocadas: interpoladas a cada frame sem criar objetos novos
const ROSA = new THREE.Color('#ff4fa3');
const VERMELHO = new THREE.Color('#ff3b2f');
const KEY_NEUTRO = new THREE.Color('#fff4ec');
const KEY_QUENTE = new THREE.Color('#ffd2b0');

export function Lights() {
  const key = useRef<THREE.DirectionalLight>(null);
  const rimL = useRef<THREE.SpotLight>(null);
  const rimR = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.HemisphereLight>(null);
  const glow = useRef<THREE.PointLight>(null);

  // A cada frame, as luzes leem o roteiro (scenePose)
  useFrame(() => {
    const p = scenePose;
    if (key.current) {
      key.current.intensity = p.key;
      key.current.color.copy(KEY_NEUTRO).lerp(KEY_QUENTE, p.warmth);
    }
    if (rimL.current) {
      // Spotlights usam unidades físicas no Three.js moderno: valores maiores
      rimL.current.intensity = p.rim * 18;
      rimL.current.color.copy(ROSA).lerp(VERMELHO, p.warmth * 0.7);
    }
    if (rimR.current) {
      rimR.current.intensity = p.rim * 12;
    }
    if (fill.current) fill.current.intensity = p.fill;
    if (glow.current) glow.current.intensity = 0.6 + p.rim * 0.5;
  });

  return (
    <>
      <hemisphereLight ref={fill} args={['#ffe3ef', '#3a0a1c', 0.6]} />
      <directionalLight ref={key} position={[4, 5, 6]} intensity={2.2} />
      <spotLight ref={rimL} position={[-5, 3, -4]} angle={0.6} penumbra={1} distance={20} decay={1.2} />
      <spotLight ref={rimR} position={[5, -1, -5]} angle={0.6} penumbra={1} distance={20} decay={1.2} color="#ffd3e6" />
      <pointLight ref={glow} position={[0, -2.2, 2.5]} distance={7} decay={2} color="#ff6fb5" />

      {/* frames={1}: o mapa de ambiente é renderizado uma única vez (é
          estático), sem custo nos frames seguintes */}
      <Environment resolution={256} frames={1}>
        {/* fundo escuro do "estúdio": mantém contraste nos reflexos */}
        <color attach="background" args={['#1a0710']} />

        {/* faixas verticais → reflexos longos no corpo cilíndrico */}
        <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[-3, 0, 4]} scale={[0.9, 10, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[3.5, 0, 3]} scale={[0.4, 10, 1]} />

        {/* painéis coloridos atrás e ao lado → bordas rosadas e avermelhadas */}
        <Lightformer form="rect" intensity={2.2} color="#ff5aa8" position={[0, 0, -5]} scale={[6, 10, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ff3b2f" position={[5, 1, -2]} rotation-y={-Math.PI / 2} scale={[4, 6, 1]} />

        {/* softbox superior → brilho da tampa e do anel */}
        <Lightformer form="circle" intensity={2.5} color="#fff4ec" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={3} />
      </Environment>
    </>
  );
}
