# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dois públicos com peso parecido (confirmado pelo Akira em 2026-11-25):

- **Recrutadores e tech leads.** Avaliam um candidato a estágio ou vaga júnior de back-end e dados, em geral no desktop durante o expediente e às vezes no celular. Decidem em segundos se vale abrir os projetos.
- **Clientes freelance.** Querem saber se ele consegue construir e manter um sistema de ponta a ponta.

## Product Purpose

É o portfólio pessoal de Bruno Akira Furumori. O site deu certo quando o visitante **abre os projetos** e **entra em contato** (por e-mail ou LinkedIn). O currículo em PDF é uma ação secundária.

## Positioning

Ele trabalha com back-end e dados e tem experiência real de operação: no estágio de sustentação, mantém middleware crítico no ar (portfólio WSO2, ITIL, deploys em Kubernetes). Nos projetos pessoais, constrói pipelines de dados completos, da coleta até a interface. Poucos estudantes conseguem mostrar operação e construção ao mesmo tempo.

## Operating Context

O site é estático, com um único `index.html`, hospedado no Firebase Hosting (projeto `portifolio-5c039`) e no domínio akirafurumori.com.br. O contador de visitas grava no Firestore do projeto `portfolio-akr-site`. O site tem duas línguas, PT (padrão) e EN.

## Evidence on Hand

- **Currículo:** `PDFs/Linkedin/Profile.pdf`, o export do LinkedIn de nov/2026.
- **Projetos:**
  - **AkrScout:** scraper em Python e httpx rodando diariamente no GitHub Actions, gravando em Supabase/PostgreSQL (6 tabelas, 6 views, deduplicação por hash), com front em React 19 publicado na Vercel. Código: github.com/BrunoAkiraSenai/akrscout. No ar: akrscout.vercel.app.
  - **AkrGym:** React 19 e Vite, Firebase (Auth, Firestore e Hosting) e Gemini AI para calcular macros. No ar: akrgym.web.app.
  - **EstacaoAkira:** React Native e Expo, Axios consumindo APIs REST de clima, AsyncStorage e Victory Charts.
- **Imagens:** screenshots em `FotosProjetos/`, além da foto do Bruno e das logos de Digiage, Anhembi Morumbi, SENAI, FIAP e KodeKloud.
- **Certificados:** 8, em `PDFs/Certificados/`.
- **O que não existe e não deve ser inventado:** depoimentos, métricas de uso dos projetos e clientes freelance anteriores.

## Product Principles

1. Mostrar como os sistemas funcionam em vez de só listar tecnologias.
2. Cada afirmação técnica precisa ter fonte no LinkedIn, nos READMEs ou no código.
3. O caminho até os projetos e o contato precisa estar visível o tempo todo.
4. PT e EN devem ter o mesmo conteúdo.
