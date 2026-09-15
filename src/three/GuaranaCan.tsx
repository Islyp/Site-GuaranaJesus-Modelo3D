/**
 * ============================================================================
 *  GuaranaCan — a lata persistente e seu "controlador de movimento"
 * ============================================================================
 *
 * Um único objeto que atravessa toda a experiência. A cada frame, a pose
 * final da lata é a SOMA de várias camadas de movimento:
 *
 *   1. roteiro do scroll   → scenePose (posição, rotação, escala)
 *   2. giro autônomo       → scenePose.spin (rad/s)
 *   3. velocidade do scroll→ rolar rápido dá um "empurrão" no giro
 *   4. parallax do mouse   → deslocamento e inclinação sutis
 *   5. interação do usuário→ arrastar, inércia, giro de 360° no clique
 *   6. flutuação           → leve sobe-e-desce senoidal ("respirando")
 *
 * Hierarquia de grupos (por que dois grupos?):
 *
 *   rig   (posição, escala, inclinação X/Z)
 *    └─ tilt (giro Y: roteiro + spin + usuário)
 *        └─ rotação fixa de -90° (frente do rótulo voltada para a câmera)
 *            └─ modelo (PlaceholderCan ou GLBCan)
 *
 * Separar a inclinação (grupo externo) do giro (grupo interno) garante que a
 * lata sempre gire em torno do PRÓPRIO eixo, mesmo quando está inclinada —
 * como uma lata real girando na mão, e não "rodando em órbita".
 *
 * Modelo 3D: se /public/models/guarana-jesus-can.glb existir, ele é usado
 * automaticamente; senão, entra o placeholder procedural. Nenhuma outra parte
 * do projeto precisa saber qual dos dois está na tela.
 */
import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { scenePose } from '../animations/scrollTimeline';
import { scrollState } from '../state/scrollStore';
import { pointer } from '../state/pointer';
import { canInteraction } from '../state/canInteraction';
import { PlaceholderCan } from './PlaceholderCan';
import { GLBCan } from './GLBCan';
import { CAN_HEIGHT, CAN_MODEL_URL } from './canDimensions';

// ---------------------------------------------------------------------------
// Detecção do modelo GLB
// ---------------------------------------------------------------------------

type Availability = 'checking' | 'available' | 'missing';

/**
 * Verifica se o arquivo GLB existe antes de tentar carregá-lo.
 *
 * Detalhe: em apps de página única, o servidor costuma responder index.html
 * (status 200!) para qualquer caminho inexistente. Por isso não basta checar
 * `res.ok` — também recusamos respostas do tipo text/html.
 */
function useModelAvailability(url: string): Availability {
  const [state, setState] = useState<Availability>('checking');
  useEffect(() => {
    let alive = true; // evita setState após desmontar
    fetch(url, { method: 'HEAD' }) // HEAD: só cabeçalhos, sem baixar o arquivo
      .then((res) => {
        const type = res.headers.get('content-type') ?? '';
        const ok = res.ok && !type.includes('text/html');
        if (alive) setState(ok ? 'available' : 'missing');
      })
      .catch(() => alive && setState('missing'));
    return () => {
      alive = false;
    };
  }, [url]);
  return state;
}

/**
 * Se o GLB existir mas estiver corrompido (ou falhar ao decodificar),
 * a experiência não quebra: o placeholder assume o lugar.
 */
class ModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[GuaranaCan] Falha ao carregar o GLB, usando placeholder.', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Constantes e objetos reutilizáveis
// ---------------------------------------------------------------------------

/**
 * Distância de referência da câmera usada para converter as coordenadas
 * normalizadas do roteiro (x/y de -1 a 1) em unidades do mundo 3D.
 * Usar um valor FIXO (e não a distância atual da câmera) evita que a lata
 * "escorregue" pela tela quando a câmera faz dolly-in/dolly-out.
 */
const REF_DISTANCE = 6;
/** Campo de visão vertical da câmera, em graus (lente levemente tele). */
const FOV = 32;
const TAU = Math.PI * 2;
/** raio aproximado da lata no mundo, para a silhueta de acerto do ponteiro */
const CAN_RADIUS = 0.34;
/**
 * damp = interpolação exponencial independente do FPS. Em 30 ou 144 fps a
 * suavização percorre a mesma distância por segundo.
 */
const damp = THREE.MathUtils.damp;

// Vetores pré-alocados: nada de `new Vector3()` dentro do loop de 60 fps
// (evita pressão no garbage collector e engasgos durante o scroll).
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpR = new THREE.Vector3();
const camRight = new THREE.Vector3();

// ---------------------------------------------------------------------------

