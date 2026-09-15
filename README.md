# Guaraná Jesus — Experiência Digital de Marca

> Site do Guaraná Jesus em que a lata acompanha a rolagem da página: uma landing page cinematográfica onde **o scroll é a timeline de um filme** e uma lata 3D atravessa a página inteira reagindo à rolagem, ao mouse e ao toque. Feito com React Three Fiber, GSAP e Lenis (Vite + TypeScript).

**Stack:** React 19 · TypeScript · Vite · Three.js · React Three Fiber · drei · GSAP + ScrollTrigger · Lenis · CSS Modules

---

## A ideia

A proposta não era "um site com um modelo 3D", e sim a sensação de **navegar dentro do universo da marca**. O usuário rola e a narrativa avança: o ambiente muda de cor, a lata se move, a câmera se aproxima e a luz esquenta. Rolar para cima rebobina tudo.

| # | Capítulo | Cor | O que a lata faz |
|---|----------|-----|------------------|
| 01 | Hero | rosa | grande à direita, inclinada, girando devagar |
| 02 | História | creme | pequena e distante à esquerda, virada 180° |
| 03 | Sabor | magenta | aproxima da câmera, luz intensa, entre camadas de texto |
| 04 | Produto | rosa claro | centralizada, dá uma volta completa enquanto legendas surgem |
| 05 | Maranhão | vermelho | cruza a tela na diagonal, luz quente |
| 06 | Final | vinho | volta grande e para com o logo de frente; faixas de cinema |

A identidade visual parte da embalagem real: painel azul, faixa branca com arabescos (inspirados nos azulejos de São Luís) e painel rosa.

---

## Destaques técnicos

### 1. Uma lata só, do início ao fim
O canvas 3D é montado **uma vez** no `App`, fixo atrás do conteúdo. Nenhuma seção possui a lata: cada uma apenas "dirige" a pose dela através de um roteiro. Assim não há recriação de cena nem saltos entre seções.

### 2. Roteiro por keyframes ancorados em seções
[`src/animations/scrollTimeline.ts`](src/animations/scrollTimeline.ts)

O movimento é descrito como uma lista de keyframes (posição, rotação, escala, câmera, luz). Cada keyframe é **preso a uma seção do HTML**, não a uma porcentagem fixa: na montagem, a posição real de cada seção é medida e convertida em progresso de scroll. Se o texto crescer ou a tela mudar, o roteiro se reajusta sozinho.

Esses keyframes viram uma timeline GSAP pausada de duração 1, cujo progresso é controlado pelo ScrollTrigger. A timeline não toca no Three.js: ela interpola um objeto simples (`scenePose`) que o loop de render lê a cada frame. Desktop e mobile têm roteiros diferentes (o mobile é derivado do desktop).

### 3. Um único relógio
[`src/animations/smoothScroll.ts`](src/animations/smoothScroll.ts)

Lenis (scroll suave), ScrollTrigger e Three.js são sincronizados pelo `gsap.ticker`. O estado do scroll vive em um store mutável fora do React ([`scrollStore.ts`](src/state/scrollStore.ts)): 60 atualizações por segundo **sem nenhum re-render**.

### 4. Interação com a lata através do HTML
[`src/hooks/useCanInteraction.ts`](src/hooks/useCanInteraction.ts)

O canvas fica atrás do conteúdo com `pointer-events: none` (para textos e links continuarem clicáveis), então não dá para usar raycasting. Solução: a cada frame a silhueta da lata é **projetada na tela como uma cápsula 2D**, e os eventos da janela são testados contra ela.

- arrastar gira com inércia; arrastar na vertical inclina
- clique/toque dá um giro de 360°
- no celular, deslizar na horizontal gira e deslizar na vertical continua rolando a página
- nas cenas de destaque a lata "assenta" com o logo de frente, mas só depois de ~2 s sem interação

### 5. Lata e rótulo 100% procedurais
- **Modelo:** [`PlaceholderCan.tsx`](src/three/PlaceholderCan.tsx) constrói a lata de 350 ml com `LatheGeometry` (perfis girados como num torno): ombro, borda, fundo côncavo, anel e rebite.
- **Rótulo:** [`labelTexture.ts`](src/three/labelTexture.ts) pinta a embalagem em um `<canvas>` e a envia como textura. Nenhuma imagem é baixada.
- **Arabescos:** [`ornament.ts`](src/three/ornament.ts) gera as volutas com espirais logarítmicas, Bézier e traços de espessura variável. Os **mesmos caminhos SVG** são usados no rótulo 3D e nos grafismos da página.

