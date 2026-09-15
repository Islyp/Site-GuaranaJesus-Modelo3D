/**
 * ============================================================================
 *  scrollTimeline — o "roteiro" da lata, da câmera e da luz
 * ============================================================================
 *
 * Esta é a peça central da experiência: o scroll funciona como a timeline de
 * um filme. Rolar para baixo avança a cena; rolar para cima a rebobina.
 *
 * Como funciona, em 3 passos:
 *
 *  1. ROTEIRO — uma lista de keyframes (desktopScript / mobileScript). Cada
 *     keyframe diz "quando a seção X estiver na tela, a cena deve estar ASSIM"
 *     (posição, rotação e escala da lata, posição da câmera, intensidade da luz).
 *
 *  2. ÂNCORAS — cada keyframe é preso a uma SEÇÃO do HTML, não a uma
 *     porcentagem fixa. Na montagem, medimos onde cada seção está e
 *     convertemos isso em progresso de scroll (0 → 1). Se um texto crescer ou
 *     a tela mudar de tamanho, os keyframes acompanham automaticamente.
 *
 *  3. TIMELINE — uma timeline GSAP pausada, de duração 1, com um tween entre
 *     cada par de keyframes. O ScrollTrigger lê o progresso do scroll e
 *     posiciona a "agulha" da timeline no ponto correspondente.
 *
 * A timeline não mexe no Three.js diretamente: ela só interpola o objeto
 * `scenePose`. O loop de render (GuaranaCan, CameraRig, Lights, Particles)
 * lê esse objeto a cada frame. Isso separa "o que a cena deve ser" (aqui) de
 * "como desenhar" (em /three), e facilita ajustar o roteiro sem tocar no 3D.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Tudo o que o roteiro controla.
 *
 * x / y são normalizados pela metade da viewport (-1 → 1): x = 0.5 significa
 * "a meio caminho entre o centro e a borda direita" em qualquer tela.
 */
export interface ScenePose {
  // --- lata ---
  /** posição horizontal normalizada (-1 esquerda → 1 direita) */
  x: number;
  /** posição vertical normalizada (-1 base → 1 topo) */
  y: number;
  /** profundidade em unidades do mundo (positivo = mais perto da câmera) */
  z: number;
  /** inclinação para frente/trás (rad) */
  rx: number;
  /** giro no próprio eixo (rad) — 2π = uma volta; múltiplos de 2π = logo de frente */
  ry: number;
  /** inclinação lateral (rad) */
  rz: number;
  scale: number;
  /** velocidade do giro autônomo (rad/s); valores baixos ativam o "assentar de frente" */
  spin: number;

  // --- câmera ---
  camX: number;
  camY: number;
  camZ: number;

  // --- luz ---
  /** luz principal (frontal) */
  key: number;
  /** luzes de recorte (contorno rosado da silhueta) */
  rim: number;
  /** luz ambiente (hemisfério) */
  fill: number;
  /** 0 = luz neutra/rosada · 1 = luz quente/avermelhada */
  warmth: number;

  // --- atmosfera ---
  /** opacidade das bolhas e do bokeh */
  bubbles: number;
}

/** Instância única e mutável, lida pelo loop do Three.js a cada frame. */
export const scenePose: ScenePose = {
  x: 0.42, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1.5, spin: 0.35,
  camX: 0, camY: 0, camZ: 6, key: 2.2, rim: 3, fill: 0.6, warmth: 0, bubbles: 1,
};

type SectionId = 'hero' | 'historia' | 'sabor' | 'produto' | 'maranhao' | 'final';

/** Ponto do scroll ao qual um keyframe está preso. */
interface Anchor {
  section: SectionId;
  /**
   * 0 = momento em que a seção cobre a viewport (topo da seção no topo da tela).
   * 1 = fim da seção — útil em seções altas/"presas" (sticky), para animar
   *     enquanto o usuário rola dentro delas.
   */
  at?: number;
  /** deslocamento extra, em alturas de viewport (ex.: -0.5 = meia tela antes) */
  offset?: number;
}

