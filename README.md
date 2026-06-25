# Extensão de navegador com WXT + React

Esse respositorio é um sistema que ajuda a ler e entender o conteúdo do portal da legislação municipal.


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

```
lei-facil-extension/
├── public/
│   └── glossario.json          # Termos jurídicos e definições
├── src/
│   ├── entrypoints/
│   │   ├── content.ts          # Content script — injeta UI na página
│   │   └── background.ts       # Service worker — chama a API do Gemini
│   ├── components/
│   │   ├── Tooltip.ts          # Tooltip do glossário
│   │   └── PainelSimplificar.ts
│   └── utils/
│       ├── glossario.ts        # Lógica de highlight via TreeWalker
│       └── gemini.ts           # Helper de prompt
└── wxt.config.ts
```

---

##  Configuração da API

A chave do Gemini **não é armazenada na extensão**. As chamadas passam por um backend próprio para proteger a chave.

> Instruções de configuração do backend em breve.

---

## ⚠️ Aviso

As simplificações geradas por IA são um **apoio à compreensão** e não substituem assessoria jurídica profissional.

---

## 📄 Licença

MIT