### 6. Pronto para o modelo final
Coloque `public/models/guarana-jesus-can.glb` e ele substitui o placeholder automaticamente: é detectado, normalizado em escala e centro e protegido por um Error Boundary. Da mesma forma, `public/textures/guarana-jesus-label.png` substitui o rótulo procedural.

### 7. Profundidade sem pós-processamento
- **Bolhas:** `InstancedMesh` com shader fresnel, todas as bolhas em um único draw call.
- **Bokeh:** `Points` com shader de disco suave, próximos e distantes da câmera.
- **Camadas:** texto (HTML) → lata (canvas) → texto gigante (fundo), como na seção Sabor.
- **Parallax:** várias velocidades nos grafismos, na câmera e nas partículas.

### 8. Transições de cor que não cobrem a lata
[`src/animations/sectionTransitions.ts`](src/animations/sectionTransitions.ts)

As cores ficam em painéis **atrás** do canvas. Cada painel sobe acompanhando sua seção, com uma crista orgânica em SVG e uma faixa de cor de acento correndo à frente.

---

## Performance e acessibilidade

- **Code splitting:** o Three.js (~280 KB gzip) é carregado com `React.lazy`, então o HTML aparece antes.
- **Resolução:** DPR limitado (1.75 no desktop, 1.4 no mobile), com `PerformanceMonitor` reduzindo a resolução se o FPS cair.
- **Mobile mais leve:** menos partículas, rótulo em 2048 px e sem antialias.
- **Memória:** vetores pré-alocados no loop e `dispose()` de geometrias e texturas criadas manualmente.
- **Movimento:** `prefers-reduced-motion` desliga o scroll suave, o giro automático e as animações decorativas.
- **Leitores de tela:** textos quebrados em palavras recebem `aria-label` com a frase completa, e a cena 3D é `aria-hidden`.

---

## Estrutura

```
src/
├── main.tsx                 ponto de entrada
├── App.tsx                  empilha as camadas e liga os sistemas de animação
├── animations/
│   ├── smoothScroll.ts      Lenis + gsap.ticker
│   ├── scrollTimeline.ts    roteiro da lata, câmera e luz
│   ├── sectionTransitions.ts cores das seções e parallax do fundo
│   └── textAnimations.ts    revelações de texto (data-reveal)
├── three/
│   ├── GuaranaScene.tsx     canvas persistente
│   ├── GuaranaCan.tsx       pose final da lata (roteiro + interação)
│   ├── PlaceholderCan.tsx   lata modelada por código
│   ├── GLBCan.tsx           carregador do modelo final
│   ├── labelTexture.ts      rótulo desenhado em canvas
│   ├── ornament.ts          gerador dos arabescos
│   ├── Lights.tsx           estúdio virtual (Environment + luzes)
│   ├── CameraRig.tsx        câmera guiada pelo scroll
│   └── Particles.tsx        bolhas e bokeh
├── components/              seções, navegação, cursor, camada de fundo
├── hooks/                   useScrollProgress, useCanInteraction, useMediaQuery
├── state/                   stores mutáveis (scroll, ponteiro, interação)
└── styles/                  tokens e estilos globais
```

Cada arquivo começa com um cabeçalho explicando sua responsabilidade e as decisões técnicas envolvidas.

---

## Rodando localmente

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # verificação de tipos + build de produção
npm run preview   # serve o build
```

---

## Créditos e aviso

Projeto **conceitual e não oficial**, criado para portfólio. Guaraná Jesus é marca de seus respectivos titulares. A lata e o rótulo são recriações ilustrativas feitas por código; o logotipo não é a arte oficial.

Referências históricas: o refrigerante foi criado em São Luís (MA) pelo farmacêutico Jesus Norberto Gomes, em 1927 segundo a maioria das fontes (algumas citam os anos 1920). O slogan "O sabor de viver o Maranhão" é da marca.
