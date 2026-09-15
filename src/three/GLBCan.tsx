/**
 * ============================================================================
 *  GLBCan — carregador do modelo 3D final
 * ============================================================================
 *
 * Quando um artista 3D entregar /public/models/guarana-jesus-can.glb, este
 * componente o carrega e o ENCAIXA no lugar do placeholder, sem exigir
 * nenhum ajuste no roteiro de animação.
 *
 * O "encaixe" é uma normalização: modelos chegam em escalas e origens
 * arbitrárias (milímetros, metros, pivô na base…). Medimos a caixa
 * delimitadora do modelo, centralizamos na origem e escalamos para a mesma
 * altura de referência do placeholder (CAN_HEIGHT).
 */
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { CAN_HEIGHT } from './canDimensions';

export function GLBCan({ url }: { url: string }) {
  // useGLTF faz cache: o arquivo é baixado e decodificado uma única vez.
  // Ele suspende o componente até terminar (o Suspense mostra o placeholder).
  const { scene } = useGLTF(url);

  // Clone profundo para não alterar o objeto em cache.
  const model = useMemo(() => scene.clone(true), [scene]);

  // Normalização de escala e centro
  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // Esperamos a lata em pé no eixo Y; se o modelo vier deitado, o maior
    // eixo é tratado como altura para, ao menos, manter o tamanho correto.
    const height = Math.max(size.y, size.x, size.z) || 1;
    const s = CAN_HEIGHT / height;
    // O deslocamento é aplicado FORA da escala, então também é escalado.
    return { scale: s, offset: center.multiplyScalar(-s) };
  }, [model]);

  // Ajustes de material para combinar com a iluminação da cena
  useLayoutEffect(() => {
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        // Reflexos do Environment um pouco mais fortes: alumínio "vivo"
        if ('envMapIntensity' in mat) mat.envMapIntensity = 1.25;
        // Filtragem anisotrópica: rótulo nítido mesmo visto de lado
        if (mat.map) mat.map.anisotropy = 8;
      });
    });
  }, [model]);

  return (
    <group position={offset} scale={scale}>
      <primitive object={model} />
    </group>
  );
}
