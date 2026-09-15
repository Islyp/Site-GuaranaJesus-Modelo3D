/**
 * ============================================================================
 *  PlaceholderCan — lata de 350 ml modelada por código
 * ============================================================================
 *
 * Enquanto não existe um modelo GLB profissional, a lata é construída com
 * geometrias do próprio Three.js — nenhum arquivo 3D é baixado.
 *
 * Técnica principal: LatheGeometry ("torno"). Descrevemos o PERFIL da peça
 * como uma lista de pontos (raio, altura) e o Three.js gira esse perfil 360°
 * em volta do eixo Y, exatamente como um torno de verdade gera peças
 * cilíndricas. Assim modelamos ombro, borda e fundo côncavo.
 *
 * Anatomia (1 unidade ≈ 100 mm; lata real: Ø 66 mm × 122 mm):
 *
 *        ┌── anel (lacre) + rebite + boca
 *     ╭──┴──╮  borda superior (rim)
 *    ╱       ╲ ombro (shoulder)
 *   │         │
 *   │ rótulo  │ corpo cilíndrico com a textura (body)
 *   │         │
 *    ╲_______╱ fundo côncavo (bottom)
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { createLabelTexture } from './labelTexture';
import { CAN_HEIGHT } from './canDimensions';

// TODO: Replace placeholder with /models/guarana-jesus-can.glb
// (GuaranaCan.tsx já troca automaticamente assim que o arquivo existir.)

/** raio do corpo */
const R = 0.33;
/** altura da parte reta, onde fica o rótulo */
const BODY_H = 0.9;
/** segmentos radiais: 96 deixa o cilindro liso mesmo em close */
const SEG = 96;

/** Gera uma peça de revolução a partir do perfil [raio, altura][]. */
function lathe(points: [number, number][]) {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    SEG
  );
}

/** Contorno do anel de abrir: retângulo arredondado com um furo. */
function tabShape() {
  const s = new THREE.Shape();
  const [x, y, w, h, r] = [-0.05, -0.075, 0.1, 0.19, 0.045];
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  // o furo onde o dedo entra
  const hole = new THREE.Path();
  hole.absellipse(0, 0.055, 0.03, 0.03, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

/** Marca da "boca" (área que se rompe ao abrir), em forma de gota. */
function mouthShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.07, -0.03);
  s.quadraticCurveTo(-0.085, -0.16, 0, -0.175);
  s.quadraticCurveTo(0.085, -0.16, 0.07, -0.03);
  s.quadraticCurveTo(0, -0.05, -0.07, -0.03);
  return s;
}

export function PlaceholderCan() {
  const gl = useThree((s) => s.gl);
  const [label, setLabel] = useState<THREE.Texture | null>(null);

  // O rótulo é gerado de forma assíncrona (espera as fontes carregarem).
  // Até lá, o corpo aparece em rosa liso — sem tela vazia.
  useEffect(() => {
    let alive = true;
    let tex: THREE.Texture | null = null;
    // 4096 px no desktop (texto nítido em close), 2048 px no celular (memória)
    const resolution = window.innerWidth < 768 ? 1 : 2;
    createLabelTexture(gl.capabilities.getMaxAnisotropy(), resolution).then((t) => {
      if (!alive) return t.dispose();
      tex = t;
      setLabel(t);
    });
    return () => {
      alive = false;
      tex?.dispose(); // libera a textura da GPU
    };
  }, [gl]);

  // Geometrias criadas uma única vez. Perfis em [raio, altura], de baixo
  // para cima ou de fora para dentro — a ordem define para onde as faces apontam.
  const geo = useMemo(
    () => ({
      // Corpo: cilindro aberto (sem tampas) que recebe a textura do rótulo
      body: new THREE.CylinderGeometry(R, R, BODY_H, SEG, 1, true),

      // Ombro: o corpo afunila até o pescoço
      shoulder: lathe([
        [R, BODY_H / 2], [R - 0.002, 0.49], [0.318, 0.53], [0.295, 0.57], [0.272, 0.6], [0.266, 0.615],
      ]),

      // Borda: sobe, faz a dobra do "friso" e desce até o painel da tampa
      rim: lathe([
        [0.266, 0.615], [0.272, 0.628], [0.274, 0.642], [0.266, 0.652], [0.256, 0.646],
        [0.252, 0.625], [0.246, 0.61], [0.2, 0.606], [0, 0.606],
      ]),

      // Painel central levemente elevado da tampa
      panel: lathe([[0.21, 0.6061], [0.205, 0.6085], [0, 0.6085]]),

      // Fundo côncavo (domo), característico das latas de alumínio
      bottom: lathe([
        [0, -0.53], [0.12, -0.535], [0.2, -0.55], [0.225, -0.575], [0.24, -0.585],
        [0.265, -0.58], [0.3, -0.555], [0.322, -0.51], [R, -BODY_H / 2],
      ]),

      // Anel: forma 2D extrudada com chanfro para pegar brilho nas bordas
      tab: new THREE.ExtrudeGeometry(tabShape(), {
        depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 20,
      }),
      mouth: new THREE.ShapeGeometry(mouthShape(), 20),
      rivet: new THREE.CylinderGeometry(0.018, 0.02, 0.012, 20),
    }),
    []
  );

  // Geometrias criadas manualmente precisam ser liberadas manualmente
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  return (
    // Centraliza a lata na origem (base em -0.585, topo em 0.652) e ajusta a
    // escala à altura de referência — a mesma usada para normalizar o GLB.
    <group position-y={-0.033} scale={CAN_HEIGHT / 1.237}>
      {/* Rótulo impresso: pouco metálico e com verniz (clearcoat), como a
          tinta sobre o alumínio. A `key` recria o material quando a textura
          chega, garantindo que o shader seja recompilado com o mapa. */}
      <mesh geometry={geo.body}>
        <meshPhysicalMaterial
          key={label ? 'label' : 'plain'}
          map={label}
          color={label ? '#ffffff' : '#e84b85'}
          metalness={0.22}
          roughness={0.34}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMapIntensity={1.1}
        />
      </mesh>

      {/* Partes sem impressão: alumínio (metalness alto, reflexo nítido).
          DoubleSide porque o perfil do torno pode expor o lado interno. */}
      <mesh geometry={geo.shoulder}>
        <meshPhysicalMaterial color="#e4e7eb" metalness={0.85} roughness={0.24} clearcoat={0.6} clearcoatRoughness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.rim}>
        <meshStandardMaterial color="#d6dade" metalness={1} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.panel}>
        <meshStandardMaterial color="#cfd3d8" metalness={1} roughness={0.28} side={THREE.DoubleSide} />
      </mesh>

      {/* Peças da tampa: formas 2D deitadas no plano horizontal (rotação -90° em X) */}
      <mesh geometry={geo.mouth} rotation-x={-Math.PI / 2} position-y={0.6095}>
        <meshStandardMaterial color="#9aa0a8" metalness={1} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.tab} rotation-x={-Math.PI / 2} position-y={0.613}>
        <meshStandardMaterial color="#c9cdd3" metalness={1} roughness={0.22} />
      </mesh>
      <mesh geometry={geo.rivet} position-y={0.614}>
        <meshStandardMaterial color="#d6dade" metalness={1} roughness={0.2} />
      </mesh>

      <mesh geometry={geo.bottom}>
        <meshStandardMaterial color="#d6dade" metalness={1} roughness={0.22} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
