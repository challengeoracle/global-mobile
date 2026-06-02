# OffPay Mobile

Aplicativo mobile do ecossistema OffPay, construído com Expo e React Native para sustentar a operação de vendedores e clientes mesmo quando a internet falha. O app prioriza persistência local, leitura e geração de QR Code, e sincronização posterior com os serviços centrais.

## Visão Geral

O fluxo principal do produto aparece com clareza na experiência de operação:

- o vendedor mantém o catálogo da loja no próprio aparelho
- o cliente importa esse catálogo por QR Code
- o pedido nasce localmente no dispositivo do cliente
- o vendedor confirma a compra lendo o QR Code do pedido
- quando houver conexão, o app sincroniza catálogo e pedidos com o backend

Na prática, isso transforma o celular em um terminal de venda resiliente. A operação não depende de conexão constante para continuar vendendo, registrando pedidos e organizando o catálogo.

## Pontos Fortes

- Operação offline-first: catálogo, pedidos e filas de sincronização ficam persistidos localmente em SQLite.
- Fluxo de venda orientado por QR Code: compartilhamento de catálogo, criação de pedido e confirmação da venda funcionam de forma simples no balcão.
- Sincronização por domínio: catálogo e pedidos possuem filas independentes, controle de tentativas, rejeições e reconciliação posterior.
- Experiência adaptada por papel: o app muda a navegação e a home conforme o usuário é vendedor ou cliente.
- Arquitetura modular: autenticação, catálogo, pedidos, carteira, sync e insights ficam separados por domínio, facilitando manutenção e evolução.
- Integração preparada para microsserviços: cada contexto remoto aponta para uma API específica, sem acoplar tudo a um único backend.

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

## Fluxo de Operação

### Vendedor

Na tela de operação principal, o vendedor enxerga o estado local, acessa atalhos para registrar venda, comprar de outra loja, acompanhar pedidos e abrir a carteira. No catálogo, ele pode:

- criar e editar categorias e produtos localmente
- ajustar estoque sem depender de resposta imediata do servidor
- gerar um QR Code com o catálogo da loja
- ler o QR Code de um pedido criado pelo cliente
- confirmar a venda e disparar a sincronização quando houver internet

### Cliente

O cliente pode importar o catálogo de uma loja por QR Code, montar o carrinho no aparelho, gerar o QR do pedido e apresentar esse código ao vendedor para confirmação. Depois, acompanha os pedidos e o histórico sincronizado.

## Persistência Local

O app usa SQLite para garantir continuidade operacional. As migrações criam e mantêm tabelas locais para:

- `categories`
- `products`
- `orders`
- `order_items`
- `catalog_sync_queue`
- `order_sync_queue`

Além do armazenamento dos dados de operação, o app mantém filas locais com status como `PENDING`, `SYNCING`, `SYNCED`, `FAILED` e `REJECTED`, permitindo retentativas automáticas e tratamento de conflitos.

## Integração com a API em `global-java-fresh`

O mobile conversa com os microsserviços Java por meio de quatro URLs públicas configuradas em ambiente:

```env
EXPO_PUBLIC_AUTH_API_URL=
EXPO_PUBLIC_SALES_API_URL=
EXPO_PUBLIC_PAYMENT_API_URL=
EXPO_PUBLIC_ANALYTICS_API_URL=
```

Essas URLs são consumidas em `src/shared/lib/api.ts`, que centraliza `fetch`, serialização JSON e envio do token JWT salvo com `Secure Store`.

### 1. Autenticação

O app usa o `signal-auth-service` da pasta `global-java-fresh` para:

- `POST /auth/login`
- `POST /auth/register/seller`
- `POST /auth/register/customer`
- `GET /auth/me`

Na prática, isso cobre login, cadastro e recuperação do perfil autenticado. O fluxo offline-first não depende de device.

### 2. Catálogo e Pedidos

O `signal-sales-service` concentra a operação comercial do app:

- `GET /catalog/me`
- `GET /catalog/store/{storeId}`
- `POST /catalog/sync`
- `POST /order`
- `POST /order/sync`
- `GET /order/me/page`
- `GET /order/me/sales/page`
- `GET /order/me/purchases/page`
- `GET /order/{id}`

Esse é o núcleo do comportamento offline-first. O mobile registra alterações localmente e, quando a conexão volta, envia lotes de catálogo e pedidos para os endpoints de sincronização.

### 3. Carteira e Pagamentos

O `signal-payment-service` atende a parte financeira:

- `GET /wallet/me`
- `GET /wallet/personal/me`
- `POST /wallet/deposit`
- `POST /wallet/settle`
- `GET /wallet/transactions/me/page`
- `GET /wallet/transactions/personal/me/page`
- `GET /payment/transactions/me/page`
- `GET /payment/transactions/order/{orderId}`

No app, isso sustenta saldo, histórico de movimentações e consulta de transações associadas aos pedidos.

### 4. Analytics e IA

O `signal-analytics-ai-service` complementa a operação com leitura gerencial:

- `GET /analytics/me/summary`
- `GET /analytics/seller/summary`
- `GET /analytics/customer/summary`
- `GET /analytics/seller/top-products`
- `GET /analytics/customer/spending`
- `POST /ai/insights/ask`

Com isso, o mobile mostra resumos por perfil e permite enviar perguntas para a camada de insights com IA.

## Como a Sincronização Funciona

O motor de sincronização local:

- separa catálogo e pedidos por escopo
- evita execuções concorrentes
- faz retentativas automáticas em falhas transitórias
- marca rejeições quando o backend devolve inconsistências de negócio
- atualiza o catálogo local após sync bem-sucedido
- reconcilia IDs locais com IDs remotos quando necessário

Esse comportamento está concentrado em [src/domains/sync/services/sync-engine.ts](/c:/Users/mateu/Desktop/GS-26/global-mobile/src/domains/sync/services/sync-engine.ts).

## Executando o Projeto

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

## Backend Relacionado

Para rodar a experiência completa, o mobile depende do backend em `../global-java-fresh`, organizado nestes serviços:

- `signal-auth-service`
- `signal-sales-service`
- `signal-payment-service`
- `signal-analytics-ai-service`

As portas documentadas no backend são:

- Auth: `http://localhost:8081`
- Sales: `http://localhost:8082`
- Payment: `http://localhost:8083`
- Analytics: `http://localhost:8084`

## Resumo

O valor deste app está em permitir que a operação continue acontecendo no mundo real, mesmo em contexto instável. Em vez de tratar o offline como exceção, o OffPay Mobile organiza catálogo, pedido, confirmação e sincronização como parte natural do fluxo de venda.
