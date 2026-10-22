# Águia Cast WebDJ Studio — Windows V1.5

Projeto Electron para o GitHub Actions `gerar-exe-windows.yml`.

**Preserva o motor de transmissão WebDJ no servidor.** O app não contém senhas de DJ, banco ou Shoutcast.

- Home: `/webdj-studio` (lista de DJs).
- Gerenciar DJs: `/gerenciar-djs` — **é a página original da VPS**, portanto cadastrar, editar e excluir refletem na base de dados real da streaming (com a proteção existente do painel).
- Áudio Lab fica ligado por padrão quando o servidor V1.5 está instalado.
- Marca do instalador: Águia Cast; web preserva configurações da revenda.
- Aviso ao sair do estúdio para evitar interromper transmissão.

**Atenção**: após subir os arquivos no GitHub é necessário executar o workflow e instalar o novo EXE. Faça backup do projeto antes.
