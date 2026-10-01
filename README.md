# Livro de Contas

Controle de despesas compartilhadas para um grupo: registre quem pagou, escolha os participantes e acompanhe quem deve a quem.

## Status

Checklist funcional implementado, com React, API Express e persistência SQLite. Esta versão é um **livro local de um único grupo**, executado na própria máquina. O servidor escuta somente em `127.0.0.1`.

## Funcionalidades implementadas

- [x] Estrutura base da página (cabeçalho, seções)
- [x] Layout em colunas (Pessoas / Quem deve a quem), com adaptação para celular
- [x] Cadastro de pessoas do grupo
- [x] Cadastro de gastos (descrição, valor, data e quem pagou)
- [x] Divisão igualitária do gasto entre os participantes selecionados
- [x] Cálculo automático de saldo por pessoa
- [x] Simplificação de dívidas por saldo (até n−1 acertos entre n pessoas com saldo)
- [x] Histórico de lançamentos (editar/excluir, detalhes das cotas e paginação)
- [x] Persistência de dados (backend + banco SQLite)

Os acertos são sugestões. Transferências realmente realizadas entre pessoas ainda não são registradas no livro. O algoritmo concilia devedores e credores e reduz a necessidade de pagamentos par a par, mas **não garante o mínimo matemático global de transações**.

## Como rodar

