# Livro de Contas

Controle de gastos compartilhados — um "Splitwise" simplificado para dividir contas entre repúblicas, casais, amigos ou qualquer grupo que precise saber **quem deve o quê pra quem**.

> Projeto pessoal em desenvolvimento, construído do zero como forma de aprender React e Node.js na prática.

---

## O problema

Quando um grupo divide gastos recorrentes (aluguel, mercado, contas de casa, viagens), é muito fácil perder o controle de quem já pagou o quê, quanto cada um deve, e pra quem. Esse projeto resolve isso com um registro centralizado dos gastos e cálculo automático dos saldos.

---

## Status do projeto

**Em desenvolvimento — fase inicial (frontend).**

Ainda não há backend, API ou banco de dados. Tudo roda no navegador, com o estado gerenciado localmente no React.

---

## Stack atual

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | **React** | Componentes via JSX |
| Build/Dev server | **Vite** | Ambiente de desenvolvimento e build de produção |
| Estilização | **CSS puro** | Sem framework de CSS por enquanto |
| Backend | *(ainda não implementado)* | Planejado: Node.js + Express |
| Banco de dados | *(ainda não implementado)* | A definir — possivelmente SQLite no início, migrando para PostgreSQL/MongoDB depois |

---

## Funcionalidades implementadas

- [x] Estrutura base da página (cabeçalho, seções)
- [x] Layout em colunas (Pessoas / Quem deve quem) com CSS Grid
- [ ] Cadastro de pessoas do grupo
- [ ] Cadastro de gastos (descrição, valor, quem pagou)
- [ ] Divisão do gasto entre participantes
- [ ] Cálculo automático de saldo por pessoa
- [ ] Simplificação de dívidas (quem paga direto pra quem, minimizando transações)
- [ ] Histórico de lançamentos (editar/excluir)
- [ ] Persistência de dados (backend + banco de dados)

> Este checklist deve ser atualizado conforme o projeto avança.

---

## Roadmap

1. **Frontend funcional (estado local)**
   Cadastro de pessoas e gastos, cálculo de saldo, tudo via `useState`, sem persistência ainda.
2. **Divisão flexível**
   Permitir divisão customizada (não só igualitária) entre os participantes.
3. **Backend com Node.js + Express**
   API REST (`/pessoas`, `/gastos`, `/saldos`) para persistir os dados.
4. **Banco de dados**
   Passar de arquivo local/memória para um banco de verdade.
5. **Multiusuário**
   Cada pessoa do grupo acessando e lançando seus próprios gastos.
6. **Refinamentos**
   Categorias de gastos, filtros, exportação de resumo, autenticação.

---

## Estrutura do projeto

```
livro-de-contas/
├── public/
├── src/
│   ├── assets/          # imagens, ícones
│   ├── App.jsx          # componente principal
│   ├── App.css          # estilos globais da aplicação
│   └── main.jsx         # ponto de entrada do React
├── index.html           # casca HTML onde o React é montado
├── package.json
└── README.md
```

> Estrutura sujeita a mudanças conforme o projeto crescer (ex: pasta `components/` quando o app for dividido em componentes menores, pasta `server/` quando o backend for adicionado).

---

## Como rodar localmente

```bash
# instalar dependências
npm install

# rodar em ambiente de desenvolvimento
npm run dev
```

O projeto abrirá em `http://localhost:5173` (porta padrão do Vite).

---

## Identidade visual

O projeto usa uma estética inspirada em **livros-caixa/contábeis antigos**: tons de verde escuro e papel/marfim, com números em fonte monoespaçada (para alinhamento tabular) e títulos em serifa.

| Cor | Hex | Uso |
|---|---|---|
| Verde escuro | `#0F2B22` | Cabeçalho, elementos de destaque |
| Papel (fundo) | `#F7F1E1` | Fundo principal |
| Papel escuro | `#EFE6CE` | Contraste sutil dentro do fundo |
| Dourado | `#B8873B` | Acentos, valores positivos |
| Terracota/vinho | `#9C3B2E` | Valores devidos/negativos |

---

## Notas de desenvolvimento

Espaço para registrar decisões, dúvidas resolvidas ou aprendizados ao longo do projeto:

- _(adicionar conforme o projeto avança)_

---

## Licença

Projeto pessoal, sem licença definida ainda.
