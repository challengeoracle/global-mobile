# OffPay Mobile

Aplicativo mobile do ecossistema OffPay, construído com Expo e React Native para sustentar a operação de vendedores e clientes mesmo quando a internet falha. O app prioriza persistência local, leitura e geração de QR Code, sincronização posterior e consumo de microsserviços separados por domínio.

## Visão Geral

O fluxo principal do produto aparece com clareza na experiência de operação:

- o vendedor mantém o catálogo da loja no próprio aparelho
- o cliente importa esse catálogo por QR Code
- o pedido nasce localmente no dispositivo do cliente
- o vendedor confirma a compra lendo o QR Code do pedido
- quando houver conexão, o app sincroniza catálogo e pedidos com o backend

Na prática, isso transforma o celular em um terminal de venda resiliente. A operação não depende de conexão constante para continuar vendendo, registrando pedidos e organizando o catálogo.

## Pontos Fortes

- Operação offline-first com persistência local em SQLite
- Fluxo de venda orientado por QR Code
- Sincronização posterior por domínio
- Experiência adaptada para vendedor e cliente
- Arquitetura modular por contexto de negócio
- Integração preparada para microsserviços Java

## Stack

- Expo 54
- React Native 0.81
- Expo Router
- TypeScript
- NativeWind
- Expo SQLite
- Expo Secure Store

## Estrutura do App

```text
src/
  app/                  rotas e telas
  domains/
    auth/               login, cadastro e contexto de usuário
    catalog/            catálogo local, importação por QR e sync
    order/              carrinho, geração de pedido e confirmação
    payment/            carteira e transações
    insights/           métricas e perguntas para IA
    sync/               engine e filas de sincronização
  shared/
    components/         blocos reutilizáveis de UI
    database/           SQLite e migrações locais
    hooks/              rede e estado de sincronização
    lib/                cliente HTTP, storage seguro e utilitários
```

## Tela "Sobre o App"

O requisito da entrega para exibir o hash do commit de referência já está atendido.

- a tela está em [src/app/about.tsx](/c:/Users/mateu/Desktop/GS-26/global-mobile/src/app/about.tsx)
- o acesso está disponível em Configurações > Sobre o App
- o hash é injetado via `app.config.ts`, usando `git rev-parse --short HEAD`

Arquivo relacionado:

- [app.config.ts](/c:/Users/mateu/Desktop/GS-26/global-mobile/app.config.ts)

## Publicação do App

Para fechar o requisito de publicação:

1. Gerar a build do app com o commit de referência desejado.
2. Publicar a build no Firebase App Distribution.
3. Adicionar o e-mail do professor como tester no painel do Firebase.
4. Validar que a tela "Sobre o App" mostra o hash do commit usado nessa build.

Sugestão de checklist de entrega:

- build publicada no Firebase App Distribution
- professor adicionado como tester
- print da tela "Sobre o App" exibindo o commit

## URLs de Deploy

Essas são as URLs publicadas dos serviços Java:

- Auth: `https://app-offpay-auth-rm559728.azurewebsites.net/swagger-ui/index.html`
- Sales: `https://app-offpay-sales-rm559728.azurewebsites.net/swagger-ui/index.html`
- Payment: `https://app-offpay-payment-rm559728.azurewebsites.net/swagger-ui/index.html`
- Analytics: `https://app-offpay-analytics-rm559728.azurewebsites.net/swagger-ui/index.html`

## Variáveis de Ambiente

O mobile consome quatro URLs públicas configuradas por ambiente:

```env
EXPO_PUBLIC_AUTH_API_URL=
EXPO_PUBLIC_SALES_API_URL=
EXPO_PUBLIC_PAYMENT_API_URL=
EXPO_PUBLIC_ANALYTICS_API_URL=
```

Essas URLs são consumidas em `src/shared/lib/api.ts`, que centraliza `fetch`, serialização JSON e envio do token JWT salvo com `Secure Store`.

## Execução do Mobile

```bash
npm install
npm run start
```

Atalhos úteis:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

## Backend Java Relacionado

O app conversa com os microsserviços do projeto Java:

- `signal-auth-service`
- `signal-sales-service`
- `signal-payment-service`
- `signal-analytics-ai-service`

## Execução Local da API Java

O repositório Java deve ser executado como solução completa.

### Pré-requisitos

- Docker Desktop
- Git
- arquivo `.env` configurado

### Passo a passo

1. Clone o repositório:

```bash
git clone https://github.com/challengeoracle/global-java
cd global-java
```

Na entrega existe um arquivo `.env` já configurado. Basta colocá-lo na raiz do projeto se esse for o fluxo adotado.

2. Copie o arquivo de ambiente:

```powershell
Copy-Item .env.example .env
```

3. Ajuste pelo menos:

- `JWT_SECRET`
- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `GROQ_API_KEY`

4. Suba todos os serviços:

```powershell
docker compose up -d --build
```

5. Acompanhe os logs:

```powershell
docker compose logs -f
```

### Endpoints locais

- Auth: `http://localhost:8081/swagger-ui/index.html`
- Sales: `http://localhost:8082/swagger-ui/index.html`
- Payment: `http://localhost:8083/swagger-ui/index.html`
- Analytics AI: `http://localhost:8084/swagger-ui/index.html`
- RabbitMQ Management: `http://localhost:15672`

## Deploy Local com Docker

Para desenvolvimento e testes rápidos, o caminho mais simples é usar o `docker compose` da raiz.

Esse fluxo é indicado quando você quer:

- validar o comportamento dos microsserviços localmente
- testar variáveis de ambiente
- conferir Swagger e integrações antes de publicar na nuvem

Comando principal:

```powershell
docker compose up -d --build
```

Para derrubar o ambiente:

```powershell
docker compose down
```

## Banco de Dados da API Java

O projeto Java foi preparado para dois cenários:

- Oracle legado
- Azure SQL para a entrega em nuvem

As variáveis principais são:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DRIVER_CLASS_NAME`
- `DB_DIALECT`
- `FLYWAY_LOCATIONS`

### Oracle

- `DB_DRIVER_CLASS_NAME=oracle.jdbc.OracleDriver`
- `DB_DIALECT=org.hibernate.dialect.OracleDialect`
- `FLYWAY_LOCATIONS=classpath:db/migration`

### Azure SQL

- `DB_DRIVER_CLASS_NAME=com.microsoft.sqlserver.jdbc.SQLServerDriver`
- `DB_DIALECT=org.hibernate.dialect.SQLServerDialect`
- `FLYWAY_LOCATIONS=classpath:db/migration-sqlserver`

## Resumo

O valor deste app está em permitir que a operação continue acontecendo no mundo real, mesmo em contexto instável. Em vez de tratar o offline como exceção, o OffPay Mobile organiza catálogo, pedido, confirmação, carteira, insights e sincronização como parte natural do fluxo de venda.
