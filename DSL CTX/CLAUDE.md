# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sistema di generazione automatica di **DSL (Domain Specific Language) JSON** per verifica requisiti pratiche burocratiche italiane. Il sistema include:
- Chat agent conversazionale (n8n workflow)
- Generazione automatica DSL da requisiti testuali
- Validazione schema e semantica
- Test runner locale per DSL
- Feedback loop con retry automatico

**Contesto:** Sistema per patronati/CAF italiani che verifica l'ammissibilità ai servizi (es. Congedo Maternità, Assegno Unico, Bonus Nido).

---

## Architettura del Sistema

### 1. Componenti n8n (Produzione)

**File critici per n8n Code nodes:**
- `dsl-creation-test/nodo-code-generazione-prompt.js` - Genera prompt OpenAI (system + user message)
- `dsl-creation-test/dsl-schema-validator.js` - Valida schema DSL + gestisce retry logic

**Input n8n validator:**
```javascript
const input = $input.first().json.message.content;
// Nota: legge da message.content, NON da json diretto
```

**Workflow n8n completo:** Vedi `n8n-workflow-architecture.md`

### 2. Test Runner Locale

**Esegue il loop completo generazione→validazione→correzione:**
```bash
cd dsl-creation-test
node dsl-creation-test-runner.js "requisiti qui"
# oppure
node dsl-creation-test-runner.js requisiti.txt
```

**Configurazione:**
- Crea `.env` con `OPENAI_API_KEY=sk-...`
- MAX_TENTATIVI configurabile (default: 3)
- Output: `tests/{nome}/dsl-generated.json` + report

### 3. Struttura DSL

**Schema incrementale** (`schema-dsl-incrementale.json`):
```json
{
  "title": "Nome Pratica",
  "evaluation_mode": "incremental",
  "steps": [
    {
      "var": "nome_variabile",
      "ask": "Domanda (sì/no)",
      "type": "boolean|string|number",
      "skip_if": "condizione_js (opzionale)"
    }
  ],
  "reasons_if_fail": [
    {
      "when": "condizione_js",
      "reason": "Motivo esclusione",
      "check_after_vars": ["var1", "var2"],
      "blocking": true
    }
  ],
  "next_actions_if_ok": ["Azione 1", "Azione 2"]
}
```

**Esempi completi:** `DSL definitive/`

---

## Come Funziona il Sistema

### Fase 1: Generazione Prompt (n8n Code node)

**File:** `dsl-creation-test/nodo-code-generazione-prompt.js`

**Logica:**
1. Legge `tentativo_numero` dall'input e incrementa
2. Determina `mode`: tentativo 1 = "generazione", >1 = "correzione"
3. Legge `MAX_TENTATIVI` da `$env.MAX_DSL_RETRIES` o `$json.max_tentativi` (default: 3)
4. Genera `systemPrompt` (regole DSL) + `userMessage` (requisiti specifici)

**Output:**
```javascript
{
  systemPrompt: "Sei un esperto...",
  userMessage: "Genera DSL per...",
  tentativo_numero: 2,
  max_tentativi: 3,
  requisiti_utente: "..."
}
```

### Fase 2: Chiamata OpenAI

**Configurazione critica:**
- Model: `gpt-4o` (NON mini - meno affidabile)
- Temperature: `0` (deterministico)
- Seed: `42` (consistenza)
- Response format: `json_object`

**Passa i dati con Pass-Through abilitato** per mantenere `tentativo_numero` e `max_tentativi`.

### Fase 3: Validazione Schema (n8n Code node)

**File:** `dsl-creation-test/dsl-schema-validator.js`

**Validazioni:**
1. **Schema strutturale:** campi obbligatori, tipi corretti
2. **Coerenza variabili:** check_after_vars deve contenere var dichiarate in steps
3. **Validazione JavaScript:** sintassi valida in `when` e `skip_if`
4. **Scope progressivo:** `skip_if` può usare solo variabili dichiarate PRIMA

**Output con retry logic:**
```javascript
if (errors.length === 0) {
  return { valid: true, dsl: dslRaw, retry: false };
} else if (tentativo < max_tentativi) {
  return {
    valid: false,
    retry: true,  // ← Flag per IF node
    dsl_da_correggere: dslRaw,
    errori_validazione: errors,
    tentativo_numero: tentativo
  };
} else {
  return { valid: false, retry: false }; // Tentativi esauriti
}
```

### Fase 4: IF Node Decision

