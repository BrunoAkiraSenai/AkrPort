---
name: Bruno Akira Furumori — Portfólio
description: Folha de dados técnica de um desenvolvedor back-end e dados
colors:
  desk: "#e3e6e2"
  paper: "#f6f7f4"
  ink: "#0e1a2b"
  ink-2: "#36424f"
  ink-3: "#5b6674"
  signal: "#ffd31a"
  blueprint: "#1f4fd8"
  ok: "#17804a"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(3.25rem, 8.4vw, 5.25rem)"
    fontWeight: 700
    lineHeight: 0.86
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 0.95
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  lede:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 1.6vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.55
  data:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    letterSpacing: "0.05em"
rounded:
  none: "0px"
spacing:
  sheet-pad: "clamp(1.25rem, 3.2vw, 2.75rem)"
  sheet-gap: "clamp(1.25rem, 2.5vw, 2rem)"
  grid: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "0.8rem 1.15rem"
  button-primary-hover:
    backgroundColor: "{colors.blueprint}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.8rem 1.15rem"
  button-secondary-hover:
    backgroundColor: "{colors.signal}"
  role-mark:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
---

# Design System: Bruno Akira Furumori — Portfólio

## Overview

**Creative North Star: "A folha de dados do engenheiro"**

O portfólio é um datasheet técnico. As seções são folhas de papel sobre uma mesa cinza, com borda de tinta, uma grade milimetrada leve e, quando há o que dizer, uma faixa de rodapé com a fonte ou a data de revisão. Em vez de anunciar habilidades, a página mostra como cada sistema funciona: um diagrama de fluxo (origem → processamento → dados → interface) e tabelas de especificação com fatos tirados dos READMEs e do LinkedIn.

O mundo recusa o padrão da categoria ("dev dark com neon e partículas") e também o oposto previsível (editorial em creme com serifa). O amarelo de sinalização não é enfeite: ele marca o que importa agora, como o cargo, o emprego atual e o bloco de contato.

**Key Characteristics:**
- Papel frio sobre mesa cinza, bordas de 1px em tinta e cantos sem raio.
- Títulos em condensada maiúscula, como em placas e title blocks de desenho técnico.
- Mono só onde há dado: datas, números de folha, rótulos de tabela.
- Tabelas de especificação no lugar de cards e badges.
- Um único momento de movimento: os conectores do diagrama se desenham uma vez, e no hover o fluxo do projeto se acende.

## Colors

Estratégia: restrita com um acento comprometido. O papel e a tinta carregam a página; o amarelo ocupa campos inteiros quando aparece.

### Primary
- **Tinta** `#0e1a2b`: texto, bordas, botão primário, fios do diagrama.
- **Amarelo de sinalização** `#ffd31a`: o campo do cargo, a etiqueta "Atual", o fundo do bloco de contato, a seleção de texto e o realce das linhas em hover (com 16–24% de opacidade).

### Secondary
- **Azul de prancheta** `#1f4fd8`: links, foco, o tracejado animado do diagrama e o hover do botão primário.

### Neutral
- **Papel** `#f6f7f4`: o fundo das folhas.
- **Mesa** `#e3e6e2`: o fundo da página, entre as folhas.
- **Tinta 2** `#36424f`: texto corrido secundário e rótulos de tabela.
- **Tinta 3** `#5b6674`: metadados e subtítulos (contraste de cerca de 5,3:1 sobre o papel).
- **OK** `#17804a`: só o ponto de status "Aberto a conversas".

### Named Rules
**The Signal Rule.** O amarelo marca estado ou ação: cargo atual, emprego atual, contato. Nunca entra como decoração.

## Typography

- **Display / títulos:** Barlow Condensed 700, sempre em maiúsculas, com line-height entre 0,86 e 0,95.
- **Corpo:** Barlow 400/500/600, 1,0625rem com line-height 1,6, e medida de até 58–62ch.
- **Dados:** JetBrains Mono 400/500, de 0,75 a 0,8125rem, com algarismos tabulares.

