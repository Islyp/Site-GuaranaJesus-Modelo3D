/**
 * ============================================================================
 *  Particles — bolhas de refrigerante e bokeh
 * ============================================================================
 *
 * Duas camadas para criar profundidade de campo "falsa" (sem pós-processamento,
 * que seria caro demais para rodar junto com o scroll):
 *
 *  1. BOLHAS NÍTIDAS — pequenas esferas que sobem ao redor da lata.
 *     Técnica: InstancedMesh. Todas as bolhas compartilham UMA geometria e
 *     UM material e são desenhadas em UMA única chamada à GPU (draw call),
 *     cada uma com sua própria matriz de posição/escala.
 *     Shader: efeito fresnel — borda clara e centro transparente, como uma
 *     bolha de verdade — mais um ponto de brilho especular.
 *
 *  2. BOKEH DESFOCADO — discos grandes e suaves, bem perto ou bem longe da
 *     câmera, imitando o desfoque de uma lente com pouca profundidade de campo.
 *     Técnica: Points com shader próprio (cada ponto vira um disco suave).
 *
 * As camadas reagem ao mouse em velocidades diferentes (parallax em camadas)
 * e ficam mais ou menos visíveis conforme o roteiro (scenePose.bubbles).
 * Rolar rápido acelera a subida das bolhas.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { scenePose } from '../animations/scrollTimeline';
import { scrollState } from '../state/scrollStore';
import { pointer } from '../state/pointer';

// ---------------------------------------------------------------------------
// Shader das bolhas nítidas
// ---------------------------------------------------------------------------
const bubbleVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // instanceMatrix: matriz individual de cada bolha (fornecida pelo InstancedMesh)
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vView = normalize(-mv.xyz); // direção da superfície para a câmera
    gl_Position = projectionMatrix * mv;
  }
`;
const bubbleFragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // Fresnel: quanto mais "de lado" a superfície está para a câmera, mais opaca
    float f = 1.0 - max(dot(vNormal, vView), 0.0);
    float rim = pow(f, 2.2);
    // Brilho especular de uma luz fixa no alto à esquerda
    float spec = pow(max(dot(reflect(-vView, vNormal), normalize(vec3(-0.4, 0.8, 0.5))), 0.0), 24.0);
    vec3 col = mix(vec3(1.0, 0.86, 0.93), vec3(1.0), spec); // rosado → branco no brilho
    gl_FragColor = vec4(col, (rim * 0.75 + spec) * uOpacity);
  }
`;

// ---------------------------------------------------------------------------
// Shader do bokeh
// ---------------------------------------------------------------------------
const bokehVertex = /* glsl */ `
  attribute float aSize;
  uniform float uPixelRatio;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Atenuação por distância: pontos próximos da câmera ficam maiores
    gl_PointSize = aSize * uPixelRatio * (9.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const bokehFragment = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  void main() {
    // gl_PointCoord vai de 0 a 1 dentro do ponto; distância ao centro
    float d = length(gl_PointCoord - 0.5);
    // disco macio + um anel levemente mais claro na borda (característico de lente)
    float a = smoothstep(0.5, 0.12, d) * 0.55 + smoothstep(0.5, 0.44, d) * 0.12;
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

interface Props {
  /** quantidade de bolhas nítidas */
  count: number;
  /** quantidade de discos de bokeh */
  bokehCount: number;
  reducedMotion: boolean;
}

// Objeto auxiliar reutilizado para compor as matrizes das instâncias
const dummy = new THREE.Object3D();
/** volume onde as bolhas nascem e sobem (unidades do mundo) */
const BOUNDS = { x: 5.5, yMin: -3.6, yMax: 3.6 };

export function Particles({ count, bokehCount, reducedMotion }: Props) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const bokehGroup = useRef<THREE.Group>(null);
  const bubbleGroup = useRef<THREE.Group>(null);

  // Dados de cada bolha (em CPU). Tamanhos com distribuição exponencial:
  // muitas bolhas pequenas e poucas grandes, como no copo.
  const bubbles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: THREE.MathUtils.randFloatSpread(BOUNDS.x * 2),
        y: THREE.MathUtils.randFloat(BOUNDS.yMin, BOUNDS.yMax),
        z: THREE.MathUtils.randFloat(-3.5, 1.8),
        r: Math.pow(Math.random(), 2.4) * 0.07 + 0.012,
        speed: THREE.MathUtils.randFloat(0.12, 0.42),
        wobble: Math.random() * Math.PI * 2, // fase do balanço lateral
      })),
    [count]
  );

  const bubbleMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: bubbleVertex,
        fragmentShader: bubbleFragment,
        uniforms: { uOpacity: { value: 1 } },
        transparent: true,
        depthWrite: false, // transparências não "recortam" umas às outras
      }),
    []
  );
  // Esfera de baixa resolução: a bolha é pequena, 14×10 segmentos bastam
  const bubbleGeometry = useMemo(() => new THREE.SphereGeometry(1, 14, 10), []);

  // Bokeh: 1 em cada 3 discos fica PERTO da câmera (grande, desfocado na
  // frente da lata); os demais ficam LONGE, no fundo da cena.
  const bokeh = useMemo(() => {
    const positions = new Float32Array(bokehCount * 3);
    const sizes = new Float32Array(bokehCount);
    for (let i = 0; i < bokehCount; i++) {
      const near = i % 3 === 0;
      positions[i * 3] = THREE.MathUtils.randFloatSpread(near ? 6 : 12);
      positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(near ? 5 : 9);
      positions[i * 3 + 2] = near ? THREE.MathUtils.randFloat(2.6, 3.8) : THREE.MathUtils.randFloat(-7, -4);
      sizes[i] = near ? THREE.MathUtils.randFloat(40, 90) : THREE.MathUtils.randFloat(60, 140);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: bokehVertex,
      fragmentShader: bokehFragment,
      uniforms: {
        uOpacity: { value: 0.5 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uColor: { value: new THREE.Color('#ffc2dc') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // soma luz: brilho etéreo sobre o fundo
    });
    return { geometry, material, positions };
  }, [bokehCount]);

  // Recursos criados manualmente → liberação manual da memória da GPU
  useEffect(
    () => () => {
      bubbleMaterial.dispose();
      bubbleGeometry.dispose();
      bokeh.geometry.dispose();
      bokeh.material.dispose();
    },
    [bubbleMaterial, bubbleGeometry, bokeh]
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const time = state.clock.elapsedTime;
    // Velocidade do scroll vira um impulso extra na subida das bolhas
    const lift = THREE.MathUtils.clamp(scrollState.velocity, -60, 60) * 0.004;

    // Visibilidade controlada pelo roteiro de cada seção
    bubbleMaterial.uniforms.uOpacity.value = scenePose.bubbles;
    bokeh.material.uniforms.uOpacity.value = scenePose.bubbles * 0.42;

    if (mesh.current) {
      bubbles.forEach((b, i) => {
        if (!reducedMotion) {
          b.y += (b.speed + Math.abs(lift)) * dt;
          // ao sair pelo topo, renasce embaixo em outra posição horizontal
          if (b.y > BOUNDS.yMax) {
            b.y = BOUNDS.yMin;
            b.x = THREE.MathUtils.randFloatSpread(BOUNDS.x * 2);
          }
        }
        // compõe a matriz da instância i (posição com balanço + escala)
        dummy.position.set(b.x + Math.sin(time * 1.4 + b.wobble) * 0.05, b.y, b.z);
        dummy.scale.setScalar(b.r);
        dummy.updateMatrix();
        mesh.current!.setMatrixAt(i, dummy.matrix);
      });
      mesh.current.instanceMatrix.needsUpdate = true; // envia as matrizes à GPU
    }

    // Parallax em camadas: o bokeh (mais perto/longe) se move mais que as bolhas.
    // O bokeh também sobe com o progresso da página, reforçando o movimento.
    if (bubbleGroup.current) {
      bubbleGroup.current.position.x = THREE.MathUtils.damp(bubbleGroup.current.position.x, -pointer.x * 0.15, 2, dt);
      bubbleGroup.current.position.y = THREE.MathUtils.damp(bubbleGroup.current.position.y, -pointer.y * 0.1, 2, dt);
    }
    if (bokehGroup.current) {
      bokehGroup.current.position.x = THREE.MathUtils.damp(bokehGroup.current.position.x, -pointer.x * 0.5, 1.5, dt);
      bokehGroup.current.position.y = THREE.MathUtils.damp(
        bokehGroup.current.position.y,
        -pointer.y * 0.3 + scrollState.progress * 4,
        1.5,
        dt
      );
    }
  });

  return (
    <>
      <group ref={bubbleGroup}>
        {/* frustumCulled false: as instâncias se espalham além da caixa da
            geometria base, e o culling automático as esconderia por engano */}
        <instancedMesh ref={mesh} args={[bubbleGeometry, bubbleMaterial, count]} frustumCulled={false} />
      </group>
      <group ref={bokehGroup}>
        <points geometry={bokeh.geometry} material={bokeh.material} frustumCulled={false} />
      </group>
    </>
  );
}
