/**
 * ============================================================================
 *  GuaranaScene — o canvas 3D persistente
 * ============================================================================
 *
 * Montado UMA vez no App e nunca desmontado durante a navegação.
 * Contém tudo o que é Three.js:
 *
 *   <Canvas>
 *     ├─ PerformanceMonitor   baixa a resolução se o FPS cair
 *     ├─ CameraRig            câmera guiada pelo scroll + mouse
 *     ├─ Lights               luzes e reflexos (Environment)
 *     ├─ GuaranaCan           a lata (placeholder procedural ou GLB)
 *     └─ Particles            bolhas nítidas + bokeh desfocado
 *
 * Este arquivo é importado com React.lazy (ver App.tsx), por isso usa
 * `export default`.
 */
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { GuaranaCan, CAMERA_FOV } from './GuaranaCan';
import { Lights } from './Lights';
import { Particles } from './Particles';
import { CameraRig } from './CameraRig';
import styles from './GuaranaScene.module.css';

interface Props {
  isMobile: boolean;
  reducedMotion: boolean;
}

export default function GuaranaScene({ isMobile, reducedMotion }: Props) {
  // DPR (device pixel ratio) limitado: telas retina chegam a 3×, o que
  // multiplicaria por 9 o número de pixels renderizados. 1.75 no desktop e
  // 1.4 no celular mantêm a nitidez com um custo de GPU razoável.
  const maxDpr = isMobile ? 1.4 : 1.75;
  const [dpr, setDpr] = useState(maxDpr);

  return (
    // aria-hidden: a lata é decorativa; o conteúdo acessível está no HTML
    <div className={styles.stage} aria-hidden="true">
      <Canvas
        dpr={dpr}
        camera={{ fov: CAMERA_FOV, position: [0, 0, 6], near: 0.1, far: 60 }}
        gl={{
          antialias: !isMobile, // no celular o DPR alto já suaviza as bordas
          alpha: true, // fundo transparente: as cores vêm da BackgroundLayer
          powerPreference: 'high-performance',
          // ACES Filmic: curva de tons usada em cinema — preserva os brilhos
          // do metal sem "estourar" o branco do rótulo
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        {/* Prioridade é o scroll fluido: se o FPS cair, reduz a resolução;
            se sobrar desempenho, devolve aos poucos. */}
        <PerformanceMonitor
          onDecline={() => setDpr((d) => Math.max(1, d - 0.35))}
          onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.2))}
        />

        {/* A ordem importa: a câmera atualiza antes da lata, que usa a
            câmera do mesmo frame para projetar sua silhueta na tela. */}
        <CameraRig />
        <Lights />
        <GuaranaCan reducedMotion={reducedMotion} />

        {/* Menos partículas no celular: menos draw de transparência */}
        <Particles count={isMobile ? 22 : 55} bokehCount={isMobile ? 6 : 14} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