Requisito: **Node.js 24.14 ou superior**, com npm. O SQLite é fornecido pelo módulo `node:sqlite`, sem instalar outro servidor de banco. A API utilizada está documentada em [Node.js SQLite](https://nodejs.org/api/sqlite.html).

Execute os comandos na raiz do repositório:

```sh
npm run setup
npm run dev
```

Abra `http://127.0.0.1:5173`. O comando inicia o frontend e o backend juntos. Interrompa com Ctrl+C.

Para usar o build de produção local, com um único servidor:

```sh
npm run build
npm start
```

Abra `http://127.0.0.1:3000`. O backend serve o build do frontend e a API na mesma origem. `vite preview` sozinho não é a forma de executar a aplicação completa.

## Configuração e dados

Opcionalmente, copie `.env.example` para `.env` na raiz. Os comandos `dev` e `start` carregam esse arquivo.

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `3000` | Porta do backend local |
| `FRONTEND_PORT` | `5173` | Porta do Vite e origem autorizada em desenvolvimento |
| `DATABASE_PATH` | `Backend/data/livro.sqlite` | Caminho do SQLite; prefira um caminho absoluto ao configurar |

O banco é criado automaticamente e permanece depois que o servidor é desligado. Banco, arquivos `.env`, builds e dependências instaladas são ignorados pelo Git. `package-lock.json` permanece versionado. Para backup, desligue o servidor e copie o arquivo SQLite; não copie somente o arquivo principal enquanto há escritas em andamento, pois o modo WAL pode ter dados em arquivos auxiliares.

## Regras do livro

- Nomes são normalizados, limitados a 80 caracteres e únicos sem distinguir maiúsculas e minúsculas. Use nomes distintos para homônimos.
- Descrições têm até 200 caracteres. Valores devem ser positivos, até R$ 1.000.000,00 por despesa. Digite `150,90` ou `150.90`, sem separadores de milhares.
- Cada despesa tem um pagador e ao menos um participante. Quem paga pode ficar fora da divisão.
- Valores são armazenados e calculados em **centavos inteiros**. Uma divisão de R$ 1,00 entre três pessoas gera R$ 0,34, R$ 0,33 e R$ 0,33. Centavos restantes seguem a ordem de cadastro entre as pessoas selecionadas.
- Saldo positivo significa valor a receber; saldo negativo significa valor a pagar. A soma dos saldos é zero.
- A data deve existir, estar entre 1900 e hoje e não é convertida para outro fuso na apresentação.
- Pessoas associadas a despesas não podem ser removidas. Edite ou exclua os lançamentos associados primeiro.
- Editar e excluir recalcula os saldos. Antes de excluir, a interface pede confirmação.
- O livro aceita até 100 pessoas e 10.000 despesas. O histórico mostra 20 por página.
- Uma revisão do livro acompanha cada alteração. Uma janela desatualizada recebe um conflito em vez de sobrescrever dados de outra janela. Use “Atualizar livro” para carregar alterações externas.
- Em uma falha de conexão durante o envio, a operação pode ter sido gravada. Atualize o livro e confira antes de reenviar.

## API

| Método | Caminho | Resultado |
|---|---|---|
| GET | `/api/health` | Estado do serviço |
| GET | `/api/livro` | Livro, revisão, pessoas, despesas, saldos e acertos |
| GET | `/api/pessoas` | Pessoas |
| POST | `/api/pessoas` | Adiciona `{ name }` |
| DELETE | `/api/pessoas/:id` | Remove uma pessoa sem despesas |
| GET | `/api/gastos` | Despesas e cotas |
| POST | `/api/gastos` | Adiciona uma despesa |
| PUT | `/api/gastos/:id` | Substitui uma despesa |
| DELETE | `/api/gastos/:id` | Remove uma despesa |
| GET | `/api/saldos` | Saldos e sugestões de acerto |

As escritas exigem `Origin` autorizado e `If-Match` contendo a revisão entre aspas, por exemplo `"3"`. POST/PUT exigem JSON. A despesa recebe `description`, `amountCents`, `payerId`, `participantIds` e `date`. As cotas e os saldos são calculados no servidor; o cliente não pode fornecê-los. As respostas de escrita devolvem o livro atualizado.

## Arquitetura

```text
Frontend/src/components/  Interface React e formulários
Frontend/src/api.js       Comunicação com a API
shared/ledger.mjs         Validação, divisão, saldos e acertos
Backend/index.js          HTTP, controles de acesso local e erros
Backend/store.js          SQLite com SQL parametrizado e transações
tests/                    Testes de domínio, persistência e API
scripts/dev.mjs           Inicialização do ambiente local
```

A API recebe o repositório por injeção. As regras financeiras não dependem de React, Express ou SQLite. Saldos têm custo O(P + S), em que P é o número de pessoas e S é o total de cotas; a sugestão de acertos tem custo O(P log P). SQLite é síncrono e a API carrega o livro completo: adequado a este livro local com limites, mas deve evoluir para consultas paginadas e uma estratégia de concorrência antes de atender vários grupos em rede.

## 🛡️ Notas de Segurança

Entradas são validadas no servidor e nos formulários. Consultas usam parâmetros; despesas e cotas são gravadas na mesma transação, com chaves estrangeiras. React apresenta os textos como texto escapado, sem interpretar HTML fornecido pelo usuário. Origens e hosts locais são verificados, escritas exigem revisão, o corpo JSON tem limite de 16 KB e há limite de 600 requisições por minuto no servidor local. Cabeçalhos de segurança seguem as recomendações de [segurança do Express](https://expressjs.com/en/advanced/best-practice-security/). Erros internos ficam em logs estruturados e a API retorna mensagens genéricas.

**Esta versão não possui autenticação, autorização por grupo nem criptografia do banco.** Qualquer processo ou pessoa com acesso à máquina e ao serviço local pode usar o livro; proteja a conta do sistema e os backups. Não exponha a porta por túnel, proxy público ou rede. Para multiusuário, implemente autenticação e autorização por grupo antes de ampliar o acesso.

## Verificação

```sh
npm test
npm run lint
npm run build
```

Os testes cobrem centavos restantes e valores mínimos/máximos, entradas inválidas, referências inexistentes, SQL tratado como dados, persistência após reabrir o banco, edição/exclusão com recálculo, rollback, conflito de versão, origem/host não autorizados, corpo excessivo e JSON malformado. Fixtures de teste não usam o banco real do livro.

## Próximas etapas

1. Divisão personalizada por valores ou proporções.
2. Registro de acertos efetivamente pagos.
3. Autenticação e autorização por grupo, antes do uso multiusuário.
4. Categorias, filtros e exportação.
5. Paginação na API e evolução do armazenamento conforme volume e concorrência.

## Identidade visual

Estética de livro-caixa: verde escuro `#0F2B22`, papel `#F7F1E1`, dourado `#B8873B` e terracota `#9C3B2E`. Títulos em serifa e valores com números tabulares. A interface se adapta a celulares e fornece rótulos, foco visível e mensagens acessíveis.

## Licença

Projeto pessoal, sem licença definida ainda.
