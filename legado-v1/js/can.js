import * as THREE from 'three';

// Dimensões aproximadas de uma lata de 350 ml (1 unidade ≈ 100 mm)
const R = 0.33;          // raio do corpo
const BODY_H = 0.9;      // altura da área do rótulo
const SEG = 128;

export function createCan({ labelTexture, dropletsTexture }) {
  const group = new THREE.Group();

  const labelMat = new THREE.MeshPhysicalMaterial({
    map: labelTexture,
    metalness: 0.28,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    bumpScale: 1.2,
  });

  const printedMetal = new THREE.MeshPhysicalMaterial({
    color: 0xe01b77,
    metalness: 0.6,
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
  });

  const aluminium = new THREE.MeshStandardMaterial({
    color: 0xd9dde3,
    metalness: 1,
    roughness: 0.22,
    side: THREE.DoubleSide,
  });

  const darkAluminium = new THREE.MeshStandardMaterial({
    color: 0x9aa0a8,
    metalness: 1,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });

  // Corpo com rótulo
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, BODY_H, SEG, 1, true),
    labelMat
  );
  group.add(body);

  // Ombro (parte superior impressa, afunilando até o pescoço)
  const shoulder = lathe([
    [R, BODY_H / 2],
    [R - 0.002, 0.49],
    [0.318, 0.53],
    [0.295, 0.57],
    [0.272, 0.6],
    [0.266, 0.615],
  ]);
  group.add(new THREE.Mesh(shoulder, printedMetal));

  // Borda superior + tampa
  const rim = lathe([
    [0.266, 0.615],
    [0.272, 0.628],
    [0.274, 0.642],
    [0.266, 0.652],
    [0.256, 0.646],
    [0.252, 0.625],
    [0.246, 0.61],
    [0.2, 0.606],
    [0.0, 0.606],
  ]);
  group.add(new THREE.Mesh(rim, aluminium));

  // Relevo do painel central da tampa
  const panel = lathe([
    [0.21, 0.6061],
    [0.205, 0.6085],
    [0.0, 0.6085],
  ]);
  group.add(new THREE.Mesh(panel, aluminium));

  // Área de abertura (marca da "boca")
  const mouthShape = new THREE.Shape();
  mouthShape.moveTo(-0.07, -0.03);
  mouthShape.quadraticCurveTo(-0.085, -0.16, 0, -0.175);
  mouthShape.quadraticCurveTo(0.085, -0.16, 0.07, -0.03);
  mouthShape.quadraticCurveTo(0, -0.05, -0.07, -0.03);
  const mouth = new THREE.Mesh(new THREE.ShapeGeometry(mouthShape, 24), darkAluminium);
  mouth.rotation.x = -Math.PI / 2;
  mouth.position.y = 0.6095;
  group.add(mouth);

  // Anel (lacre) de abrir
  const tabShape = new THREE.Shape();
  roundedRect(tabShape, -0.05, -0.075, 0.1, 0.19, 0.045);
  const hole = new THREE.Path();
  hole.absellipse(0, 0.055, 0.03, 0.03, 0, Math.PI * 2, true);
  tabShape.holes.push(hole);
  const tabGeo = new THREE.ExtrudeGeometry(tabShape, {
    depth: 0.004,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 2,
    curveSegments: 24,
  });
  const tab = new THREE.Mesh(tabGeo, aluminium);
  tab.rotation.x = -Math.PI / 2;
  tab.position.set(0, 0.613, 0.0);
  group.add(tab);

  // Rebite
  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.012, 24), aluminium);
  rivet.position.set(0, 0.614, 0);
  group.add(rivet);

  // Fundo (domo côncavo)
  const bottom = lathe([
    [0.0, -0.53],
    [0.12, -0.535],
    [0.2, -0.55],
    [0.225, -0.575],
    [0.24, -0.585],
    [0.265, -0.58],
    [0.3, -0.555],
    [0.322, -0.51],
    [R, -BODY_H / 2],
  ]);
  group.add(new THREE.Mesh(bottom, aluminium));

  // Centraliza verticalmente
  group.position.y = -0.03;

  const setCold = (on) => {
    labelMat.bumpMap = on ? dropletsTexture : null;
    labelMat.roughness = on ? 0.45 : 0.32;
    printedMetal.roughness = on ? 0.42 : 0.28;
    labelMat.needsUpdate = true;
  };

  const wrapper = new THREE.Group();
  wrapper.add(group);
  return { object: wrapper, setCold };
}

function lathe(pts) {
  const points = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(points, SEG);
  geo.computeVertexNormals();
  return geo;
}

function roundedRect(shape, x, y, w, h, r) {
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
}
