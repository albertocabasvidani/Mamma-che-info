# DSL Automated Test Generator

Generatore automatico di **TUTTE** le casistiche possibili per una DSL, con test completo e report dettagliato.

## 🎯 Caratteristiche

✅ **Generazione automatica** - Analizza la DSL e genera tutte le combinazioni possibili
✅ **Simulazione workflow n8n** - Usa il codice esatto di creazione/avanzamento CTX
✅ **Test completo** - Esegue tutti i casi con valutazione incrementale
✅ **Report dettagliati** - JSON + Markdown con CTX, trace domande, motivi blocco
✅ **Smart sampling** - Per DSL complesse (>1000 casi) genera sample intelligenti

## 🚀 Utilizzo

### Sintassi Base

```bash
cd dsl-execution-test
node dsl-automated-test-generator.js <dsl-file.json>
```

### Esempio

```bash
# Test DSL Bonus Nido
node dsl-automated-test-generator.js ../dsl-creation-test/tests/checklist-bonus-nido-text/dsl-generated.json

# Test DSL Assegno Unico
node dsl-automated-test-generator.js ../DSL\ definitive/dsl-assegno-unico.json
```

## 📊 Output

Lo script crea una cartella `automated-tests/{dsl-name}/` con:

### 1. Report Markdown (`automated-test-report.md`)

```markdown
# Report Test Automatico DSL - Domanda Bonus Asilo Nido INPS

**Totale Test**: 256
**Passati**: 256 (100%)
**Falliti**: 0 (0%)

## Riepilogo Test
| # | Risultato | Domande | Esito |
|---|-----------|---------|-------|
| 1 | ✅ PASS | 1 | non_ammissibile |
| 2 | ✅ PASS | 3 | non_ammissibile |
...

### Test 1
**Input**: ["no", "no", "no", ...]
**Risultato**: non_ammissibile
**Motivo**: Il genitore richiedente deve essere residente in Italia.
**Fermato a**: residente_in_italia
```

### 2. Report JSON (`automated-test-results.json`)

```json
{
  "timestamp": "2025-10-29T13:34:01.773Z",
  "dsl": {
    "title": "Domanda Bonus Asilo Nido INPS",
    "evaluation_mode": "incremental",
    "total_steps": 8,
    "total_reasons": 5
  },
  "summary": {
    "total_tests": 256,
    "passed": 256,
    "failed": 0,
    "errors": 0
  },
  "results": [
    {
      "testNumber": 1,
      "inputs": ["no", "no", "no", ...],
      "result": "non_ammissibile",
      "reason": "...",
      "questionsAsked": 1,
      "stoppedAt": "residente_in_italia",
      "ctx": { ... }
    }
  ]
}
```

## 🔬 Come Funziona

### 1. Analisi DSL

```javascript
📊 Analisi DSL:
   Boolean steps: 8
   Number steps: 2
   String steps: 1
   Total steps: 11
   Casistiche stimate: ~3072
```

Lo script analizza:
- **Boolean steps**: genera 2^n combinazioni (sì/no)
- **Number steps**: genera 3 valori boundary (min, medio, max)
- **String steps**: genera 2-3 valori tipici

### 2. Generazione Casistiche

#### Modalità Completa (< 1000 casi)

Genera **TUTTE** le combinazioni possibili:
- 8 boolean = 2^8 = 256 casi
- 10 boolean = 2^10 = 1024 casi → **Smart Sampling**

#### Modalità Smart Sampling (> 1000 casi)

Per DSL complesse genera sample intelligenti:

1. **Happy Path** - Tutto "sì" (caso ideale)
2. **Worst Case** - Tutto "no" (caso peggiore)
3. **Reason Triggers** - Un caso per ogni `reasons_if_fail` bloccante
4. **Boundary Cases** - Valori min/max per ogni `number` step

**Esempio**: DSL con 15 boolean steps
- Casi totali possibili: 2^15 = 32,768
- Smart sample: ~20-30 casi strategici

### 3. Esecuzione Test

Per ogni caso test:

```javascript
executeDSL(dsl, ['sì', 'no', 'sì', ...])
  ↓
1. Crea CTX (simula workflow n8n)
  ↓
2. Loop collecting:
   - Trova next step (gestisce skip_if)
   - Applica input
   - Converte tipo (boolean/number/string)
   - Salva in CTX.variables
  ↓
3. Valutazione incrementale:
   - Evalua reasons_if_fail
   - Se blocking: stop immediato
  ↓
4. Risultato:
   - ammissibile / non_ammissibile
   - Motivo, domande poste, CTX finale
```

### 4. Report

Genera:
- **Markdown** human-readable con statistiche
- **JSON** strutturato per CI/CD e analisi

## 📋 Codice CTX (da workflow n8n)

Lo script usa **esattamente** il codice del workflow n8n:

### createCTX()

```javascript
function createCTX(practice, sessionId, userId) {
  const practiceCode = practice.title || "pratica_senza_titolo";
  const steps = Array.isArray(practice.steps) ? practice.steps : [];
  const varNames = steps.map(s => s?.var).filter(Boolean);

  const variables = {};
  const checklist = {};
  for (const v of varNames) {
    variables[v] = null;
    checklist[v] = false;
  }

  return {
    session_id: sessionId,
    user_id: userId,
    practice_code: practiceCode,
    step_index: 0,
    variables,
    checklist,
    history: [{ role: 'system', msg: 'sessione creata' }],
    status: 'collecting',
    last_prompt: null,
    last_user: null,
    last_result: null,
  };
}
```

### executeDSL()