export function GuaranaCan({ reducedMotion }: { reducedMotion: boolean }) {
  const availability = useModelAvailability(CAN_MODEL_URL);
  const rig = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);

  // Estados de animação que persistem entre frames (refs, não state: mudar
  // não deve re-renderizar o componente)
  const spin = useRef(0); // giro acumulado (autônomo + scroll + usuário)
  const smoothPointer = useRef({ x: 0, y: 0 }); // mouse suavizado
  const smoothVel = useRef(0); // velocidade do scroll suavizada
  const userTilt = useRef(0); // inclinação do arraste, suavizada

  useFrame((state, delta) => {
    const g = rig.current;
    const t = tilt.current;
    if (!g || !t) return;

    // Limita o delta: se a aba ficou em segundo plano, o primeiro frame ao
    // voltar não pode "teleportar" a animação.
    const dt = Math.min(delta, 1 / 20);
    const p = scenePose;
    const ui = canInteraction;
    const now = performance.now();

    // Meia altura/largura visível no plano de referência (z = 0)
    const halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * REF_DISTANCE;
    const halfW = halfH * (state.size.width / state.size.height);

    // Enquanto o usuário arrasta, o parallax do mouse é desligado — senão a
    // lata fugiria do cursor que a está segurando.
    smoothPointer.current.x = damp(smoothPointer.current.x, ui.dragging ? 0 : pointer.x, 2.5, dt);
    smoothPointer.current.y = damp(smoothPointer.current.y, ui.dragging ? 0 : pointer.y, 2.5, dt);
    smoothVel.current = damp(smoothVel.current, THREE.MathUtils.clamp(scrollState.velocity, -80, 80), 4, dt);

    // ---- giro: autônomo + scroll + usuário ----
    if (!reducedMotion && !ui.dragging) {
      spin.current += p.spin * dt + smoothVel.current * 0.0016;
    }
    // giro direto do arraste (acumulado pelos eventos desde o último frame)
    spin.current += ui.pendingSpin;
    ui.pendingSpin = 0;
    // inércia após soltar, com decaimento exponencial
    if (!ui.dragging && Math.abs(ui.inertia) > 0.001) {
      spin.current += ui.inertia * dt;
      ui.inertia *= Math.pow(0.08, dt);
    }
    // giro de 360° do clique: consome o restante aos poucos (ease-out natural)
    if (ui.flourish > 0.0001) {
      const step = reducedMotion ? ui.flourish : ui.flourish * (1 - Math.exp(-3.2 * dt));
      spin.current += step;
      ui.flourish -= step;
    }

    // ---- "assentar de frente" ----
    // Nas cenas de destaque (Produto e Final) o roteiro define um giro muito
    // lento. Nelas, a lata gira até o múltiplo de 2π mais próximo para o logo
    // terminar voltado para a câmera — mas só depois de ~2s sem interação,
    // para não disputar o controle com o usuário.
    const idle = now - ui.lastInteraction > 1800 && !ui.dragging && ui.flourish < 0.05;
    const settle = THREE.MathUtils.clamp((0.14 - p.spin) / 0.08, 0, 1); // 0 = cena livre, 1 = destaque
    if (settle > 0 && idle) {
      const front = Math.round(spin.current / TAU) * TAU;
      spin.current = damp(spin.current, front, 1.6 * settle, dt);
    }

    // ---- inclinação do arraste: segue a mão e volta como mola ao soltar ----
    userTilt.current = damp(userTilt.current, ui.tilt, 12, dt);
    if (!ui.dragging) ui.tilt = damp(ui.tilt, 0, 3, dt);

    // Flutuação sutil, desligada com "reduzir movimento"
    const floatY = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.9) * 0.035;

    // ---- aplica a pose ----
    g.position.set(
      p.x * halfW + smoothPointer.current.x * 0.08,
      p.y * halfH + floatY + smoothPointer.current.y * 0.05,
      p.z
    );
    g.scale.setScalar(p.scale);

    // Inclinação (X/Z) no grupo externo; ordem 'XZY' aplica o pequeno giro
    // de parallax em Y antes das inclinações.
    const rx = p.rx - smoothPointer.current.y * 0.06 + smoothVel.current * 0.004 + userTilt.current;
    g.rotation.set(rx, smoothPointer.current.x * 0.12, p.rz, 'XZY');
    // Giro no próprio eixo, no grupo interno
    t.rotation.y = p.ry + spin.current;

    // ---- silhueta projetada na tela (para o hover/arraste no DOM) ----
    // Projeta o topo e a base do eixo da lata e um ponto na borda lateral;
    // o resultado é uma "cápsula" 2D usada por isOverCan().
    t.updateWorldMatrix(true, false);
    const { camera, size } = state;
    const toScreen = (v: THREE.Vector3) => {
      v.project(camera); // mundo → coordenadas normalizadas (-1 a 1)
      return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height] as const; // → px
    };
    tmpA.set(0, CAN_HEIGHT * 0.5, 0).applyMatrix4(t.matrixWorld); // centro do topo
    tmpB.set(0, -CAN_HEIGHT * 0.5, 0).applyMatrix4(t.matrixWorld); // centro da base
    camRight.setFromMatrixColumn(camera.matrixWorld, 0); // "direita" da câmera
    tmpR.copy(tmpA).lerp(tmpB, 0.5).addScaledVector(camRight, CAN_RADIUS * p.scale); // borda lateral
    const center = tmpA.clone().lerp(tmpB, 0.5);
    // (as projeções abaixo modificam os vetores, por isso são feitas por último)
    const [ax, ay] = toScreen(tmpA);
    const [bx, by] = toScreen(tmpB);
    const [rxp, ryp] = toScreen(tmpR);
    const [cx, cy] = toScreen(center);
    const hit = ui.hit;
    hit.ax = ax;
    hit.ay = ay;
    hit.bx = bx;
    hit.by = by;
    hit.r = Math.hypot(rxp - cx, ryp - cy);
    hit.visible = true;
  });

  const placeholder = <PlaceholderCan />;

  return (
    <group ref={rig}>
      <group ref={tilt}>
        {/* rotação fixa: no mapa UV do rótulo a frente fica em u = 0.25
            (eixo +X); girar -90° a traz para frente da câmera (+Z) */}
        <group rotation-y={-Math.PI / 2}>
          {/* 'checking' não renderiza nada por alguns milissegundos,
              evitando que o placeholder "pisque" antes do GLB */}
          {availability === 'missing' && placeholder}
          {availability === 'available' && (
            <ModelErrorBoundary fallback={placeholder}>
              <Suspense fallback={placeholder}>
                <GLBCan url={CAN_MODEL_URL} />
              </Suspense>
            </ModelErrorBoundary>
          )}
        </group>
      </group>
    </group>
  );
}

export { FOV as CAMERA_FOV };