interface Keyframe {
  anchor: Anchor;
  /** só os campos que mudam; o resto é herdado do keyframe anterior */
  pose: Partial<ScenePose>;
  /** curva de aceleração do trecho que CHEGA neste keyframe */
  ease?: string;
}

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Roteiro — desktop
// ---------------------------------------------------------------------------
const desktopScript: Keyframe[] = [
  // 0% — HERO: grande, à direita, inclinada, giro lento
  {
    anchor: { section: 'hero' },
    pose: { x: 0.44, y: -0.04, z: 0.2, rx: 0.1, ry: 0, rz: -0.2, scale: 1.55, spin: 0.35,
      camX: 0, camY: 0, camZ: 6, key: 2.2, rim: 3.2, fill: 0.6, warmth: 0, bubbles: 1 },
  },
  // ~20% — TRAVESSIA: a lata cruza para o centro e inclina no eixo X
  //        (meia tela antes da seção História chegar)
  {
    anchor: { section: 'historia', offset: -0.5 },
    pose: { x: 0.02, y: 0.06, z: 0.6, rx: 0.6, ry: 1.9, rz: 0.12, scale: 1.3, camZ: 5.7, camY: 0.15, key: 2.6 },
    ease: 'power1.inOut',
  },
  // ~40% — HISTÓRIA: menor, distante, virada 180° (mostra o verso), à esquerda
  {
    anchor: { section: 'historia' },
    pose: { x: -0.5, y: -0.08, z: -1.6, rx: 0.12, ry: Math.PI + 0.2, rz: 0.24, scale: 1.05, spin: 0.2,
      camX: -0.25, camY: 0, camZ: 6.4, key: 1.7, rim: 2.2, fill: 0.9, warmth: 0.25, bubbles: 0.45 },
  },
  {
    anchor: { section: 'historia', at: 1 },
    pose: { x: -0.46, y: 0.02, z: -1.4, rx: -0.05, ry: Math.PI + 0.9, rz: 0.18 },
  },
  // ~60% — SABOR: volta a crescer, aproxima da câmera, luz mais intensa
  {
    anchor: { section: 'sabor' },
    pose: { x: 0.12, y: -0.06, z: 1.0, rx: -0.22, ry: TAU + 0.3, rz: -0.34, scale: 1.55, spin: 0.3,
      camX: 0.2, camY: -0.1, camZ: 5.3, key: 3.6, rim: 5.2, fill: 0.5, warmth: 0.55, bubbles: 1 },
    ease: 'power2.inOut',
  },
  {
    anchor: { section: 'sabor', at: 1 },
    pose: { x: 0.2, y: 0.04, z: 1.2, rx: 0.1, ry: TAU + 1.5, rz: -0.12, scale: 1.45 },
  },
  // PRODUTO: centralizada; enquanto a seção fica presa, dá uma volta completa
  //          (4π → 6π) para mostrar toda a embalagem, terminando de frente
  {
    anchor: { section: 'produto' },
    pose: { x: 0, y: -0.03, z: 0.5, rx: 0.05, ry: 4 * Math.PI, rz: 0, scale: 1.3, spin: 0.08,
      camX: 0, camY: 0.1, camZ: 5.8, key: 2.8, rim: 3.4, fill: 0.8, warmth: 0.1, bubbles: 0.35 },
    ease: 'power2.inOut',
  },
  {
    anchor: { section: 'produto', at: 1 },
    pose: { ry: 6 * Math.PI, rx: -0.04 },
  },
  // ~80% — MARANHÃO: cruza a tela na diagonal (canto superior esquerdo →
  //        inferior direito), menor, com rotação contínua e luz quente
  {
    anchor: { section: 'maranhao' },
    pose: { x: -0.72, y: 0.52, z: -0.6, rx: 0.6, ry: 7 * Math.PI, rz: 0.8, scale: 0.85, spin: 0.9,
      camX: 0.15, camY: 0, camZ: 6.2, key: 2.2, rim: 4, fill: 0.5, warmth: 1, bubbles: 0.6 },
    ease: 'power1.in',
  },
  {
    anchor: { section: 'maranhao', at: 1 },
    pose: { x: 0.74, y: -0.5, z: -0.3, rx: -0.5, ry: 9 * Math.PI, rz: -0.7, scale: 0.8 },
    ease: 'none', // velocidade constante: a travessia não "freia" no meio
  },
  // 100% — FINAL: volta grande e inclinada, com giro desacelerando até parar de frente
  {
    anchor: { section: 'final' },
    pose: { x: 0.2, y: -0.03, z: 0.7, rx: 0.14, ry: 10 * Math.PI - 0.35, rz: -0.28, scale: 1.42, spin: 0.05,
      camX: 0, camY: 0, camZ: 5.6, key: 2.3, rim: 6, fill: 0.35, warmth: 0.7, bubbles: 0.7 },
    ease: 'power3.out',
  },
];