### Hierarchy
O nome na capa (até 5,25rem) é maior que os títulos de seção (até 3,5rem), que são maiores que o nome de cada projeto (até 3,25rem). Os rótulos mono em caixa alta ficam dentro das tabelas, nunca acima de um título.

### Named Rules
**The Data-Only Mono Rule.** Mono só para datas, números, rótulos de tabela e código. Nunca como fantasia de "tech".

## Layout

- Conteúdo com largura máxima de 1240px. As folhas ficam empilhadas com espaçamento entre `clamp(1.25rem, 2.5vw, 2rem)` e padding interno de `clamp(1.25rem, 3.2vw, 2.75rem)`.
- **Capa:** grade de duas colunas (texto + title block de 22rem), com o diagrama de fluxo ocupando toda a largura logo abaixo.
- **Projetos:** proporção de 5/7 entre texto e figura, que vira 7/5 quando a figura é vertical.
- **Pontos de quebra:**
  - Até 1020px, a capa fica em uma coluna.
  - Até 900px, o diagrama vira uma cadeia vertical, com setas para baixo entre os nós e a coluna de cada nó rotulada dentro dele, e as figuras sobem para o topo dos projetos.
  - Até 760px, o menu vira disclosure e as tabelas viram blocos.

## Elevation & Depth

Profundidade mínima: as folhas têm sombra suave com deslocamento (`0 1px 2px` mais `0 12px 32px -18px`) para se descolarem da mesa. Os demais elementos ficam planos e são separados por bordas.

## Shapes

Cantos retos em tudo (raio 0). As únicas formas redondas são o ponto de status e o ícone do Instagram.

## Components

### Buttons
- **Primário:** fundo de tinta e texto papel. No hover, vira azul de prancheta. No active, desce 1px.
- **Secundário:** fundo papel, borda de tinta e hover em amarelo.
- **Na folha de contato (amarela):** o primário é tinta com texto amarelo; o secundário é transparente e, no hover, fica tinta.

### Navigation
- Barra fixa no topo em papel, com borda inferior de tinta e a marca "BA" num quadrado amarelo.
- Os links ganham borda de tinta no hover.
- O seletor de idioma usa mono e é emoldurado.
- No celular, o botão "Menu" abre a lista.

### Title block (ficha)
Uma tabela com borda de tinta: foto quadrada à esquerda e nome e local à direita, seguidas de linhas com rótulo mono e valor.

### Spec table
Uma `dl` em grade de 7,5rem + 1fr, com rótulo mono à esquerda, divisória em `--line` e borda externa de tinta.

### Flow diagram (componente assinatura)
- Cada linha é um link para a ficha do projeto e contém quatro nós de borda de tinta ligados por fios de 2px com ponta de seta.
- Os fios se desenham da esquerda para a direita uma única vez.
- No hover ou no foco, a linha ganha fundo amarelo translúcido, os nós ficam com borda azul e os fios viram tracejado azul animado.

### Sheet strip
Uma faixa no rodapé da folha, só quando carrega informação real: a fonte dos dados (README, LinkedIn) ou a data de revisão. Nunca repete o título da seção nem numera as folhas.

## Do's and Don'ts

### Do:
- Do mostrar como um sistema funciona, com diagrama ou tabela de especificação, antes de listar tecnologias.
- Do usar o amarelo em campos inteiros que marcam estado ou ação.
- Do manter bordas de 1px em tinta e cantos retos.
- Do traduzir todo o texto novo para EN, com o mesmo conteúdo do PT.

### Don't:
- Don't usar gradiente em texto, glass decorativo, partículas ou brilho neon.
- Don't colocar kicker ou eyebrow acima de um título.
- Don't usar cards iguais de ícone + título + texto como estrutura da página.
- Don't usar mono como fantasia de "tech".
- Don't inventar métricas, clientes ou depoimentos.
