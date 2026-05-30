# Pop Lingo Jarvis API

Backend que **baixa áudio do YouTube** e **transcreve via Groq Whisper**.

## Como funciona

```
[Lovable/Frontend] 
     ↓ (chama URL pública)
[ngrok] → cria um túnel da internet pro seu PC
     ↓ 
[Servidor local (localhost:3000)] → baixa áudio com yt-dlp → manda pro Groq transcrever
```

**ngrok** é um programa que cria uma URL pública (ex: `https://abc.ngrok-free.app`) que aponta direto pro servidor rodando no seu computador. Assim o Lovable consegue chamar sua API mesmo estando na nuvem.

Depois da primeira configuração, é só **dar dois cliques no `LIGAR_JARVIS.bat`** que tudo sobe automático.

---

## Instalação automática (recomendado)

Abra o **PowerShell** como administrador e cole:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; .\install.ps1
```

Se ainda não clonou o projeto:

```powershell
git clone https://github.com/nicolasgomesnicolau-lab/LBS-1---API-JARVIS-for-POP-LINGO.git
cd LBS-1---API-JARVIS-for-POP-LINGO
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; .\install.ps1
```

O `install.ps1` baixa tudo automático:
- ✅ yt-dlp.exe
- ✅ ffmpeg.exe + ffprobe.exe
- ✅ ngrok.exe
- ✅ npm install

---

## Configuração manual (passo a passo)

### 1. Instalar Node.js

Baixe em [nodejs.org](https://nodejs.org) (versão 18 ou maior).

### 2. Baixar o projeto e dependências

```powershell
git clone https://github.com/nicolasgomesnicolau-lab/LBS-1---API-JARVIS-for-POP-LINGO.git
cd LBS-1---API-JARVIS-for-POP-LINGO
npm install
```

### 3. Criar arquivo `.env`

Na pasta do projeto, crie o arquivo `.env` com:

```env
GROQ_API_KEY=gsk_seu_token_aqui
API_KEY=uma_senha_forte_qualquer
```

| Variável | Onde conseguir |
|---|---|
| `GROQ_API_KEY` | Criar em [console.groq.com/keys](https://console.groq.com/keys) (começa com `gsk_`) |
| `API_KEY` | Você escolhe qualquer senha forte para autenticar as requisições |

### 4. Configurar ngrok

ngrok é a ponte entre a internet e seu PC. Sem ele, o Lovable não consegue acessar seu servidor local.

1. Crie conta grátis em [ngrok.com](https://ngrok.com) (login com Google/GitHub)
2. Pegue seu token: [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
3. No terminal, cole:

```powershell
.\ngrok.exe config add-authtoken SEU_TOKEN_AQUI
```

### 5. (Opcional) Criar domínio fixo

Por padrão, o ngrok gera uma URL diferente toda vez que liga. Para ter a **mesma URL sempre** (recomendado):

1. Vá em [dashboard.ngrok.com/cloud-edge/domains](https://dashboard.ngrok.com/cloud-edge/domains)
2. Clique em **"Create Domain"** → escolhe um nome tipo `meu-jarvis.ngrok-free.app`
3. Copie o domínio e cole no `LIGAR_JARVIS.bat` no lugar de `--domain=...`

---

## Rodar (depois de configurado)

**Dê dois cliques** no `LIGAR_JARVIS.bat`. Ele abre duas janelas:

| Janela | O que mostra |
|---|---|
| **Servidor API** | Log do servidor (`🔥 API rodando local em http://localhost:3000`) |
| **Tunnel Ngrok** | URL pública (`Forwarding https://xxx.ngrok-free.app -> localhost:3000`) |

Na janela do ngrok, copie a URL `https://xxx.ngrok-free.app` e use no Lovable.

> Se usou domínio fixo no passo 5, a URL é sempre a mesma.

---

## API

### Transcrever vídeo

**Requisição:**
```
POST https://SEU_DOMINIO.ngrok-free.app/transcrever
Header: x-api-key: SUA_API_KEY
Body:   {"url": "https://youtube.com/watch?v=VIDEO_ID"}
```

**Exemplo com curl (PowerShell):**
```powershell
curl.exe -s -X POST "https://SEU_DOMINIO.ngrok-free.app/transcrever" -H "Content-Type: application/json" -H "x-api-key: SUA_API_KEY" -d '{\"url\":\"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"}'
```

**Resposta (200):**
```json
{
  "status": "success",
  "data": [
    { "start": 0.5, "end": 3.2, "text": "Olá, bem-vindo ao vídeo" },
    { "start": 3.5, "end": 7.8, "text": "hoje vamos aprender sobre..." }
  ]
}
```

### Códigos de erro

| Status | Significado |
|---|---|
| `400` | URL inválida, faltando ou vídeo muito longo |
| `401` | `x-api-key` ausente ou incorreto |
| `429` | Muitas requisições (limite: 10/min) |
| `500` | Erro no download ou na transcrição |

---

## Variáveis de ambiente (.env)

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `GROQ_API_KEY` | Sim | — | Chave da API Groq |
| `API_KEY` | Sim | — | Chave secreta da API |
| `PORT` | Não | `3000` | Porta do servidor |
| `MAX_DURATION` | Não | `600` | Duração máxima em segundos |
| `OUTPUT_FOLDER` | Não | `./audios_temp` | Pasta de áudios temporários |

---

## Ajustes comuns

### Aumentar limite de requisições

No `server.js`, mude o `max`:

```js
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'Muitas requisições. Aguarde um momento.' }
});
```

### Aumentar duração máxima

No `.env`: `MAX_DURATION=1200` (20 minutos).