Implementa la logica completa:
- `findNextStep()` - Gestisce `skip_if`
- `evaluateIncrementalReasons()` - Valuta `reasons_if_fail`
- `toBool()` - Converte input boolean
- Type conversion (number, string)

## 🎓 Esempi Output

### DSL Semplice (8 boolean steps)

```
📊 Analisi DSL:
   Boolean steps: 8
   Number steps: 0
   String steps: 0
   Total steps: 8
   Casistiche stimate: ~256
✅ Generati 256 casi test

======================================================================
🧪 ESECUZIONE TEST
======================================================================
Totale casi da testare: 256

[256/256] Testing...

======================================================================
📊 RISULTATI
======================================================================
Totale test: 256
✅ Passati: 256
❌ Falliti: 0
⚠️  Errori: 0
======================================================================
```

### DSL Complessa (12 steps misti)

```
📊 Analisi DSL:
   Boolean steps: 10
   Number steps: 2
   String steps: 0
   Total steps: 12
   Casistiche stimate: ~9216

⚠️  ATTENZIONE: Casistiche > 1000, generazione limitata ai casi principali
✅ Generati 25 casi test (smart sampling)

======================================================================
📊 RISULTATI
======================================================================
Totale test: 25
✅ Passati: 25
❌ Falliti: 0
⚠️  Errori: 0
======================================================================
```

## 🔍 Dettagli Test nel Report

Ogni test nel report include:

```json
{
  "testNumber": 48,
  "testName": "Test 48: residente_in_italia=sì | ...",
  "inputs": ["sì", "sì", "sì", "sì", "sì", "no", "sì", "sì"],
  "result": "ammissibile",
  "reason": null,
  "questionsAsked": 7,
  "questionsTrace": [
    {
      "var": "residente_in_italia",
      "ask": "Il genitore richiedente è residente in Italia? (sì/no)",
      "type": "boolean"
    }
  ],
  "stoppedAt": null,
  "ctx": {
    "practice_code": "Domanda Bonus Asilo Nido INPS",
    "step_index": 8,
    "status": "complete",
    "variables": {
      "residente_in_italia": true,
      "cittadino_italiano_ue": true,
      ...
    },
    "checklist": { ... },
    "last_result": "ammissibile"
  },
  "status": "PASS"
}
```

## 🆚 vs Test Runner Manuale

| Feature | Test Runner Manuale | Automated Generator |
|---------|---------------------|---------------------|
| **Casi test** | Scritti a mano | ✅ Generati automaticamente |
| **Copertura** | Dipende dall'autore | ✅ 100% combinazioni |
| **Manutenzione** | Alta (aggiorna per ogni DSL) | ✅ Zero (automatico) |
| **Tempo setup** | ~30 min per DSL | ✅ Immediato |
| **Uso** | `runTest(dsl, ['sì', 'no'], 'Test 1')` | ✅ `node script.js dsl.json` |

## 🛠️ Personalizzazione

### Aggiungere Valori Number Custom

Nel file `dsl-automated-test-generator.js`, modifica `getNumberValue()`:

```javascript
function getNumberValue(step, idx) {
  const varLower = step.var.toLowerCase();

  if (varLower.includes('isee')) {
    return ['5000', '15000', '40000'][idx % 3];  // Valori ISEE
  } else if (varLower.includes('giorni')) {
    return ['10', '60', '120'][idx % 3];  // Valori giorni
  } else {
    return ['100', '500', '1000'][idx % 3];  // Default
  }
}
```

### Aggiungere Valori String Custom

Modifica `getStringValue()`:

```javascript
function getStringValue(step, idx) {
  const varLower = step.var.toLowerCase();

  if (varLower.includes('evento')) {
    return ['nascita', 'adozione', 'affido'][idx % 3];
  } else {
    return ['test', 'example', 'sample'][idx % 3];
  }
}
```

## 🐛 Troubleshooting

### Errore: Not enough inputs

```json
{
  "error": "NOT_ENOUGH_INPUTS",
  "questionsAsked": 5,
  "expectedInputs": 5,
  "providedInputs": 3
}
```

**Causa**: Il generatore non ha considerato tutti gli step (skip_if non valutato correttamente)

**Fix**: Verifica la logica `skip_if` nella DSL

### Errore: Invalid number

```json
{
  "error": "INVALID_NUMBER",
  "invalidValue": "abc"
}
```

**Causa**: Valore number generato non è numerico

**Fix**: Verifica `getNumberValue()` e assicurati che ritorni stringhe numeriche

## 📦 Integrazione CI/CD

### GitHub Actions

```yaml
name: DSL Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Test DSL
        run: |
          cd "DSL CTX/dsl-execution-test"
          node dsl-automated-test-generator.js ../DSL\ definitive/dsl-assegno-unico.json
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: DSL CTX/dsl-execution-test/automated-tests/*/automated-test-results.json
```

## 📚 Vedi Anche

- `dsl-test-runner.js` - Library base per eseguire singoli test
- `TEST-RUNNER-README.md` - Documentazione test runner manuale
- `../test/dsl-assegno-unico-test-runner.js` - Esempio test runner specifico

## 📝 Note

- Lo script è **stateless**: ogni test parte da CTX pulita
- **Non modifica** la DSL originale
- **Non fa chiamate API** esterne
- **Tempo esecuzione**: ~1-2 secondi per 256 casi

## 🤝 Contributi

Per migliorare il generatore:
1. Aggiungere logiche `smart sampling` più sofisticate
2. Supportare DSL con `evaluation_mode: "batch"`
3. Aggiungere analisi coverage reasons_if_fail
4. Generare graph albero decisionale

## 📄 Licenza

MIT - Parte del progetto "Mamma che info"
