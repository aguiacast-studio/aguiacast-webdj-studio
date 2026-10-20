# Águia Cast WebDJ Studio V1.0

Aplicativo Windows (Electron) da primeira fase.

**Pré-requisito:** instalar o módulo servidor `webdj-studio.php` via `servidor/INSTALAR_VPS.sh`.

O aplicativo abre o login real do painel Águia Cast e mantém a sessão em armazenamento Chromium persistente no computador. A página `webdj-studio.php`, protegida pelo login da streaming, mostra os DJs do cliente e os botões para abrir cada WebDJ.

## Compilar via GitHub (sem instalar nada no PC)

1. Crie um **repositório privado** vazio no GitHub.
2. Envie **o conteúdo desta pasta `windows/` para a raiz do repositório**, incluindo `.github/workflows/gerar-exe-windows.yml`. Não publique arquivos PHP de seu servidor, banco, senhas ou `.env`.
3. Abra **Actions** > **Gerar instalador Windows** > **Run workflow**.
4. Ao terminar, abra a execução e baixe **AGUIACAST_WEBDJ_STUDIO_WINDOWS_V1_0** em Artifacts; extraia e execute o arquivo `...SETUP.exe`.

A compilação usa Electron e electron-builder. Não há binário EXE pré-compilado neste pacote.

## Executar localmente (opcional)

```bash
npm install
npm run check
npm start
```

## Segurança

Conteúdo remoto usa sandbox, isolamento de contexto, sem Node.js, e só pode navegar no domínio `https://aguiacast.com`. Permissão ao microfone é liberada somente no WebDJ. Senha do painel não é salva no código do aplicativo. Em PCs compartilhados, use o botão **Sair** e verifique a política de sessão do site. O programa não grava senha de DJ em arquivos locais.

## Limites da V1.0

- O WebDJ atual depende de AutoDJ ativo e de serviço WSS existente.
- Não há encoder de áudio nativo. Se o streaming original não funcionar no Chromium, não haverá transmissão real até a fase 2.
- Não contém rotina de criação direta de DJ; abre a página autenticada de cadastro de DJ existente no painel (descoberta pelo instalador) e retorna à lista do Studio.
- Não executa ação de derrubar AutoDJ, iniciar rádio desligada ou alternar fontes automaticamente.
- Antes de distribuir aos clientes, são obrigatórios teste de microfone, transmissão longa, reconexão, segurança de links de DJ e assinatura digital do instalador.
