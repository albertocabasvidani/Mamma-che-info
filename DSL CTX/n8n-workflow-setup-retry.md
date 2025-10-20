# Setup Workflow n8n con Retry Loop Configurabile

## Architettura Retry Loop

```
[Prepare Prompt] → [OpenAI] → [Validate DSL]
       ▲                              │
       │                              ▼
       │                         [IF Node]
       │                              │
       │                         ┌────┴────┐
       │                         │         │
       └─────────────────────────┤  retry  │
                                 │  =true  │
                                 └─────────┘
```

## Configurazione MAX_TENTATIVI

Il numero massimo di tentativi è configurabile tramite:

### Opzione 1: Environment Variable (consigliato)
Nel pannello n8n Settings → Environment Variables:
```bash
MAX_DSL_RETRIES=3
```

### Opzione 2: Input Parameter
Passare `max_tentativi` nell'input iniziale del Tool:
```json
{
  "requisiti_utente": "...",
  "max_tentativi": 5
}
```

**Ordine di precedenza:**
1. `$env.MAX_DSL_RETRIES`
2. `$json.max_tentativi`
3. Default: `3`

## Configurazione Nodi

### 1. Nodo "Code: Prepare Prompt"

**Codice:** Usa `nodo-code-generazione-prompt.js`

**Input richiesto (primo tentativo):**
```json
{
  "requisiti_utente": "Testo completo dei requisiti",
  "max_tentativi": 3  // opzionale, default da env
}
```

**Input retry (tentativi successivi):**
```json
{
  "requisiti_utente": "...",
  "dsl_da_correggere": { /* DSL con errori */ },
  "errori_validazione": ["errore 1", "errore 2"],
  "tentativo_numero": 1,
  "max_tentativi": 3
}
```

**Output:**
```json
{
  "systemPrompt": "...",
  "userMessage": "...",
  "tentativo_numero": 2,
  "max_tentativi": 3,
  "requisiti_utente": "..."
}
```

### 2. Nodo "OpenAI Chat Model"

**Configurazione:**
- Model: `gpt-4o`
- Temperature: `0`
- Seed: `42`
- Response Format: `json_object`

**Mapping:**
- System Message: `{{ $json.systemPrompt }}`
- User Message: `{{ $json.userMessage }}`

**Pass Through:** Abilita per mantenere `tentativo_numero`, `max_tentativi`, `requisiti_utente`

### 3. Nodo "Code: Validate DSL"

**Codice:** Usa `dsl-schema-validator.js`

**Validazioni eseguite:**

1. **Schema strutturale:**
   - Campi obbligatori: title, evaluation_mode, steps, reasons_if_fail, next_actions_if_ok
   - Tipi corretti: type ("boolean"/"string"/"number"), blocking (boolean)
   - Coerenza variabili in check_after_vars

2. **Validazione JavaScript (NEW):**
   - Sintassi valida in `when` e `skip_if`
   - Variabili usate devono essere dichiarate in steps
   - `skip_if` può usare solo variabili dichiarate PRIMA di quel step

**Esempi errori rilevati:**
```javascript
// ❌ Sintassi invalida
"when": "isee < 40000 &&"
→ "Sintassi JavaScript invalida in Reason 0 campo 'when': Unexpected token ')'"

// ❌ Variabile non dichiarata
"when": "cittadino_italia === true"  // typo: "italia" invece di "italiano"
→ "Variabili non dichiarate in Reason 0 campo 'when': cittadino_italia"

// ❌ Skip_if usa variabile dichiarata dopo
Step 1: "var": "cittadino_italiano"
Step 2: "var": "extracom", "skip_if": "cittadino_italiano === true"  ✅ OK
Step 3: "var": "isee_valido", "skip_if": "extracom === true"  ✅ OK
Step 4: "var": "residenza", "skip_if": "isee_valido === true"  ✅ OK

// Ma:
Step 2: "skip_if": "isee_valido === true"  ❌ ERRORE (isee_valido dichiarato dopo)
```

**Input automatico dal nodo precedente** (con pass-through):
```json
{
  "dsl": { /* output OpenAI */ },
  "tentativo_numero": 2,
  "max_tentativi": 3,
  "requisiti_utente": "..."
}
```

**Output (3 scenari):**

**A) DSL Valida:**
```json
{
  "valid": true,
  "dsl": { /* DSL validata */ },
  "message": "DSL valida (tentativo 2/3)",
  "tentativo_numero": 2,
  "retry": false
}
```

**B) DSL Non Valida + Retry:**
```json
{
  "valid": false,
  "errors": ["errore 1", "errore 2"],
  "message": "Trovati 2 errori - Tentativo 2/3",
  "dsl_da_correggere": { /* DSL con errori */ },
  "errori_validazione": ["errore 1", "errore 2"],
  "requisiti_utente": "...",
  "tentativo_numero": 2,
  "max_tentativi": 3,
  "retry": true
}
```