**Condizioni:**
- `valid === true` → Output DSL valida
- `valid === false && retry === true` → Loop back a Prepare Prompt
- `valid === false && retry === false` → Errore finale

---

## Validazione JavaScript nelle Espressioni

Il validator verifica **sintassi JS + variabili** in `when` e `skip_if`:

**Metodo:**
1. `new Function(expression)` per validare sintassi
2. Regex `/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g` per estrarre variabili
3. Filtra keywords JS (true, false, if, else, ecc.)
4. Verifica che variabili usate siano dichiarate in steps

**Esempi errori rilevati:**
```javascript
// ❌ Sintassi invalida
"when": "isee < 40000 &&"
// → Errore: Sintassi JavaScript invalida

// ❌ Variabile non dichiarata (typo)
"when": "cittadino_italia === true"  // Manca "no"
// → Errore: Variabili non dichiarate: cittadino_italia

// ❌ Variabile futura in skip_if
Step 2: { "skip_if": "var_step_5 === true" }  // var_step_5 dichiarato dopo
// → Errore: Variabili non dichiarate in Step 2
```

---

## Problema Noto: Generazione DSL Errata

**Sintomo:** OpenAI genera DSL per pratica sbagliata (es. "Indennità disoccupazione" invece di "Congedo maternità").

**Causa:** Input testuale troppo complesso, OpenAI si confonde con parole chiave (NASPI, gestione separata, contributi).

**Soluzione proposta:** Vedi `strategia-generazione-dsl-affidabile.md`

### Strategia Multi-Fase (da implementare)

```
Input caotico
  ↓
[FASE 1] Normalizzazione → JSON strutturato
  ↓
[FASE 2] Generazione DSL → DSL candidata
  ↓
[FASE 3] Validazione Semantica → Confidence score
  ↓
Se < 80% → [FASE 4] Revisione umana + Golden examples
```

**Vantaggi:**
- Separa comprensione da generazione
- Quality gate automatico
- Feedback loop con esempi corretti
- Costo: ~$0.09-0.25 per DSL

---

## Comandi Comuni

### Test DSL Generation Loop

**CONSIGLIATO: Usa il nuovo simulatore workflow n8n** (replica esatta del comportamento n8n):

```bash
cd dsl-creation-test

# Verifica configurazione
node test-setup.js

# Test con requisiti da file
node n8n-workflow-simulator.js ../requisiti-congedo-maternita.md

# Test con testo diretto
node n8n-workflow-simulator.js "Requisito 1, Requisito 2..."

# Output in tests/{nome-pratica}/
# - workflow-execution-report.md  (report dettagliato con timeline)
# - dsl-generated.json             (DSL finale se valida)
# - execution-data.json            (dati raw per debug)
```

**Alternativa (vecchio script, meno fedele a n8n):**

```bash
cd dsl-creation-test

# Test con requisiti da file
node dsl-creation-test-runner.js ../requisiti-congedo-maternita.md

# Test con testo diretto
node dsl-creation-test-runner.js "Requisito 1, Requisito 2..."

# Output in tests/{nome-pratica}/
```

**Differenze chiave:**
- ✅ `n8n-workflow-simulator.js`: simula esattamente l'ambiente n8n, usa i file dei nodi originali
- ⚠️ `dsl-creation-test-runner.js`: estrae prompt con regex, simulazione parziale

Vedi `dsl-creation-test/README-SIMULATOR.md` per documentazione completa.

### Test DSL Execution (Simulazione Chat)

```bash
cd dsl-execution-test

# Esegue una DSL esistente con risposte simulate
node dsl-test-runner.js ../DSL\ definitive/dsl-assegno-unico.json
```

### **NUOVO**: Test Automatico Completo DSL

**Generatore automatico di TUTTE le casistiche possibili:**

```bash
cd dsl-execution-test

# Genera e testa automaticamente TUTTE le combinazioni
node dsl-automated-test-generator.js <dsl-file.json>

# Esempio: test DSL appena generata
node dsl-automated-test-generator.js ../dsl-creation-test/tests/checklist-bonus-nido-text/dsl-generated.json
```

**Output:**
- `automated-tests/{dsl-name}/automated-test-report.md` - Report dettagliato
- `automated-tests/{dsl-name}/automated-test-results.json` - Dati JSON

**Caratteristiche:**
- ✅ Genera automaticamente tutte le combinazioni (es. 8 boolean = 256 casi)
- ✅ Smart sampling per DSL complesse (>1000 casi)
- ✅ Simula esattamente il workflow n8n (CTX, skip_if, incremental)
- ✅ Report con CTX completa, trace domande, motivi blocco
- ✅ Tempo: ~1-2 secondi per 256 test

