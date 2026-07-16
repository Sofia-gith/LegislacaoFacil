# LeiaFácil — Extensão de navegador com WXT + React

Sistema que ajuda a ler e entender o conteúdo do portal de legislação municipal usando IA generativa.

## 📜 LeiaFácil

Extensão de navegador para o portal de legislação municipal de São Paulo ([legislacao.prefeitura.sp.gov.br](https://legislacao.prefeitura.sp.gov.br)), com o objetivo de democratizar o acesso à informação jurídica.

Desenvolvida como projeto do programa **Melhores Práticas de Estágio**, dentro do tema **"São Paulo Plural"** — acessibilidade para pessoas sem formação jurídica, idosos e pessoas com baixa escolaridade.

---

## ⚖️ Aviso Legal

As simplificações geradas por IA são um **apoio à compreensão** e **não substituem assessoria jurídica profissional**. Use com responsabilidade.

---

## ✨ Funcionalidades

* **Simplificação de texto via IA** — Clique no botão "Simplificar" na página da lei para receber:
  - Versão em **linguagem simples** (acessível para leigos)
  - **Pontos principais** da legislação
  - **"O que muda pra mim"** (impacto prático na vida do cidadão)

---

## 🛠️ Stack

* **Frontend**:
  - [WXT](https://wxt.dev/) — build tool para extensões de navegador (Manifest V3)
  - [React 19](https://react.dev/) — UI components
  - TypeScript — type safety

* **Backend**:
  - [Go 1.25+](https://golang.org/) — servidor HTTP
  - [Google Gemini API](https://ai.google.dev/) — simplificação de texto com IA

> Um cliente para a **DeepSeek API** existe no código-fonte como alternativa de provedor, mas ainda não está integrado aos endpoints ativos — veja a seção [Roadmap](#-roadmap).

---

## 🚀 Como rodar localmente

### Pré-requisitos

* **Node.js 18+** (para frontend)
* **Go 1.25+** (para backend)
* **npm** (gerenciador de pacotes)
* **Chave de API do Google Gemini** (obter em [aistudio.google.com](https://aistudio.google.com))

### Instalação

```bash
git clone https://github.com/seu-usuario/leiafacil.git
cd LeiaFacil
```

#### Frontend

```bash
cd lei-facil-extension
npm install
```

#### Backend

```bash
cd lei-facil-backend
go mod download
```

### Desenvolvimento

#### Frontend (com hot reload)

```bash
cd lei-facil-extension
npm run dev
```

O navegador abrirá automaticamente em `chrome://extensions` com a extensão carregada e hot reload ativo.

#### Backend

Primeiro, configure o arquivo `.env`:

```bash
cd lei-facil-backend
cp .env.example .env
# Edite .env e adicione sua GEMINI_API_KEY
```

Depois, inicie o servidor:

```bash
cd lei-facil-backend
go run ./cmd/main.go
```

O servidor estará disponível em `http://localhost:8000`.

### Build para produção

#### Frontend

```bash
cd lei-facil-extension
npm run build
```

O bundle final estará em `.output/chrome-mv3/` (Chrome) ou `.output/firefox-mv3/` (Firefox).

#### Carregar a extensão no Chrome

1. Abra `chrome://extensions`
2. Ative o **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `lei-facil-extension/.output/chrome-mv3`

#### Backend

```bash
cd lei-facil-backend
go build -o lei-facil ./cmd/main.go
./lei-facil
```

Para build com Docker:

```bash
docker build -t lei-facil-backend .
docker run -p 8000:8000 -e GEMINI_API_KEY=sua_chave lei-facil-backend
```

---

## 📁 Estrutura do projeto

```
LeiaFacil/
├── lei-facil-extension/                    # Extensão de navegador (WXT + React + TypeScript)
│   ├── public/
│   │   └── icons/                          # Ícones da extensão
│   │
│   ├── src/ → entrypoints/
│   │   ├── background.ts                   # Service worker da extensão
│   │   ├── content.ts                      # Script injetado na página
│   │   │
│   │   └── popup/                          # Interface do popup (React)
│   │       ├── App.tsx                     # Componente raiz
│   │       ├── main.tsx                    # Entry point do popup
│   │       ├── types.ts                    # Tipos TypeScript compartilhados
│   │       │
│   │       ├── components/
│   │       │   ├── Header.tsx              # Cabeçalho do popup
│   │       │   ├── TabsContainer.tsx       # Gerenciador de abas
│   │       │   ├── TabBar.tsx              # Seletor de abas
│   │       │   ├── ConteudoLinguagemSimples.tsx
│   │       │   ├── ConteudoPontosPrincipais.tsx
│   │       │   ├── ConteudoOQueMuda.tsx
│   │       │   ├── InitialState.tsx        # Estado inicial (antes de clicar)
│   │       │   ├── LoadingState.tsx        # Carregando...
│   │       │   ├── LoadingContent.tsx      # Skeleton loading
│   │       │   ├── ResultState.tsx         # Resultado pronto
│   │       │   ├── ErrorMessage.tsx        # Mensagem de erro
│   │       │   └── TextoFormatado.tsx      # Formatação de texto
│   │       │
│   │       ├── hooks/
│   │       │   ├── useSimplificar.ts       # Lógica de chamada à API
│   │       │   ├── useConteudoPagina.ts    # Recupera conteúdo do background
│   │       │   └── useCache.ts             # Gerencia cache de requisições
│   │       │
│   │       └── utils/
│   │           └── formatacao.tsx          # Funções de formatação
│   │
│   ├── wxt.config.ts                       # Configuração do WXT
│   ├── tsconfig.json
│   ├── package.json
│   └── manifest.json (gerado)
│
├── lei-facil-backend/                      # Backend em Go
│   ├── cmd/
│   │   └── main.go                         # Entrypoint do servidor
│   │
│   ├── internal/
│   │   ├── handler/
│   │   │   ├── simplificar.go              # Handler HTTP dos endpoints
│   │   │   └── simplificar_test.go         # Testes dos handlers
│   │   │
│   │   ├── gemini/
│   │   │   ├── client.go                   # Cliente Google Gemini
│   │   │   └── client_test.go              # Testes do cliente Gemini
│   │   │
│   │   └── deepseek/
│   │       └── client.go                   # Cliente DeepSeek (experimental, não integrado)
│   │
│   ├── go.mod                              # Dependências Go
│   ├── go.sum
│   ├── Dockerfile                          # Build multi-stage para produção
│   ├── .env.example                        # Variáveis de ambiente (exemplo)
│   ├── .env                                # Variáveis de ambiente (não commitar)
│   └── CONTRATO_API.md                     # Documentação dos endpoints
│
├── .gitignore
└── README.md
```

---

## 📋 Responsabilidade de cada arquivo

### Frontend (lei-facil-extension)

| Arquivo | Responsabilidade |
|---------|-----------------|
| **content.ts** | Script injetado na página que: injeta botão "Simplificar", extrai o conteúdo da lei ao clicar, envia para o background |
| **background.ts** | Service worker que armazena conteúdo extraído e abre o popup quando solicitado |
| **App.tsx** | Componente raiz que gerencia estado global do popup |
| **useSimplificar.ts** | Hook customizado que chama o backend, gerencia cache e controla estado de abas |
| **useConteudoPagina.ts** | Hook que recupera o conteúdo extraído do background script |
| **useCache.ts** | Hook que gerencia cache local em `chrome.storage` com versionamento de prompts |
| **TabsContainer.tsx** | Renderiza 3 abas: "Linguagem Simples", "Pontos Principais", "O que Muda pra Mim" |
| **Componentes** | Header, TabBar, estados (Loading, Result, Error, Initial) e TextoFormatado |
| **types.ts** | Interfaces compartilhadas (RespostaAPI, EstadoAbas, AbaTipo) |

### Backend (lei-facil-backend)

| Arquivo | Responsabilidade |
|---------|------------------|
| **main.go** | Inicia servidor HTTP, configura CORS, registra rotas, carrega variáveis `.env` |
| **handler/simplificar.go** | 2 endpoints HTTP: `POST /simplificar` e `POST /o-que-muda`, validação de entrada |
| **handler/simplificar_test.go** | Testes unitários dos handlers |
| **gemini/client.go** | Cliente Google Gemini com 3 métodos: `Simplify`, `SimplifyStructured`, `AnalyzeImpact` |
| **gemini/client_test.go** | Testes com mocks HTTP do cliente Gemini |
| **deepseek/client.go** | Cliente DeepSeek para IA (experimental, não integrado aos endpoints) |
| **.env** | Variáveis de ambiente: `GEMINI_API_KEY`, `PORT`, `ALLOWED_ORIGIN` |
| **Dockerfile** | Multi-stage build otimizado (base Go slim → imagem Alpine ~10MB) |

---

## 🔑 Configuração de Variáveis de Ambiente

### Backend (lei-facil-backend/.env)

```env
# Obter em https://aistudio.google.com/apikey
GEMINI_API_KEY=AIzaSyD_xxxxxxxxxxxxxxxxxxxxxx

# Porta do servidor (padrão: 8000)
PORT=8000

# Origem CORS permitida (extensão Chrome)
# Formato: chrome-extension://ID_DA_EXTENSAO
# Obter ID em chrome://extensions (após instalar a extensão)
ALLOWED_ORIGIN=chrome-extension://xxxxxxxxxxxxxxxxxx

# Opcional: URL do backend (frontend)
# BACKEND_URL=http://localhost:8000
```

### Como obter a Chave de API do Google Gemini

1. Acesse [aistudio.google.com](https://aistudio.google.com)
2. Clique em **Get API key**
3. Clique em **Create API key in new project**
4. Copie a chave e cole em `.env`

### Como obter o ID da Extensão

1. Após instalar a extensão no Chrome, abra `chrome://extensions`
2. O ID da extensão estará abaixo do nome (ex: `xxxxxxxxxxxxxxxxxx`)
3. Configure no `ALLOWED_ORIGIN`

---

## 🔐 Segurança

* A chave do Gemini **nunca é armazenada na extensão**
* Todas as chamadas passam por um backend próprio que protege a chave
* CORS está configurado para aceitar apenas requisições da sua extensão
* As requisições são validadas no servidor (tamanho máximo, campos obrigatórios)

---

## 📡 API do Backend

### Endpoints

#### POST /simplificar
Simplifica o texto da lei em três aspectos.

**Request:**
```json
{
  "text": "Artigo 1º - Esta Lei dispõe sobre..."
}
```

**Response:**
```json
{
  "resumo": "Em palavras simples: esta lei trata sobre...",
  "corpo": "Explicação acessível do conteúdo...",
  "pontos": [
    "Ponto importante 1",
    "Ponto importante 2"
  ]
}
```

**Validações:**
- Campo `text` obrigatório
- Máximo 50.000 caracteres
- Retorna HTTP 400 se inválido

#### POST /o-que-muda
Analisa o impacto prático da lei na vida do cidadão.

**Request:**
```json
{
  "text": "Artigo 1º - Esta Lei dispõe sobre..."
}
```

**Response:**
```json
{
  "resumo": "Impacto geral da lei...",
  "corpo": "Como essa lei afeta sua vida no dia a dia..."
}
```

---

## ⚙️ Tecnologias Detalhadas

### Frontend
- **React 19.2.4** — Framework UI
- **WXT 0.20.27** — Build tool para extensões
- **TypeScript 5.9.3** — Linguagem tipada
- **Lucide React** — Ícones

### Backend
- **Go 1.25.4** — Linguagem de programação
- **Google AI SDK** — Integração com Gemini
- **net/http** — Servidor HTTP nativo
- **github.com/joho/godotenv** — Carregamento de variáveis de ambiente

---

## 🧪 Testes

### Backend
```bash
cd lei-facil-backend
go test ./...
```

Cobertura atual:
- Handler HTTP: 5 testes
- Cliente Gemini: 8 testes


## 🗺️ Roadmap

Próximos passos planejados para o projeto:

- [ ] Implementar logging estruturado
- [ ] Adotar MutationObserver no content script para detectar carregamento dinâmico de conteúdo
- [ ] Integrar o cliente DeepSeek como provedor alternativo de IA
- [ ] Configurar CI/CD (GitHub Actions)
- [ ] Adicionar documentação JSDoc nos hooks
- [ ] Implementar TTL (time-to-live) no cache
- [ ] Adotar tratamento de erros com tipos discriminados
- [ ] Melhorar acessibilidade (ARIA labels)

---

## 💡 Como Contribuir

Este projeto está aberto a contribuições! Se encontrou um bug ou tem uma ideia de melhoria:

1. Abra uma [Issue](https://github.com/seu-usuario/leiafacil/issues)
2. Faça um fork e crie uma branch (`git checkout -b feature/sua-feature`)
3. Commit suas mudanças (`git commit -m 'Add: sua feature'`)
4. Push para a branch (`git push origin feature/sua-feature`)
5. Abra um Pull Request

---

## 📄 Licença

MIT