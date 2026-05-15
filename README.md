# 🏠 Controle de Locações
> Sistema financeiro para gestão de locações — Família Tamura
Aplicação web *single-page* para controle financeiro familiar com suporte a múltiplas lojas, distribuição de lucros entre sócios, cálculo de Imposto de Renda (Carnê-Leão) e extratos individuais. Construída com **Firebase** e **JavaScript vanilla** — sem frameworks, sem build tools, zero dependências npm.
---
## 📋 Índice
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Estrutura](#-estrutura-do-projeto)
- [Modelo de Dados](#-modelo-de-dados)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Como Usar](#-como-usar)
- [Roadmap](#️-roadmap)
- [Autor](#-autor)
---
## ✨ Funcionalidades
### 📊 Dashboard Financeiro
- Saldo atual, total de entradas e saídas, maior transação do período
- Lucro operacional e saldo real após distribuições
- Meta individual por sócio com rateio centavo-perfeito
### 📝 Lançamentos
- Tabela editável em tempo real com adição, edição e exclusão inline
- Filtro por mês e saldo acumulado automático
- Sincronização via Firestore `onSnapshot`
### 💰 Distribuição de Lucros
- Saques e depósitos por sócio com controle por mês de referência
- Saldo individual atualizado automaticamente
### 🧾 Imposto de Renda (Carnê-Leão)
- Cálculo individual por CPF (lucro ÷ 2 por sócio)
- Tabela progressiva 2025 configurável visualmente
- Pagamento com data no mês seguinte (padrão Receita Federal)
- Controle de valores pagos vs. pendentes por mês
### 📑 Extratos Individuais
- Extrato completo por sócio com rateio 50/50 de todos os lançamentos
- Saldo acumulado por data
### 🔄 Backup
- Exportação completa para JSON
- Importação com validação e transações atômicas em lote
---
## 🚀 Tecnologias
| Tecnologia | Finalidade |
|---|---|
| **Firebase Firestore** | Banco NoSQL em tempo real |
| **Firebase Auth** | Login com Google OAuth |
| **Firebase Hosting** | Hospedagem estática com CDN |
| **JavaScript ES2022** | Lógica da aplicação (módulos nativos) |
| **CSS3** | Design system com variáveis, dark mode |
| **HTML5** | Estrutura semântica |
> Firebase carregado via CDN (`https://www.gstatic.com/firebasejs/12.13.0/`). Nenhuma dependência local.
---
## 📁 Estrutura do Projeto
```
.
├── index.html              # SPA — entrada única
├── script.js               # Lógica completa da aplicação
├── style.css               # Design system e estilos
├── firebase.js             # Inicialização e exports do Firebase
├── firestore.rules         # Regras de segurança do Firestore
├── firebase.json           # Configuração do Firebase Hosting
├── .firebaserc             # Projeto Firebase ativo
├── imagem/
│   ├── 4127f12f-....png    # Logo — login e favicon
│   └── FamiliaTamura.png   # Logo — cabeçalho do dashboard
└── README.md
```
---
## 🗄️ Modelo de Dados
### Coleção `lancamentos`
| Campo | Tipo | Descrição |
|---|---|---|
| `data` | `string` | `YYYY-MM-DD` |
| `loja` | `string` | `Eletronica`, `Casa do Norte`, `Bar`, `Hotel`, `IR`, `Outros` |
| `lancamento` | `string` | `entrada` ou `saida` |
| `valor` | `number` | Positivo para entrada, negativo para saída |
| `observacao` | `string` | Descrição livre |
| `userId` | `string` | UID do usuário |
| `ordem` | `number` | Ordenação |
| `createdAt` | `Timestamp` | Data de criação |
| `mesReferencia` | `string` | Mês de referência para IR |
### Coleção `distribuicoes`
| Campo | Tipo | Descrição |
|---|---|---|
| `mes` | `string` | Mês de referência `YYYY-MM` |
| `data` | `string` | Data da transação |
| `pessoa` | `string` | `Sandra` ou `Suely` |
| `tipo` | `string` | `entrada` (depósito) ou `saida` (saque) |
| `valor` | `number` | Valor |
| `observacao` | `string` | Descrição livre |
| `userId` | `string` | UID do usuário |
| `ordem` | `number` | Ordenação |
| `createdAt` | `Timestamp` | Data de criação |
### Coleção `config`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string` | `"tabelaIR"` |
| `faixas` | `array` | Faixas de IR com `ate`, `aliquota`, `deducao` |
---
## 🔧 Instalação
### Pré-requisitos
- Conta no [Firebase Console](https://console.firebase.google.com)
- Node.js 18+ (para Firebase CLI)
### Passo a passo
```bash
# Clone
git clone https://github.com/seu-usuario/controle-locacoes.git
cd controle-locacoes
# Instale a CLI do Firebase
npm install -g firebase-tools
# Login no Firebase
firebase login
```
### Servir localmente
```bash
npx serve .
# ou
python3 -m http.server 8080
```
---
## ⚙️ Configuração
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative **Authentication** → **Google** como provedor
3. Crie um banco **Cloud Firestore** (modo produção)
4. Copie as credenciais para `firebase.js`:
```js
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO_ID",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};
```
5. Atualize `.firebaserc` com o ID do seu projeto
### Deploy
```bash
firebase deploy --only firestore:rules
firebase deploy --only hosting
```
---
## 🎯 Como Usar
1. Acesse a URL do projeto e faça login com Google
2. Adicione lançamentos de entrada e saída por loja
3. Acompanhe o dashboard para visão geral
4. Registre distribuições de lucro entre os sócios
5. No fim do mês, calcule e pague o IR pela aba específica
6. Consulte extratos individuais para prestação de contas
7. Faça backup regular dos dados
### Exemplo
```js
// Lançamento de entrada
{
  data: "2026-05-13",
  loja: "Bar",
  lancamento: "entrada",
  valor: 1500.00,
  observacao: "Vendas do dia"
}
// Rateio justo entre 2 pessoas
rateio(100.01, 2) // → [50.01, 50.00]
```
---
## 🛣️ Roadmap
- [x] Autenticação com Google
- [x] CRUD de lançamentos em tempo real
- [x] Dashboard financeiro
- [x] Distribuição de lucros
- [x] Cálculo de IR (Carnê-Leão)
- [x] Extratos individuais
- [x] Backup e importação
- [ ] Multi-idioma (pt-BR / en)
- [ ] Relatórios mensais em PDF
- [ ] Gráficos de evolução financeira
- [ ] Notificações de vencimento de IR
- [ ] Modo escuro adicional
---
## 👤 Autor
**Família Tamura**
Sistema desenvolvido para gestão financeira familiar de locações comerciais.
