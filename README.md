# OffPay

O OffPay é uma solução mobile desenvolvida para garantir a continuidade operacional de pequenos negócios em cenários de crise, como quedas de energia, falhas de internet ou indisponibilidade de operadoras. A plataforma permite registrar vendas, manter o catálogo de produtos e gerenciar pagamentos de forma offline, com sincronização automática assim que a conexão é restabelecida.

## Visão Geral

O projeto foca em resiliência digital, oferecendo uma arquitetura "offline-first" que permite ao comerciante operar sem interrupções. Quando a internet retorna, os dados armazenados localmente são sincronizados com o backend para reconciliação financeira e processamento de pagamentos.

## Setup do Projeto

Para configurar o ambiente de desenvolvimento localmente, siga os passos abaixo:

1. Clone o repositório para sua máquina local.
2. Acesse a pasta do projeto via terminal.
3. Instale as dependências necessárias utilizando o gerenciador de pacotes de sua preferência:

```bash
npm install
```

1. Configure as variáveis de ambiente necessárias. Crie um arquivo .env na raiz do projeto e defina a URL da sua API:

```env
EXPO_PUBLIC_API_URL=sua_url_aqui
```

5. Para iniciar o projeto em uma porta específica (exemplo: 8079), utilize o comando configurado no package.json:

```bash
npm start -- --port 8079
```
