# Plano para banco compartilhado e acesso multiusuário

Registrado em: **01/10/2026**.

**Status: planejamento aprovado para guardar como referência. A implementação está pendente.**

## Objetivo

Permitir que várias pessoas acessem o mesmo grupo pela internet, registrem despesas e acompanhem os saldos, com controle de acesso para proteger os dados de cada grupo.

## Estado atual

O Livro de Contas tem frontend React, API Node.js com Express e um banco SQLite local. Já permite cadastrar pessoas, registrar despesas, dividir valores entre participantes, calcular saldos, sugerir acertos e editar ou excluir lançamentos.

A versão atual atende um único grupo na própria máquina. Não possui autenticação nem autorização por grupo. O servidor está restrito a `127.0.0.1`. O arquivo SQLite contém os dados locais e não é enviado ao GitHub.

## Arquitetura proposta

Manter o React, ampliar a API em Node.js e usar PostgreSQL para os dados compartilhados.

Fluxo de uma solicitação:

1. A pessoa entra em sua conta.
2. O navegador solicita os dados à API.
3. A API valida a sessão e verifica se a pessoa pertence ao grupo.
4. A API verifica se sua permissão permite a operação solicitada.
5. A API consulta ou altera o PostgreSQL.
6. A API devolve ao navegador somente os dados autorizados.

**O navegador nunca acessa o PostgreSQL diretamente.** As credenciais do banco ficam somente no servidor.

## Modelo de dados proposto

| Entidade | Responsabilidade |
|---|---|
| Usuários | Nome, e-mail e hash seguro da senha |
| Grupos | Cada conjunto de pessoas que divide despesas |
| Membros | Vínculo entre usuário e grupo, com sua permissão |
| Despesas | Grupo, descrição, valor, data e quem pagou |
| Cotas | Quanto da despesa cabe a cada participante |

As despesas e suas referências devem pertencer ao mesmo grupo. O vínculo com o grupo precisa ser verificado pelo servidor, mesmo quando o cliente envia identificadores aparentemente válidos.

Os detalhes das permissões e o vínculo entre os participantes locais existentes e as futuras contas de usuário serão definidos antes da migração.

## Regras financeiras e integridade

- Continuar armazenando e calculando valores em **centavos inteiros**.
- Preservar a soma exata das cotas, inclusive quando sobra um centavo na divisão.
- Gravar a despesa e todas as suas cotas em uma única transação. Se alguma parte falhar, nada fica salvo pela metade.
- Recalcular os saldos depois de criar, editar ou excluir despesas.
- Manter a verificação de versão para evitar que alterações simultâneas sobrescrevam dados sem aviso.
- Preservar as referências entre pessoas, despesas e cotas durante a migração.

## Controle de acesso

Todas as operações precisam verificar a participação e a permissão da pessoa no grupo: leitura, cadastro, edição e exclusão.

Conhecer o identificador de uma despesa ou de um grupo não pode permitir acesso a ele. A autorização deve acontecer na API em cada operação, independentemente das restrições exibidas na interface.

## 🛡️ Notas de Segurança

A implementação deverá incluir:

- Senhas protegidas por **Argon2id**; nunca armazenar senhas em texto puro.
- Sessões em cookies `HttpOnly`, `Secure` e `SameSite`, com expiração e invalidação no logout.
- Proteção contra CSRF nas operações que alteram dados.
- Limite de tentativas de login e de solicitações.
- Validação das entradas no servidor.
- Consultas SQL parametrizadas.
- Autorização por grupo para prevenir acesso indevido por identificadores (IDOR/BOLA).
- Credenciais do banco em variáveis de ambiente ou gerenciador de segredos; nunca em código ou arquivos versionados.
- Acesso ao banco restrito à API, com permissões mínimas necessárias.
- Site e API servidos por HTTPS.
- Mensagens de erro seguras para o usuário e logs internos estruturados, sem expor senhas ou tokens.

A autenticação e a autorização precisam estar implementadas antes de ampliar o acesso do serviço para a internet.

## Ordem de implementação

### 1. Tabelas e migrações de esquema

Criar o modelo PostgreSQL e as migrações que controlam suas versões. Definir chaves estrangeiras, restrições de integridade e índices para as consultas por usuário e grupo.

### 2. Contas e sessões

Implementar cadastro, login, logout e gerenciamento de sessões, com hash de senha e proteção contra abuso.

### 3. Grupos, membros e convites

Implementar criação de grupos, vínculo de membros, suas permissões e o fluxo de convites.

### 4. Despesas e saldos por grupo

Adaptar os endpoints e a interface existentes para trabalhar dentro do grupo autorizado. Preservar os cálculos em centavos e as operações transacionais.

### 5. Testes de segurança e concorrência

Verificar especialmente:

- Isolamento entre grupos.
- Tentativas de ler ou alterar despesas de outro grupo.
- Operações executadas sem a permissão necessária.
- Sessões ausentes, expiradas ou encerradas.
- Entradas inválidas e valores nos limites.
- Alterações simultâneas e rollback em falhas.
- Conservação dos centavos e consistência dos saldos.

### 6. Hospedagem e operação

Escolher os serviços de hospedagem, configurar HTTPS, segredos, acesso restrito ao banco, backups e recuperação. Definir e revisar os custos antes de publicar o sistema.

## Migração dos dados atuais

Preparar uma migração para levar as pessoas, despesas e cotas do SQLite atual para um grupo no PostgreSQL.

Antes de executar a migração real:

1. Fazer backup do SQLite.
2. Definir o responsável pelo grupo de destino.
3. Definir como os participantes existentes serão vinculados às futuras contas, preservando o histórico.
4. Validar referências, valores, cotas e saldos após a importação.
5. Manter o backup disponível para recuperação.

A migração não deve pressupor que todas as pessoas cadastradas no livro local já tenham uma conta de usuário.

## Decisões ainda pendentes

- Provedor e custos de hospedagem da API, frontend e PostgreSQL.
- Permissões dos membros de cada grupo.
- Fluxo de convites e vínculo dos participantes existentes com contas.
- Política de duração e revogação das sessões.
- Política de backup e procedimento de recuperação.
- Estratégia de execução e reversão da migração dos dados.

## Próximo passo quando o trabalho for retomado

Começar pelo modelo de dados e pelas migrações de esquema, seguindo a ordem acima. Revisar este plano diante dos requisitos escolhidos antes de implementar ou publicar o acesso multiusuário.
