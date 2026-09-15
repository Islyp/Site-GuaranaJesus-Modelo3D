# Modelo 3D da lata

Coloque aqui o arquivo final:

    public/models/guarana-jesus-can.glb

A aplicação detecta o arquivo automaticamente e substitui o placeholder
procedural (src/three/PlaceholderCan.tsx). Nenhuma outra alteração é necessária:
o modelo é centralizado e normalizado para a altura de referência
(CAN_HEIGHT em src/three/canDimensions.ts).

Recomendações para o GLB:
- lata em pé no eixo Y, frente do rótulo voltada para +X
- materiais PBR (metalness/roughness); alumínio com metalness ~1
- texturas em KTX2 ou WebP, até 2048px
- compressão Draco/Meshopt, idealmente < 2 MB