**Esempio output:**
```
📊 Analisi DSL:
   Boolean steps: 8
   Casistiche stimate: ~256
✅ Generati 256 casi test

📊 RISULTATI:
Totale test: 256
✅ Passati: 256 (100%)
```

Vedi `dsl-execution-test/README-AUTOMATED-GENERATOR.md` per documentazione completa.

### Validare DSL Manualmente

```javascript
// Simula ambiente n8n
const $input = {
  first: () => ({
    json: {
      message: {
        content: { dsl: dslObject }
      }
    }
  })
};

// Esegui validator
const result = eval(fs.readFileSync('dsl-schema-validator.js', 'utf8'));
console.log(result); // { valid: true/false, errors: [...] }
```

---

## File Critici da Non Modificare Senza Testare

1. **`dsl-schema-validator.js`** - Usato in produzione n8n
   - Input DEVE essere `$input.first().json.message.content`
   - Output con `retry` flag per IF node

2. **`nodo-code-generazione-prompt.js`** - Usato in produzione n8n
   - Gestisce `tentativo_numero` automaticamente
   - Legge `MAX_TENTATIVI` da env/input

3. **Schema DSL** (`schema-dsl-incrementale.json`)
   - Struttura fissa per tutte le DSL
   - Modifica richiede aggiornamento validator + prompt

---

## Regole DSL Critiche

### Consistenza Nomi Variabili

**SEMPRE identici in:**
- `steps[].var`
- `skip_if`
- `when`
- `check_after_vars`

**Esempio corretto:**
```json
{
  "var": "cittadino_italiano_ue",
  "skip_if": "cittadino_italiano_ue === true",
  "when": "cittadino_italiano_ue === false",
  "check_after_vars": ["cittadino_italiano_ue"]
}
```

### Tipi Corretti

- `evaluation_mode`: sempre `"incremental"`
- `type`: solo `"boolean"`, `"string"`, `"number"`
- `blocking`: sempre `true` (boolean, NON stringa "true")

### Logica "Almeno Uno"

Per requisiti OR (almeno uno deve essere vero):
```json
{
  "when": "var1 === false && var2 === false",
  "reason": "Serve almeno uno tra var1 o var2"
}
```

### Next Actions

- Prima azione: "Prenota appuntamento con CAF o Patronato di zona"
- Documenti condizionali con prefissi: "Se extracomunitario: permesso soggiorno"

---

## Documenti Chiave

- **`n8n-workflow-architecture.md`** - Architettura completa workflow n8n
- **`n8n-workflow-setup-retry.md`** - Setup retry loop configurabile
- **`strategia-generazione-dsl-affidabile.md`** - Soluzione al problema generazione errata
- **`linee-guida-compilazione-requisiti.md`** - Come scrivere requisiti per DSL
- **`requisiti-congedo-maternita.md`** - Esempio requisiti estratti da vademecum

---

## Environment Variables n8n

```bash
# Configurazione retry
MAX_DSL_RETRIES=3              # Default: 3 tentativi

# OpenAI (già configurato in credentials n8n)
# Model: gpt-4o
# Temperature: 0
# Seed: 42
```

---

## Note per Sviluppo Futuro

### Quando Modificare il Validator

Se aggiungi nuove validazioni:
1. Modifica `dsl-schema-validator.js`
2. Testa con `dsl-creation-test-runner.js`
3. Verifica che `retry` flag funzioni correttamente
4. Aggiorna esempi in `DSL definitive/`

### Quando Modificare il Prompt

Se cambi regole DSL:
1. Modifica `nodo-code-generazione-prompt.js` (basePrompt)
2. Aggiorna esempio in prompt
3. Testa generazione con requisiti complessi
4. Verifica che validator riconosca nuove regole

### Implementare Strategia Multi-Fase

Quando pronto a implementare `strategia-generazione-dsl-affidabile.md`:
1. Crea nodo "Normalizza Requisiti" (Fase 1)
2. Modifica "Genera Prompt" per usare JSON normalizzato (Fase 2)
3. Aggiungi nodo "Valida Semantica" con confidence score (Fase 3)
4. Setup database golden_examples (Fase 4)

---

## Riferimenti Esterni

- n8n: https://n8n.io
- OpenAI API: https://platform.openai.com/docs
- DSL Pattern: Domain-Specific Language per decision trees incrementali