// ---------------------------------------------------------------------------
// Roteiro — mobile
// ---------------------------------------------------------------------------
// Em vez de reescrever tudo, derivamos do desktop: no celular o texto ocupa a
// metade superior, então a lata é empurrada para baixo, fica menor, desloca-se
// menos na horizontal e nunca chega tão perto da câmera.
const mobileScript: Keyframe[] = desktopScript.map((k) => {
  const p = { ...k.pose };
  if (p.x !== undefined) p.x = p.x * 0.35;
  if (p.y !== undefined) p.y = -0.62 + p.y * 0.3;
  if (p.scale !== undefined) p.scale = p.scale * 0.58;
  if (p.camZ !== undefined) p.camZ = p.camZ + 1.2;
  if (p.camX !== undefined) p.camX = p.camX * 0.3;
  if (p.z !== undefined) p.z = Math.min(p.z, 0.4);
  return { ...k, pose: p };
});
// Ajustes finos por cena (índices do array acima):
// Maranhão — a travessia continua diagonal, porém contida na largura do celular
mobileScript[8].pose = { ...mobileScript[8].pose, x: -0.45, y: 0.1 };
mobileScript[9].pose = { ...mobileScript[9].pose, x: 0.45, y: -0.6 };
// Final — lata na metade inferior, abaixo do título e do botão
mobileScript[10].pose = { ...mobileScript[10].pose, x: 0.12, y: -0.5, scale: 0.86 };

// ---------------------------------------------------------------------------
// Montagem da timeline
// ---------------------------------------------------------------------------

/**
 * Converte uma âncora (seção + ajustes) em progresso de scroll (0 → 1).
 * @param max scroll máximo da página em px
 */
function anchorProgress({ section, at = 0, offset = 0 }: Anchor, max: number) {
  const el = document.getElementById(section);
  if (!el || max <= 0) return 0;
  const vh = window.innerHeight;
  const top = el.getBoundingClientRect().top + window.scrollY; // posição absoluta
  // "at" percorre só a parte da seção que excede a tela (útil para sticky)
  const px = top + at * Math.max(0, el.offsetHeight - vh) + offset * vh;
  return gsap.utils.clamp(0, 1, px / max);
}

/**
 * Cria a timeline global da cena e a conecta ao scroll.
 * @param isMobile escolhe o roteiro
 * @returns função de limpeza
 */
export function createSceneTimeline(isMobile: boolean) {
  const script = isMobile ? mobileScript : desktopScript;
  let timeline: gsap.core.Timeline | null = null;
  let trigger: ScrollTrigger | null = null;

  /**
   * (Re)constrói a timeline a partir das posições ATUAIS das seções.
   * Chamado na montagem e a cada ScrollTrigger.refresh (resize, fontes
   * carregadas, mudança de altura do conteúdo).
   */
  const build = () => {
    const max = ScrollTrigger.maxScroll(window);
    const current = trigger?.progress ?? 0; // preserva a posição do "filme"
    timeline?.kill();

    // Cada keyframe declara só o que muda; aqui ele herda o resto do anterior.
    // Assim todo tween conhece o estado completo de origem e de destino.
    let carry = { ...scenePose, ...script[0].pose } as ScenePose;
    const frames = script.map((k) => {
      carry = { ...carry, ...k.pose };
      return { t: anchorProgress(k.anchor, max), pose: { ...carry }, ease: k.ease };
    });

    Object.assign(scenePose, frames[0].pose);
    timeline = gsap.timeline({ paused: true, defaults: { ease: 'sine.inOut' } });

    // Um "set" vazio no tempo 1 garante que a duração total seja exatamente 1,
    // mesmo que o último keyframe fique antes do fim da página.
    timeline.set({}, {}, 1);

    // Um tween por trecho, começando no tempo (= progresso) do keyframe anterior.
    for (let i = 1; i < frames.length; i++) {
      const prev = frames[i - 1];
      const next = frames[i];
      const duration = Math.max(0.0001, next.t - prev.t);
      timeline.fromTo(
        scenePose,
        { ...prev.pose },
        // immediateRender: false → tweens futuros não sobrescrevem o estado
        // atual no momento em que são criados
        { ...next.pose, duration, ease: next.ease ?? 'sine.inOut', immediateRender: false },
        prev.t
      );
    }
    timeline.progress(current);
  };

  build();

  // O gatilho cobre a página inteira (0 → scroll máximo). A cada atualização,
  // o progresso do scroll vira o progresso da timeline: descer avança, subir
  // retrocede, sem animações "disparadas uma vez".
  trigger = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => timeline?.progress(self.progress),
  });

  ScrollTrigger.addEventListener('refresh', build);

  return () => {
    ScrollTrigger.removeEventListener('refresh', build);
    trigger?.kill();
    timeline?.kill();
  };
}