**C) Tentativi Esauriti:**
```json
{
  "valid": false,
  "errors": ["errore 1", "errore 2"],
  "message": "DSL non valida dopo 3 tentativi",
  "dsl_da_correggere": { /* DSL con errori */ },
  "tentativo_numero": 3,
  "retry": false
}
```

### 4. Nodo "IF"

**Condizioni:**

**Condizione 1 - Successo:**
```javascript
{{ $json.valid }} === true
```
→ Output: DSL valida al Tool/Agent

**Condizione 2 - Retry:**
```javascript
{{ $json.valid }} === false && {{ $json.retry }} === true
```
→ Loop back a "Prepare Prompt"

**Condizione 3 - Errore Finale:**
```javascript
{{ $json.valid }} === false && {{ $json.retry }} === false
```
→ Output: Errore al Tool/Agent

## Flow Completo

### Scenario 1: Successo al Primo Tentativo

```
1. Tool Input → Prepare Prompt
   Input: { requisiti_utente: "...", max_tentativi: 3 }

2. Prepare Prompt → OpenAI
   Output: { systemPrompt, userMessage, tentativo_numero: 1, max_tentativi: 3 }

3. OpenAI → Validate
   Output: { dsl: {...}, tentativo_numero: 1, max_tentativi: 3 }

4. Validate → IF
   Output: { valid: true, dsl: {...}, retry: false }

5. IF (valid === true) → Tool Output
   ✅ DSL valida restituita all'Agent
```

### Scenario 2: Errori con Retry

```
1. Tool Input → Prepare Prompt
   Input: { requisiti_utente: "...", max_tentativi: 3 }

2. Tentativo 1: OpenAI → Validate
   Output: { valid: false, retry: true, tentativo_numero: 1, errors: [...] }

3. IF (retry === true) → LOOP BACK a Prepare Prompt
   Input: { dsl_da_correggere, errori_validazione, tentativo_numero: 1, max_tentativi: 3 }

4. Tentativo 2: Prepare Prompt (mode=correzione) → OpenAI → Validate
   Output: { valid: true, dsl: {...}, retry: false }

5. IF (valid === true) → Tool Output
   ✅ DSL corretta al tentativo 2
```

### Scenario 3: Tentativi Esauriti

```
1-2. Tentativo 1: Errori → retry: true
3-4. Tentativo 2: Errori → retry: true
5-6. Tentativo 3: Errori → retry: false

7. IF (valid === false && retry === false) → Tool Output
   ❌ Errore: "DSL non valida dopo 3 tentativi"
```

## Testing

### Test 1: Cambia MAX_TENTATIVI da 3 a 5

**Environment Variable:**
```bash
MAX_DSL_RETRIES=5
```

**Esegui workflow e verifica:**
- Messaggio "Tentativo X/5"
- Massimo 5 tentativi prima di errore finale

### Test 2: Override con Input Parameter

**Input:**
```json
{
  "requisiti_utente": "Bonus Nido...",
  "max_tentativi": 10
}
```

**Verifica:**
- Messaggio "Tentativo X/10"
- MAX_TENTATIVI da input override env variable

### Test 3: Verifica Loop Retry

**Forza errore nel prompt** (es. togli un campo obbligatorio):
```javascript
// Nel basePrompt, rimuovi "evaluation_mode" dall'esempio
```

**Verifica:**
- Primo tentativo: errore "Campo evaluation_mode obbligatorio"
- Secondo tentativo: correzione automatica
- DSL valida o errore dopo MAX_TENTATIVI

## Note Implementative

### Pass-Through nei Nodi

**IMPORTANTE:** Il nodo OpenAI deve avere **"Options" → "Pass-Through"** abilitato per mantenere:
- `tentativo_numero`
- `max_tentativi`
- `requisiti_utente`

Altrimenti il validatore non riceve questi dati.

### Prevenire Loop Infiniti

Il validatore **garantisce stop** perché:
- `retry: true` solo se `tentativo < max_tentativi`
- `retry: false` quando `tentativo >= max_tentativi`
- IF Node usa `retry` flag per decidere

### Monitoraggio

Log utili da aggiungere:
```javascript
console.log(`[DSL Retry] Tentativo ${tentativo}/${maxTentativi}`);
console.log(`[DSL Retry] Errori: ${errors.length}`);
console.log(`[DSL Retry] Retry: ${retry}`);
```

---

**Versione:** 1.0
**Data:** 2025-01-20
**Compatibile con:** n8n v1.0+
