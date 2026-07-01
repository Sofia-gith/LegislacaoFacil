# Contrato da API - Lei Fácil Backend

## Versão 2.0 - Respostas Estruturadas

### Endpoints

#### POST `/simplificar`

Simplifica um texto de lei em linguagem acessível com estrutura JSON.

**Request:**
```json
{
  "text": "Artigo 1º da Lei Municipal..."
}
```

**Response (200 OK):**
```json
{
  "resumo": "1-2 frases explicando o que é o documento e o que ele decide",
  "corpo": "Explicação detalhada em linguagem simples, preservando todas as informações factuais (datas, números de lei, URLs, prazos). Usa bullets para itens sequenciais quando apropriado.",
  "pontos": [
    "Ponto principal 1",
    "Ponto principal 2",
    "Ponto principal 3"
  ]
}
```

**Características:**
- Preserva 100% das informações factuais (datas, números de lei, URLs)
- Mantém termos técnicos com explicação parentética
- Quebra cadeias de leis em mini-listas
- Abre com resumo de 1-2 frases
- Usa bullets para itens sequenciais
- Array `pontos` contém 3-5 pontos principais (sempre derivado do mesmo prompt)

**Error Response (400/500):**
```json
{
  "error": "Descrição do erro"
}
```

---

#### POST `/o-que-muda`

Analisa como a lei afeta uma pessoa comum (impacto prático).

**Request:**
```json
{
  "text": "Artigo 1º da Lei Municipal..."
}
```

**Response (200 OK):**
```json
{
  "resumo": "1-2 frases explicando como isso afeta uma pessoa comum",
  "corpo": "Detalhes práticos de como a lei muda o dia a dia, com exemplos quando possível"
}
```

**Características:**
- Foca apenas no impacto prático e direto
- Usa linguagem simples
- Mantém informações factuais importantes
- Sem field `pontos` (apenas resumo e corpo)

**Error Response (400/500):**
```json
{
  "error": "Descrição do erro"
}
```

---

## Validações

Ambos os endpoints validam:

1. **Método HTTP:** POST obrigatório
2. **Content-Type:** `application/json`
3. **Campo `text`:** Obrigatório, não vazio
4. **Tamanho máximo:** 50.000 caracteres

**Respostas de erro:**

| Status | Erro | Descrição |
|--------|------|-----------|
| 400 | `invalid json` | JSON malformado |
| 400 | `text is required` | Campo `text` vazio ou ausente |
| 400 | `text exceeds maximum length...` | Texto maior que 50.000 caracteres |
| 405 | `method not allowed` | Método HTTP não é POST |
| 500 | API error | Falha na chamada ao Gemini |

---

## CORS

Configurado via variável `ALLOWED_ORIGIN`:
- Se vazio: permite `*` (desarrollo)
- Se preenchido: apenas essa origem pode fazer requisições

---

## Exemplos de Requisição

### cURL - Simplificar

```bash
curl -X POST http://localhost:8000/simplificar \
  -H "Content-Type: application/json" \
  -d '{"text":"Artigo 1º Lei xxx..."}'
```

### cURL - O que muda

```bash
curl -X POST http://localhost:8000/o-que-muda \
  -H "Content-Type: application/json" \
  -d '{"text":"Artigo 1º Lei xxx..."}'
```

---

## Prompts do Sistema

### Simplificar (`/simplificar`)

Instrui o Gemini a:
- Reescrever em linguagem simples
- Preservar TODOS os fatos
- Manter termos técnicos com explicação
- Quebrar cadeias de leis em listas
- Começar com resumo de 1-2 frases
- Usar bullets para sequências
- Retornar JSON estruturado: `{ resumo, corpo, pontos }`

### Analisar Impacto (`/o-que-muda`)

Instrui o Gemini a:
- Explicar impacto prático para cidadão comum
- Focar em como afeta o dia a dia
- Preservar informações factuais
- Usar linguagem simples
- Retornar JSON estruturado: `{ resumo, corpo }`

---

## Fluxo Frontend

1. **Tela inicial:** Botão "Simplificar esta lei"
2. **Ao clicar:** Requisição POST para `/simplificar`
3. **Recebe:** `{ resumo, corpo, pontos }`
4. **Renderiza:** 3 abas
   - **"Linguagem simples":** Resumo + Corpo (ativa por padrão)
   - **"Pontos principais":** Lista de `pontos` (sem chamada extra)
   - **"O que muda pra mim?":** CTA button → Requisição lazy para `/o-que-muda` ao clicar
5. **Cache:** Armazena `linguagemSimples` + `oQueMudaPraMim` por norma (sem expiração)

---

## Roadmap Futuro

- [ ] Suporte a diferentes modelos (Deepseek, Claude)
- [ ] Cache de respostas do Gemini
- [ ] Rate limiting por IP
- [ ] Análise de performance
- [ ] Versionamento de prompts para A/B testing
