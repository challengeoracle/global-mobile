# OffPay Mobile

O `global-mobile` é o aplicativo do OffPay. Ele mantém a operação comercial funcionando mesmo quando a conectividade entre cliente, vendedor e backend oscila ou fica indisponível temporariamente.

O aplicativo segue a estratégia offline-first:

- dados importantes são persistidos localmente no aparelho
- o catálogo pode ser importado e consultado sem conexão constante
- pedidos podem ser montados e confirmados localmente
- a sincronização com o backend acontece quando houver conectividade

## Papel do Aplicativo

O app mobile é o ponto principal da operação do OffPay. Ele cobre o ciclo comercial entre cliente e vendedor:

- autenticação
- armazenamento seguro da sessão
- importação e consulta de catálogo
- montagem de pedido
- troca de dados por QR Code
- persistência local
- sincronização posterior com o backend

O aplicativo não depende de ativação manual do modo offline para operar no fluxo principal. Também não exige `offlineToken` ou `offlineSession` como pré-condição obrigatória para vendas e sincronizações.

## Perfis de Usuário

O aplicativo trabalha com dois perfis.

## Seller

Responsável por:

- manter o catálogo da loja
- atualizar categorias, produtos e estoque
- compartilhar o catálogo por QR Code
- escanear pedidos gerados pelo cliente
- confirmar vendas no aparelho
- sincronizar catálogo e pedidos com o backend

## Customer

Responsável por:

- importar o catálogo da loja
- consultar produtos localmente
- montar pedidos
- gerar o QR Code do pedido
- acompanhar o histórico de pedidos vinculado à conta

## Catálogo

O catálogo é a base do fluxo offline entre cliente e vendedor.

Comportamento atual:

- o vendedor consulta ou monta o catálogo da loja
- as alterações são salvas localmente
- o app gera fila local de sincronização para categorias, produtos e estoque
- o vendedor pode compartilhar o catálogo por QR Code
- o cliente importa o catálogo para o próprio aparelho e continua a consulta localmente

O catálogo pode vir de duas fontes:

- backend, quando há conexão
- armazenamento local, quando o aparelho opera offline

## Pedidos

O fluxo de pedidos preserva a venda mesmo sem conectividade constante.

Comportamento atual:

- o cliente monta um pedido a partir do catálogo importado
- o app gera um `localOrderId` para rastrear a operação
- o pedido pode ser transformado em QR Code
- o vendedor escaneia e confirma a venda
- a confirmação comercial fica salva localmente no aparelho do vendedor
- quando houver conexão, o pedido é sincronizado com o `sales-service`

O app também consegue carregar pedidos já registrados no backend para o usuário autenticado.

## QR Code

O QR Code é o principal mecanismo de troca de contexto entre os aparelhos.

O aplicativo trabalha com:

- QR Code de catálogo, usado para importar produtos da loja
- QR Code de pedido, usado para transferir o pedido do cliente para o vendedor
- QR Code de confirmação de pedido, usado para compartilhar o resultado local ou sincronizado da venda

Esse formato permite que a operação continue mesmo quando os aparelhos não conseguem se comunicar diretamente com o backend.

## Persistência Local

O estado local do aplicativo é parte central da arquitetura.

Persistência atual:

- `Expo Secure Store` para token, usuário e identificador local do aparelho
- `Expo SQLite` para catálogo, pedidos e filas de sincronização

Na prática, isso permite:

- manter sessão autenticada no aparelho
- continuar acessando catálogo local
- guardar pedidos confirmados antes da sincronização
- registrar falhas, tentativas e reenvios de sincronização

## Sincronização Posterior

O aplicativo possui fila local para sincronização de catálogo e pedidos.

## Catálogo

Cada alteração local de catálogo gera um item de fila com `operationId`. Quando há conectividade, o app envia essas alterações para `POST /catalog/sync`.

O backend responde aplicando, rejeitando ou tratando cada operação como duplicada. Depois disso, o app atualiza o estado local e mantém rastreio das falhas que exigem nova tentativa.

## Pedidos

Pedidos confirmados offline entram em uma fila separada. Quando o vendedor volta a ficar online, o app envia o lote para `POST /order/sync`.

Cada pedido usa `localOrderId` como referência de deduplicação. Isso evita recriação da mesma venda quando o envio precisa ser repetido.

## Estratégia Operacional

O motor de sincronização:

- detecta conectividade
- agenda tentativas automaticamente
- controla estados como pendente, sincronizando, sincronizado, falho e rejeitado
- preserva os dados locais mesmo quando a sincronização falha

## Cenários de Conectividade

## Cliente online e vendedor online

- o cliente importa ou consulta o catálogo normalmente
- o pedido é criado com menor latência
- o vendedor confirma a venda
- a sincronização com o backend pode acontecer logo em seguida

## Cliente offline e vendedor online

- o cliente usa o catálogo já importado no aparelho
- o pedido é montado localmente
- o vendedor escaneia o QR Code e confirma a venda
- como o vendedor está conectado, a sincronização pode acontecer rapidamente

## Cliente online e vendedor offline

- o cliente consegue consultar o catálogo
- o vendedor ainda consegue receber o pedido e confirmar localmente
- o pedido fica salvo no aparelho do vendedor até a reconexão
- a sincronização ocorre depois

## Cliente offline e vendedor offline

- o cliente usa o catálogo salvo localmente
- o pedido é gerado por QR Code
- o vendedor confirma a venda sem depender do backend
- a operação fica preservada no armazenamento local
- a sincronização acontece quando a internet voltar

Em todos os cenários, o aplicativo prioriza a continuidade comercial e deixa a reconciliação remota para quando a conectividade estiver disponível.

## Integração com o Backend

O app mobile conversa com dois serviços principais:

- `signal-auth-service`
- `signal-sales-service`

Uso atual:

- autenticação por `POST /auth/login`
- cadastro por `POST /auth/register/seller` e `POST /auth/register/customer`
- recuperação do contexto autenticado por `GET /auth/me`
- atualização opcional do `deviceId` do vendedor por `PATCH /device/me`
- consulta de catálogo por `/catalog/me` e `/catalog/store/{storeId}`
- criação de pedido online por `POST /order`
- sincronização posterior por `POST /catalog/sync` e `POST /order/sync`

## Próximo Passo Arquitetural

O fluxo financeiro do OffPay será expandido com um `payment-service` separado.

Esse serviço ainda não está implementado no app como etapa funcional concluída. O papel previsto é:

- consumir eventos publicados pelo `sales-service`
- simular um gateway de pagamento
- tratar o processamento financeiro apenas online
- manter separado o momento da venda local do momento da confirmação financeira

## Execução Local

Instalação:

```bash
npm install
```

Variáveis de ambiente:

```env
EXPO_PUBLIC_AUTH_API_URL=
EXPO_PUBLIC_SALES_API_URL=
```

Inicialização:

```bash
npm start
```

Atalhos disponíveis:

```bash
npm run android
npm run ios
npm run web
```

## Estado Atual

Estado atual do aplicativo:

- estratégia offline-first ativa
- persistência local com SQLite e Secure Store
- suporte aos perfis seller e customer
- troca de catálogo e pedido por QR Code
- sincronização posterior de catálogo e pedidos
- sem dependência obrigatória de modo offline manual, `offlineToken` ou ```offlineSession`

A evolução prevista é integrar o app ao futuro `payment-service`, mantendo o pagamento como etapa online posterior à sincronização da venda.
