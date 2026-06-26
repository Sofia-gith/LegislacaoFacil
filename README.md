# Extensão de navegador com WXT + React


Esse respositorio é um sistema que ajuda a ler e entender o conteúdo do portal da legislação municipal


## Lei Fácil 

Extensão de navegador para o portal de legislação municipal de São Paulo ([legislacao.prefeitura.sp.gov.br](https://legislacao.prefeitura.sp.gov.br)), com o objetivo de democratizar o acesso à informação jurídica.

Desenvolvida como projeto do programa **Melhores Práticas de Estágio**, dentro do tema **"São Paulo Plural"** — acessibilidade para pessoas sem formação jurídica, idosos e pessoas com baixa escolaridade.

---

## Funcionalidades

* **Glossário jurídico** — ao passar o mouse sobre termos técnicos, exibe uma tooltip com a definição em linguagem simples

* **Simplificação de texto via IA** — selecione qualquer trecho da lei e receba uma explicação acessível gerada pelo Gemini

---

## Stack

* [WXT](https://wxt.dev/) — build tool para extensões (Manifest V3)

* TypeScript

* Shadow DOM — isolamento de CSS da UI injetada

* Google Gemini API — simplificação de texto

---

## Como rodar localmente

### Pré-requisitos

* Node.js 18+

* npm

### Instalação

```bash
git clone https://github.com/seu-usuario/lei-facil.git
cd lei-facil/lei-facil-extension
npm install
```

### Desenvolvimento

```bash
npm run dev
```

O Chrome abrirá automaticamente com a extensão carregada e hot reload ativo.

### Build

```bash
npm run build
```

O bundle final estará em `.output/chrome-mv3/`.

### Carregar no Chrome manualmente

1. Abra `chrome://extensions`

2. Ative o **Modo do desenvolvedor**

3. Clique em **Carregar sem compactação**

4. Selecione a pasta `.output/chrome-mv3`

---

## 📁 Estrutura do projeto

# Estrutura de Pastas — Lei Fácil

```
LeiaFacil/
│
├── lei-facil-extension/          # Extensão de navegador (WXT + TypeScript)
│   │
│   ├── public/
│   │   └── glossario.json        # Termos jurídicos e definições (estático)
│   │
│   ├── src/
│   │   ├── entrypoints/
│   │   │   ├── content.ts        # Injeta UI na página, observa o DOM
│   │   │   └── background.ts     # Service worker — chama o backend
│   │   │
│   │   ├── components/
│   │   │   ├── Tooltip.ts        # Tooltip do glossário (Shadow DOM)
│   │   │   └── PainelSimplificar.ts  # Painel flutuante de simplificação
│   │   │
│   │   └── utils/
│   │       ├── glossario.ts      # Highlight de termos via TreeWalker
│   │       └── api.ts            # Chamadas ao backend Go
│   │
│   ├── wxt.config.ts             # Configuração do WXT (permissões, hosts)
│   ├── tsconfig.json
│   └── package.json
│
├── lei-facil-backend/            # Backend (Go)
│   │
│   ├── cmd/
│   │   └── main.go               # Entrypoint do servidor
│   │
│   ├── internal/
│   │   ├── handler/
│   │   │   └── simplificar.go    # Handler do endpoint POST /simplificar
│   │   │
│   │   └── gemini/
│   │       └── client.go         # Cliente para a API do Gemini
│   │
│   ├── Dockerfile                # Multi-stage build para deploy
│   ├── .env.example              # Exemplo de variáveis de ambiente
│   ├── .env                      # Chave de API real (nunca sobe pro git)
│   └── go.mod
│
├── .gitignore
└── README.md
```

---

## Responsabilidade de cada arquivo

### Extensão

| Arquivo | O que faz |
|---|---|
| `content.ts` | Roda na página, usa MutationObserver para detectar o texto da lei, injeta a UI |
| `background.ts` | Service worker — único ponto que se comunica com o backend |
| `Tooltip.ts` | Componente de tooltip isolado em Shadow DOM |
| `PainelSimplificar.ts` | Painel que exibe o texto simplificado retornado pela IA |
| `glossario.ts` | Percorre o DOM com TreeWalker e envolve termos jurídicos em elementos clicáveis |
| `api.ts` | Funções para chamar o backend (fetch para POST /simplificar) |
| `glossario.json` | JSON estático com os termos e definições — não precisa de IA |

### Backend

| Arquivo | O que faz |
|---|---|
| `main.go` | Inicia o servidor HTTP, registra as rotas |
| `simplificar.go` | Recebe o texto, valida, chama o cliente Gemini, retorna a resposta |
| `client.go` | Encapsula a chamada à API do Gemini com a chave protegida |
| `.env` | `GEMINI_API_KEY=...` — nunca exposta ao usuário |
| `Dockerfile` | Build de produção — imagem Alpine pequena (~10MB) |

---

## Variáveis de ambiente do backend

```env
# .env.example
GEMINI_API_KEY=sua_chave_aqui
PORT=8080
ALLOWED_ORIGIN=chrome-extension://ID_DA_SUA_EXTENSAO
```

> `ALLOWED_ORIGIN` é importante para que o backend só aceite requisições da sua extensão (CORS).

##  Configuração da API

A chave do Gemini **não é armazenada na extensão**. As chamadas passam por um backend próprio para proteger a chave.

> Instruções de configuração do backend em breve.

---

## ⚠️ Aviso

As simplificações geradas por IA são um **apoio à compreensão** e não substituem assessoria jurídica profissional.

---

## 📄 Licença

MIT