# OffPay Mobile

Aplicativo mobile do ecossistema OffPay, desenvolvido com Expo e React Native para sustentar a operação de vendedores e clientes mesmo em cenários de instabilidade de rede.

## Integrantes

- `RM561061` - Arthur Thomas Mariano de Souza
- `RM559873` - Davi Cavalcanti Jorge
- `RM559728` - Mateus da Silveira Lima

## Vídeo Demonstrativo

- URL: `COLOCAR_AQUI`

## Sobre o App

O aplicativo possui uma tela `Sobre o App` com o hash do commit de referência da build.

- tela: [src/app/about.tsx](/c:/Users/mateu/Desktop/GS-26/global-mobile/src/app/about.tsx)
- configuração do commit: [app.config.ts](/c:/Users/mateu/Desktop/GS-26/global-mobile/app.config.ts)

## Execução Local

Para rodar o projeto localmente, é necessário configurar:

1. o `.env` do projeto mobile
2. o backend Java local
3. a execução do app via Expo

### 1. Configurar o `.env` do mobile

Crie ou ajuste o arquivo `.env` na raiz deste projeto com as URLs que o app vai consumir.

Se quiser testar apontando para o ambiente local/deploy local, será anexado um `.env` no zip de entrega já configurado para facilitar a execução.

O arquivo de exemplo está em:

- [.env.example](/c:/Users/mateu/Desktop/GS-26/global-mobile/.env.example)

### 2. Subir o backend Java local

O backend deve ser executado como solução completa.

Passo a passo:

1. Clonar o repositório Java:

```bash
git clone https://github.com/challengeoracle/global-java
cd global-java
```

2. Configurar o `.env` do projeto Java

Na entrega, será anexado um arquivo `.env` configurado para facilitar os testes locais, caso o professor queira validar o app com o deploy local.

3. Subir os serviços:

```powershell
docker compose up -d --build
```

4. Acompanhar os logs, se necessário:

```powershell
docker compose logs -f
```

### 3. Rodar o app mobile

Depois de configurar o `.env` do mobile e subir o backend, execute:

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
