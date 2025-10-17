# Architettura Workflow n8n: DSL Chat Agent

## 1. Overview

### Scopo
Workflow conversazionale che:
1. Raccoglie requisiti per pratiche burocratiche dall'utente via chat
2. Genera automaticamente una DSL JSON strutturata
3. Valida la DSL con test automatici
4. Salva la DSL validata su Notion

### Architettura
**Workflow unico** con AI Agent che orchestra 3 tool nativi n8n.

```
┌─────────────────┐
│  Chat Trigger   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│   AI Agent      │◄─────┤ Window Memory    │
│ (Conversational)│      └──────────────────┘
└────────┬────────┘
         │                ┌──────────────────┐
         ├───────────────►│ OpenAI Model     │
         │                │ (gpt-4o)         │
         │                └──────────────────┘
         │
         │  Tool Connections (ai_tool):
         │
         ├───────────────►┌──────────────────┐
         │                │ Tool: OpenAI     │
         │                │ (generate_dsl)   │
         │                └──────────────────┘
         │
         ├───────────────►┌──────────────────┐
         │                │ Tool: Code       │
         │                │ (validate_dsl)   │
         │                └──────────────────┘
         │
         └───────────────►┌──────────────────┐
                          │ Tool: Notion     │
                          │ (save_to_notion) │
                          └──────────────────┘
```

---

## 2. Configurazione Nodi

### Nodo 1: Chat Trigger
**Tipo:** `@n8n/n8n-nodes-langchain.chatTrigger`
**Versione:** 1.1

**Parametri:**
```json
{
  "options": {},
  "webhookId": "dsl-chat-agent"
}
```

**Position:** [820, 240]

---

### Nodo 2: Window Buffer Memory
**Tipo:** `@n8n/n8n-nodes-langchain.memoryBufferWindow`
**Versione:** 1.2

**Parametri:**
```json
{
  "sessionIdType": "customKey",
  "sessionKey": "={{ $json.sessionId }}",
  "contextWindowLength": 10
}
```

**Position:** [820, 420]

**Note:** Mantiene gli ultimi 10 messaggi per contesto conversazionale.

---

### Nodo 3: OpenAI Chat Model (Principale)
**Tipo:** `@n8n/n8n-nodes-langchain.lmChatOpenAi`
**Versione:** 1

**Parametri:**
```json
{
  "model": "gpt-4o",
  "options": {
    "temperature": 0.3,
    "maxTokens": 4000
  }
}
```

**Credentials:** OpenAI API (già configurate)

**Position:** [1020, 420]

**Note:** Questo è il modello principale dell'AI Agent, non il tool.

---

### Nodo 4: AI Agent - Conversational
**Tipo:** `@n8n/n8n-nodes-langchain.agent`
**Versione:** 1.7

**Parametri:**
```json
{
  "agent": "conversationalAgent",
  "promptType": "define",
  "text": "=<VEDI SEZIONE 3>",
  "options": {
    "systemMessage": "Sei un assistente esperto in pratiche burocratiche italiane e nella creazione di DSL strutturate."
  }
}
```

**Position:** [1220, 240]

**Connessioni IN:**
- `main[0]` ← Chat Trigger
- `ai_memory[0]` ← Window Buffer Memory
- `ai_languageModel[0]` ← OpenAI Chat Model
- `ai_tool[0]` ← Tool: OpenAI (generate_dsl)
- `ai_tool[1]` ← Tool: Code (validate_dsl)
- `ai_tool[2]` ← Tool: Notion (save_to_notion)

---

### Nodo 5: Tool - OpenAI (Generate DSL)
**Tipo:** `@n8n/n8n-nodes-langchain.lmChatOpenAi`
**Versione:** 1

**Configurazione come Tool:**
- Nella configurazione del nodo, abilitare "Use as Tool"
- Nome tool: `generate_dsl`
- Description: `Genera una DSL JSON da requisiti testuali per una pratica burocratica italiana. Input: testo requisiti in linguaggio naturale. Output: DSL JSON completa e strutturata secondo le specifiche.`

**Parametri:**
```json
{
  "model": "gpt-4o",
  "options": {
    "temperature": 0.1,
    "maxTokens": 3000,
    "responseFormat": "json_object"
  }
}
```

**System Message:**
```
Sei un esperto nella conversione di requisiti burocratici italiani in una DSL (Domain-Specific Language) strutturata.

Il tuo compito è generare un JSON valido che modelli una pratica burocratica secondo questo schema:

**Struttura DSL:**
{
  "title": "Nome della pratica",
  "evaluation_mode": "incremental",
  "steps": [ ... ],
  "reasons_if_fail": [ ... ],
  "next_actions_if_ok": [ ... ]
}

**Regole per gli steps:**
- Ogni step raccoglie UNA informazione
- Usa type: "boolean" per sì/no, type: "string" per scelte multiple, type: "number" per valori numerici
- Aggiungi skip_if quando uno step dipende da condizioni precedenti
- Per cittadinanza extracomunitaria, crea sempre due step separati: uno per italiani/UE, uno per extracomunitari
- Le domande devono essere chiare e complete, includendo tutte le opzioni quando rilevante

**Regole per reasons_if_fail:**
- Ogni reason verifica UN requisito
- when contiene la condizione JavaScript che determina il fallimento
- check_after_vars deve contenere TUTTE le variabili usate nel when
- blocking: true sempre
- Per requisiti "almeno uno di questi", usa condizioni AND (es: var1 === false && var2 === false)
- La reason deve spiegare chiaramente perché il requisito non è soddisfatto e cosa manca

**Regole per next_actions_if_ok:**
- Inizia sempre con "Prenota appuntamento con CAF o Patronato di zona"
- Elenca documenti necessari (identità, tessera sanitaria, ecc.)
- Specifica documenti per casi particolari con prefissi come "Se cittadino extracomunitario:", "Se hai figli disabili:", ecc.

**Esempio di mappatura:**
Input: "ISEE: presenza di una DSU valida con ISEE minorenni ≤ 40.000"
Output:
{
  "var": "dsu_valida",
  "ask": "Hai una DSU (Dichiarazione Sostitutiva Unica) valida con indicatore ISEE minorenni in corso di validità? (sì/no)",
  "type": "boolean"
},
{
  "var": "isee_minorenni",
  "ask": "Qual è il valore ISEE minorenni in euro?",
  "type": "number"
}

E nella sezione reasons_if_fail:
{
  "when": "dsu_valida === false",
  "reason": "Requisito ISEE: è necessaria una DSU valida con indicatore ISEE minorenni in corso di validità.",
  "check_after_vars": ["dsu_valida"],
  "blocking": true
},
{
  "when": "isee_minorenni > 40000",
  "reason": "Requisito ISEE: il valore dell'indicatore ISEE minorenni deve essere entro 40.000 euro.",
  "check_after_vars": ["isee_minorenni"],
  "blocking": true
}

Genera SOLO il JSON valido, senza commenti o spiegazioni.
```

**Credentials:** OpenAI API (già configurate)

**Position:** [1220, 420]

---

### Nodo 6: Tool - Code (Validate DSL)
**Tipo:** `@n8n/n8n-nodes-langchain.toolCode`
**Versione:** 1.1

**Parametri:**
```json
{
  "name": "validate_dsl",
  "description": "Valida una DSL JSON eseguendo test automatici. Input: DSL JSON object. Output: {valid: boolean, diagnostics: {...}, testResults: [...], summary: {totalTests, passed, failed}}",
  "workflowCode": "=<VEDI SEZIONE 4>"
}
```

**Position:** [1420, 420]

---

### Nodo 7: Tool - Notion (Save to Notion)
**Tipo:** `@n8n/n8n-nodes-langchain.toolNotion`
**Versione:** (verifica versione corrente)

**Configurazione come Tool:**
- Abilitare "Use as Tool"
- Nome tool: `save_to_notion`
- Description: `Salva una DSL validata su database Notion. Input: {dsl: DSL object, sessionId: string}. Output: {saved: boolean, notionUrl: string, pageId: string}`

**Parametri:**
```json
{
  "resource": "page",
  "operation": "create",
  "databaseId": "={{ $env.NOTION_DATABASE_ID }}",
  "properties": {
    "title": {
      "type": "title",
      "title": [
        {
          "text": {
            "content": "={{ $json.dsl.title }}"
          }
        }
      ]
    },
    "evaluation_mode": {
      "type": "select",
      "select": {
        "name": "={{ $json.dsl.evaluation_mode }}"
      }
    },
    "steps_count": {
      "type": "number",
      "number": "={{ $json.dsl.steps.length }}"
    },
    "rules_count": {
      "type": "number",
      "number": "={{ $json.dsl.reasons_if_fail.length }}"
    },
    "status": {
      "type": "select",
      "select": {
        "name": "Validated"
      }
    },
    "session_id": {
      "type": "rich_text",
      "rich_text": [
        {
          "text": {
            "content": "={{ $json.sessionId || 'unknown' }}"
          }
        }
      ]
    }
  },
  "blockUi": [
    {
      "object": "block",
      "type": "heading_2",
      "heading_2": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "DSL JSON"
            }
          }
        ]
      }
    },
    {
      "object": "block",
      "type": "code",
      "code": {
        "language": "json",
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "={{ JSON.stringify($json.dsl, null, 2) }}"
            }
          }
        ]
      }
    }
  ]
}
```

**Credentials:** Notion Integration (da configurare)

**Position:** [1620, 420]

---

## 3. System Prompt AI Agent

```markdown
Sei un esperto nella generazione e validazione di DSL (Domain Specific Language) per pratiche burocratiche italiane.

## Il tuo compito

1. **Raccogliere i requisiti** per una pratica burocratica dall'utente
2. **Generare una DSL JSON** strutturata usando il tool "generate_dsl"
3. **Validare la DSL** generata usando il tool "validate_dsl"
4. **Gestire gli errori** analizzando i diagnostics
5. **Salvare su Notion** quando la DSL è validata con successo

## Formato DSL richiesto

```json
{
  "title": "Nome pratica",
  "evaluation_mode": "incremental",
  "steps": [
    {
      "var": "nome_variabile",
      "ask": "Domanda per l'utente",
      "type": "boolean|string|number",
      "skip_if": "condizione opzionale"
    }
  ],
  "reasons_if_fail": [
    {
      "when": "condizione JavaScript",
      "reason": "Spiegazione chiara",
      "check_after_vars": ["var1", "var2"],
      "blocking": true
    }
  ],
  "next_actions_if_ok": ["Azione 1", "Azione 2"]
}
```

## Regole importanti

- Ogni step raccoglie UNA sola informazione
- Usa type: boolean per sì/no, string per scelte multiple, number per valori numerici
- Per cittadinanza extracomunitaria, crea sempre due step separati
- Ogni reason deve verificare UN solo requisito
- check_after_vars deve contenere TUTTE le variabili usate in "when"
- La condition "when" deve restituire true quando il requisito FALLISCE
- Per requisiti "almeno uno di", usa AND: var1 === false && var2 === false

## Procedura operativa

### Fase 1: Raccolta Requisiti
Chiedi all'utente di descrivere i requisiti della pratica. Informazioni necessarie:
- **Cittadinanza**: italiana, UE, extracomunitaria?
- **ISEE**: è richiesto? Quale soglia?
- **Residenza**: dove deve essere residente il richiedente/beneficiario?
- **Tempistiche**: ci sono scadenze (es. giorni dal parto, anno corrente)?
- **Documenti**: quali documenti sono necessari?
- **Condizioni speciali**: figli disabili, tipo di evento (nascita/adozione/affidamento), etc.

### Fase 2: Generazione DSL
Quando hai abbastanza informazioni:
1. Chiama `generate_dsl` con i requisiti raccolti
2. Se il tool restituisce errore di parsing JSON, riprova fino a 2 volte
3. Se fallisce 3 volte, chiedi all'utente se vuole semplificare i requisiti

### Fase 3: Validazione
Con la DSL generata:
1. Chiama `validate_dsl` passando l'oggetto DSL
2. Analizza il campo `diagnostics.type`:

**Se diagnostics.type === "syntax":**
- La DSL ha errori di schema
- Richiama `generate_dsl` includendo nel prompt gli errori specifici da `diagnostics.details`
- Massimo 3 tentativi totali

**Se diagnostics.type === "interpretation":**
- La DSL è sintatticamente corretta ma logicamente sbagliata
- Poni all'utente le domande in `diagnostics.questionsForUser`
- Con le risposte, rigenera la DSL

**Se diagnostics.type === "logic":**
- Alcuni test falliscono ma potrebbe essere comportamento atteso
- Mostra all'utente i test falliti
- Chiedi se è corretto o va modificata la DSL
- Se va modificata, raccogli le correzioni e rigenera

**Se diagnostics.type === "ok":**
- Tutti i test passano!
- Procedi alla Fase 4

### Fase 4: Salvataggio
1. Chiama `save_to_notion` passando:
   - `dsl`: l'oggetto DSL validato
   - `sessionId`: l'ID della sessione corrente (se disponibile)
2. Conferma all'utente con il link Notion restituito
3. Mostra un riepilogo: titolo pratica, numero step, numero regole

## Gestione errori

- **Massimo 3 tentativi** per generare una DSL corretta
- **Sempre porre domande specifiche** quando i requisiti sono ambigui
- **Non inventare requisiti**: se qualcosa non è chiaro, chiedi
- **Se impossibile generare DSL corretta** dopo 3 tentativi:
  - Spiega il problema all'utente
  - Suggerisci di semplificare i requisiti o chiarire le contraddizioni

## Tono conversazionale

- Sii chiaro e professionale
- Usa elenchi puntati per chiarezza
- Conferma sempre i requisiti raccolti prima di generare
- Celebra quando la DSL è validata con successo!

## Esempio di conversazione

**Utente:** "Voglio creare la DSL per il Bonus Nido"

**Tu:**
"Perfetto! Per creare la DSL del Bonus Nido ho bisogno di raccogliere i requisiti. Puoi dirmi:

1. Requisiti di cittadinanza?
2. C'è un requisito ISEE? Se sì, quale soglia?
3. Requisiti di residenza?
4. Ci sono tempistiche specifiche?
5. Quali documenti servono?"

[Utente risponde...]

**Tu:**
"Grazie! Ricapitolando i requisiti:
- Cittadinanza: italiana o UE
- ISEE: DSU valida con ISEE minorenni ≤ 40.000€
- Residenza: ...
[...]

Confermi che sia tutto corretto?"

[Utente conferma...]

**Tu:** "Perfetto, genero la DSL..."
[Chiama generate_dsl]
[Chiama validate_dsl]
"✅ DSL validata con successo! Ho eseguito 15 test automatici e sono tutti passati."
[Chiama save_to_notion]
"✅ DSL salvata su Notion: [link]

Riepilogo:
- Pratica: Bonus Nido
- Steps: 8
- Regole: 5"
```

---

## 4. Codice Tool "validate_dsl"

**File:** Tutto il contenuto di `dsl-validator-service.js` inline

```javascript
const dsl = $input.first().json.dsl;

// ============================================================================
// CORE DSL LOGIC
// ============================================================================

function toBool(s) {
    if (typeof s === 'boolean') return s;
    const t = String(s).toLowerCase().trim();
    return ['si', 'sì', 'yes', 'y', 'true', '1'].includes(t);
}

function evaluateIncrementalReasons(practice, vars, justCollectedVar) {
    const reasons = Array.isArray(practice.reasons_if_fail) ? practice.reasons_if_fail : [];

    for (const r of reasons) {
        const checkAfterVars = Array.isArray(r.check_after_vars) ? r.check_after_vars : [];

        if (checkAfterVars.includes(justCollectedVar)) {
            const allVarsAvailable = checkAfterVars.every(v => vars[v] !== null && vars[v] !== undefined);

            if (allVarsAvailable && r.when) {
                try {
                    const fn = Function(...Object.keys(vars), `return (${r.when});`);
                    const failed = !!fn(...Object.values(vars));

                    if (failed && r.blocking) {
                        return {
                            failed: true,
                            reason: String(r.reason || 'Requisito non soddisfatto.')
                        };
                    }
                } catch (e) {
                    return {
                        failed: true,
                        reason: `Errore valutazione: ${e.message}`
                    };
                }
            }
        }
    }

    return { failed: false };
}

function findNextStep(steps, currentIndex, vars) {
    for (let i = currentIndex; i < steps.length; i++) {
        const step = steps[i];

        if (step.skip_if) {
            try {
                const fn = Function(...Object.keys(vars), `return (${step.skip_if});`);
                const shouldSkip = !!fn(...Object.values(vars));

                if (shouldSkip) {
                    continue;
                }
            } catch (e) {
                console.error('Error evaluating skip_if:', e);
            }
        }

        return { index: i, step };
    }

    return null;
}

function createCTX(practice) {
    const practiceCode = practice.title || "pratica_senza_titolo";
    const steps = Array.isArray(practice.steps) ? practice.steps : [];
    const varNames = steps.map(s => s?.var).filter(Boolean);

    const variables = {};
    const checklist = {};
    for (const v of varNames) {
        variables[v] = null;
        checklist[v] = false;
    }

    const sessionId = String(Date.now());
    const userId = "test_user";

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

function runTest(dsl, inputs, testName) {
    const ctx = createCTX(dsl);
    const steps = dsl.steps || [];
    const evaluationMode = dsl.evaluation_mode || 'batch';

    let questionsAsked = 0;
    let inputIndex = 0;

    while (ctx.status === 'collecting') {
        const nextStepResult = findNextStep(steps, ctx.step_index, ctx.variables);

        if (!nextStepResult) {
            ctx.status = 'checking';
            break;
        }

        const step = nextStepResult.step;
        questionsAsked++;

        if (inputIndex >= inputs.length) {
            return {
                status: 'ERROR',
                result: null,
                reason: 'Not enough inputs',
                questionsAsked,
                variables: ctx.variables
            };
        }

        let msg = inputs[inputIndex++];
        let val = msg;

        if (step.type === 'number') {
            val = parseFloat(String(msg).replace(',', '.'));
            if (Number.isNaN(val)) {
                return {
                    status: 'ERROR',
                    result: null,
                    reason: `Invalid number: ${msg}`,
                    questionsAsked,
                    variables: ctx.variables
                };
            }
        }

        if (step.type === 'boolean') {
            val = toBool(msg);
        }

        ctx.variables[step.var] = val;
        ctx.checklist[step.var] = true;
        ctx.step_index = nextStepResult.index + 1;

        if (evaluationMode === 'incremental') {
            const evalResult = evaluateIncrementalReasons(dsl, ctx.variables, step.var);

            if (evalResult.failed) {
                ctx.last_result = 'non_ammissibile';
                ctx.status = 'complete';

                return {
                    status: 'PASS',
                    result: 'non_ammissibile',
                    reason: evalResult.reason,
                    questionsAsked,
                    variables: ctx.variables
                };
            }
        }
    }

    if (ctx.status === 'checking' || ctx.status === 'collecting') {
        let result = 'ammissibile';
        const failedReasons = [];

        if (evaluationMode !== 'incremental') {
            const reasons = Array.isArray(dsl.reasons_if_fail) ? dsl.reasons_if_fail : [];

            for (const r of reasons) {
                try {
                    const fn = Function(...Object.keys(ctx.variables), `return (${r.when});`);
                    const failed = !!fn(...Object.values(ctx.variables));
                    if (failed && r.reason) {
                        failedReasons.push(String(r.reason));
                    }
                } catch (e) {
                    console.error('Batch evaluation error:', e);
                }
            }

            if (failedReasons.length > 0) {
                result = 'non_ammissibile';
            }
        }

        ctx.last_result = result;
        ctx.status = 'complete';

        const reasonText = failedReasons.length > 0 ? failedReasons.join('; ') : 'N/A';

        return {
            status: 'PASS',
            result,
            reason: reasonText,
            questionsAsked,
            variables: ctx.variables
        };
    }

    return {
        status: 'ERROR',
        result: null,
        reason: 'Unknown error',
        questionsAsked,
        variables: ctx.variables
    };
}

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

function validateDSLSchema(dsl) {
    const errors = [];

    if (!dsl.title) errors.push('Missing: title');
    if (!dsl.evaluation_mode) errors.push('Missing: evaluation_mode');
    if (!Array.isArray(dsl.steps)) errors.push('Missing or invalid: steps (must be array)');
    if (!Array.isArray(dsl.reasons_if_fail)) errors.push('Missing or invalid: reasons_if_fail (must be array)');
    if (!Array.isArray(dsl.next_actions_if_ok)) errors.push('Missing or invalid: next_actions_if_ok (must be array)');

    if (dsl.evaluation_mode && !['incremental', 'batch'].includes(dsl.evaluation_mode)) {
        errors.push(`Invalid evaluation_mode: "${dsl.evaluation_mode}" (must be "incremental" or "batch")`);
    }

    const declaredVars = new Set();
    dsl.steps?.forEach((step, idx) => {
        if (!step.var) errors.push(`Step ${idx}: missing var`);
        if (!step.ask) errors.push(`Step ${idx}: missing ask`);
        if (!step.type) errors.push(`Step ${idx}: missing type`);
        if (step.type && !['string', 'number', 'boolean'].includes(step.type)) {
            errors.push(`Step ${idx}: invalid type "${step.type}"`);
        }
        if (step.var) declaredVars.add(step.var);
    });

    dsl.reasons_if_fail?.forEach((reason, idx) => {
        if (!reason.when) errors.push(`Reason ${idx}: missing when`);
        if (!reason.reason) errors.push(`Reason ${idx}: missing reason text`);
        if (!Array.isArray(reason.check_after_vars)) {
            errors.push(`Reason ${idx}: missing or invalid check_after_vars (must be array)`);
        }
        if (typeof reason.blocking !== 'boolean') {
            errors.push(`Reason ${idx}: missing or invalid blocking (must be boolean)`);
        }

        reason.check_after_vars?.forEach(varName => {
            if (!declaredVars.has(varName)) {
                errors.push(`Reason ${idx}: variable "${varName}" in check_after_vars not declared in steps`);
            }
        });
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

// ============================================================================
// AUTO TEST CASE GENERATION
// ============================================================================

function generateHappyPathInputs(dsl) {
    const inputs = [];
    const steps = dsl.steps || [];

    for (const step of steps) {
        if (step.type === 'boolean') {
            inputs.push('sì');
        } else if (step.type === 'number') {
            inputs.push('10000');
        } else if (step.type === 'string') {
            if (step.ask.includes('nascita')) {
                inputs.push('nascita');
            } else if (step.ask.includes('dipendente')) {
                inputs.push('dipendente_privato');
            } else {
                inputs.push('valido');
            }
        }
    }

    return inputs;
}

function generateTestCaseForReason(reason, dsl, reasonIndex) {
    const inputs = generateHappyPathInputs(dsl);

    const checkVars = reason.check_after_vars || [];

    checkVars.forEach(varName => {
        const stepIdx = dsl.steps.findIndex(s => s.var === varName);
        if (stepIdx >= 0) {
            const step = dsl.steps[stepIdx];

            if (reason.when.includes('=== false') && step.type === 'boolean') {
                inputs[stepIdx] = 'no';
            } else if (reason.when.includes('> ') && step.type === 'number') {
                const match = reason.when.match(/>\s*(\d+)/);
                if (match) {
                    const threshold = parseInt(match[1]);
                    inputs[stepIdx] = String(threshold + 1000);
                }
            }
        }
    });

    return {
        name: `Test Reason ${reasonIndex + 1}: ${reason.reason.substring(0, 50)}...`,
        inputs,
        expectedResult: 'non_ammissibile',
        expectedQuestions: calculateExpectedQuestions(reason, dsl)
    };
}

function calculateExpectedQuestions(reason, dsl) {
    if (dsl.evaluation_mode === 'incremental') {
        const checkVars = reason.check_after_vars || [];
        let maxStepIndex = 0;

        checkVars.forEach(varName => {
            const stepIdx = dsl.steps.findIndex(s => s.var === varName);
            if (stepIdx > maxStepIndex) maxStepIndex = stepIdx;
        });

        return maxStepIndex + 1;
    }

    return dsl.steps.length;
}

function autoGenerateTestCases(dsl) {
    const testCases = [];

    testCases.push({
        name: 'Happy Path - All requirements met',
        inputs: generateHappyPathInputs(dsl),
        expectedResult: 'ammissibile',
        expectedQuestions: dsl.steps.length
    });

    dsl.reasons_if_fail?.forEach((reason, idx) => {
        testCases.push(generateTestCaseForReason(reason, dsl, idx));
    });

    return testCases;
}

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

function classifyErrors(dsl, testResults, schemaValidation) {
    const diagnostics = {
        type: null,
        confidence: 0,
        details: [],
        suggestedAction: null,
        questionsForUser: []
    };

    if (!schemaValidation.valid) {
        return {
            type: 'syntax',
            confidence: 1.0,
            details: schemaValidation.errors,
            suggestedAction: 'retry_with_feedback',
            questionsForUser: []
        };
    }

    const failedTests = testResults.filter(t => t.status === 'FAIL');
    if (failedTests.length === 0) {
        return {
            type: 'ok',
            confidence: 1.0,
            details: ['All tests passed'],
            suggestedAction: 'save_to_notion',
            questionsForUser: []
        };
    }

    const happyPathTest = testResults.find(t => t.name.includes('Happy Path'));

    if (happyPathTest && happyPathTest.status === 'FAIL') {
        return {
            type: 'interpretation',
            confidence: 0.8,
            details: [`Happy path failed: ${happyPathTest.reason}`],
            suggestedAction: 'ask_clarification',
            questionsForUser: [
                `Il test "happy path" (tutti requisiti soddisfatti) è risultato inammissibile per: "${happyPathTest.reason}". Questo è corretto o c'è un errore nella DSL?`
            ]
        };
    }

    if (failedTests.length < testResults.length / 2) {
        return {
            type: 'logic',
            confidence: 0.6,
            details: failedTests.map(t => t.reason || t.name),
            suggestedAction: 'review_with_user',
            questionsForUser: failedTests.map((t, idx) =>
                `Test ${idx + 1} ha dato risultato inatteso: ${t.name}. È corretto?`
            )
        };
    }

    return {
        type: 'logic',
        confidence: 0.7,
        details: [`${failedTests.length}/${testResults.length} test falliti`],
        suggestedAction: 'review_requirements',
        questionsForUser: [
            `La maggior parte dei test fallisce (${failedTests.length}/${testResults.length}). I requisiti potrebbero contenere contraddizioni. Vuoi rivederli?`
        ]
    };
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

function validateDSL(dsl) {
    const result = {
        valid: false,
        schemaValidation: null,
        testResults: [],
        summary: {
            totalTests: 0,
            passed: 0,
            failed: 0
        },
        diagnostics: null
    };

    const schemaValidation = validateDSLSchema(dsl);
    result.schemaValidation = schemaValidation;

    if (!schemaValidation.valid) {
        result.diagnostics = classifyErrors(dsl, [], schemaValidation);
        return result;
    }

    const testCases = autoGenerateTestCases(dsl);

    const testResults = [];
    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        const testResult = runTest(dsl, testCase.inputs, testCase.name);

        const isPass = testResult.result === testCase.expectedResult;

        if (isPass) {
            passed++;
        } else {
            failed++;
        }

        testResults.push({
            testName: testCase.name,
            status: isPass ? 'PASS' : 'FAIL',
            result: testResult.result,
            expectedResult: testCase.expectedResult,
            questionsAsked: testResult.questionsAsked,
            expectedQuestions: testCase.expectedQuestions,
            reason: testResult.reason,
            variables: testResult.variables
        });
    }

    result.testResults = testResults;
    result.summary = {
        totalTests: testCases.length,
        passed,
        failed
    };
    result.valid = failed === 0;

    result.diagnostics = classifyErrors(dsl, testResults, schemaValidation);

    return result;
}

// ============================================================================
// EXECUTE
// ============================================================================

const validationResult = validateDSL(dsl);
return { json: validationResult };
```

---

## 5. Configurazione Notion Database

### Proprietà Richieste

Creare un database Notion con le seguenti proprietà:

| Nome Proprietà | Tipo | Note |
|----------------|------|------|
| **Name** | Title | Titolo della pratica (automatico) |
| **Evaluation Mode** | Select | Opzioni: "incremental", "batch" |
| **Steps Count** | Number | Numero di step nella DSL |
| **Rules Count** | Number | Numero di regole di validazione |
| **Status** | Select | Opzioni: "Validated", "Draft", "Error" |
| **Session ID** | Rich Text | ID sessione chat |

### Environment Variables

Configurare in n8n:
```bash
NOTION_DATABASE_ID=<your-database-id>
```

### Credentials

- **Notion Integration**: Creare una internal integration su Notion e condividere il database
- **OpenAI API**: Aggiungere API key OpenAI nelle credentials

---

## 6. Flow Conversazionale Esempio

### Scenario: Creazione DSL "Bonus Nido"

```
👤 UTENTE
Voglio creare la DSL per il Bonus Nido

🤖 AI AGENT
Perfetto! Per creare la DSL del Bonus Nido ho bisogno di raccogliere i requisiti.
Puoi dirmi:

1. Requisiti di cittadinanza?
2. C'è un requisito ISEE? Se sì, quale soglia?
3. Requisiti di residenza?
4. Ci sono tempistiche specifiche?
5. Quali documenti servono?

👤 UTENTE
- Cittadini italiani o UE, extracomunitari con permesso lungo soggiorno
- ISEE minorenni sotto 40.000€
- Bambino iscritto all'asilo nido
- Residenza in Italia

🤖 AI AGENT
Grazie! Ricapitolando:
- Cittadinanza: italiana, UE, o extracomunitaria con permesso lungo soggiorno
- ISEE: DSU valida con ISEE minorenni ≤ 40.000€
- Bambino iscritto all'asilo nido
- Residenza in Italia per il bambino

Confermi?

👤 UTENTE
Sì, confermo

🤖 AI AGENT
[CHIAMA generate_dsl]
Perfetto! Ho generato la DSL. Ora la valido...

[CHIAMA validate_dsl]

✅ Validazione completata!
- Test eseguiti: 6
- Test superati: 6
- Test falliti: 0

Salvo la DSL su Notion...

[CHIAMA save_to_notion]

✅ DSL salvata con successo!

📋 Riepilogo:
- Pratica: Bonus Nido
- Steps: 5
- Regole: 3
- Link Notion: https://notion.so/...

La DSL è pronta per essere utilizzata!
```

### Scenario: Errore di Interpretazione

```
🤖 AI AGENT
[CHIAMA validate_dsl]

⚠️ Ho rilevato un possibile problema nella DSL.

Il test "happy path" (caso con tutti i requisiti soddisfatti) è risultato
INAMMISSIBILE per: "Requisito cittadinanza: è necessario essere cittadino
italiano o UE"

Questo è corretto? O dovrei modificare la DSL?

👤 UTENTE
No, è sbagliato! Anche gli extracomunitari con permesso lungo soggiorno
possono richiederlo

🤖 AI AGENT
Capito! Rigenero la DSL correggendo il requisito di cittadinanza...

[CHIAMA generate_dsl con feedback]
[CHIAMA validate_dsl]

✅ Perfetto! Ora tutti i test passano. Procedo al salvataggio...
```

---

## 7. Testing & Debug

### Test Singoli Tool

#### Test Tool: generate_dsl
1. Aprire il nodo OpenAI tool in n8n
2. Usare "Execute Node" con input di test:
```json
{
  "query": "Bonus Nido: cittadini italiani o UE, ISEE minorenni sotto 40.000€"
}
```
3. Verificare output JSON valido

#### Test Tool: validate_dsl
1. Aprire il nodo Code tool
2. Usare "Execute Node" con una DSL di esempio
3. Verificare presenza di: `valid`, `diagnostics`, `testResults`

#### Test Tool: save_to_notion
1. Verificare database Notion esistente
2. Testare con DSL validata
3. Verificare creazione pagina su Notion

### Test End-to-End

#### Scenario 1: Happy Path
- Input: Requisiti chiari e completi
- Expected: DSL generata → validata → salvata
- Verificare: Link Notion restituito

#### Scenario 2: Requisiti Ambigui
- Input: "Voglio il bonus bebè"
- Expected: AI Agent chiede specifiche
- Verificare: Domande appropriate

#### Scenario 3: Errore Sintassi
- Forzare errore DSL (modificare prompt)
- Expected: Rigenerazione automatica
- Verificare: Max 3 tentativi

### Common Issues

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| "Tool not found" | Tool non connesso ad Agent | Verificare connessioni ai_tool |
| "Invalid JSON" | OpenAI genera JSON malformato | Aumentare temperature=0, usare responseFormat |
| "Notion error" | Database ID errato | Verificare NOTION_DATABASE_ID |
| "Validation sempre fallisce" | Code node non esegue correttamente | Verificare sintassi JavaScript, console.log |

---

## 8. Ottimizzazioni Future

### Possibili Miglioramenti

1. **Caching DSL**: Salvare DSL generate in memoria per evitare rigenerazioni
2. **Vector Store**: Indicizzare DSL esistenti per suggerimenti
3. **Feedback Loop**: Imparare da correzioni utente
4. **Export DSL**: Aggiungere tool per esportare DSL in vari formati
5. **Import Requisiti**: Tool per parsare documenti PDF/Word con requisiti

---

## 9. Checklist Implementazione

- [ ] Creare workflow "DSL Chat Agent" su n8n
- [ ] Aggiungere Chat Trigger
- [ ] Aggiungere Window Buffer Memory
- [ ] Aggiungere OpenAI Chat Model (principale)
- [ ] Aggiungere AI Agent node
- [ ] Configurare system prompt AI Agent (Sezione 3)
- [ ] Aggiungere Tool: OpenAI (generate_dsl)
- [ ] Configurare system message tool OpenAI (Sezione 2, Nodo 5)
- [ ] Aggiungere Tool: Code (validate_dsl)
- [ ] Copiare codice validation (Sezione 4)
- [ ] Aggiungere Tool: Notion (save_to_notion)
- [ ] Configurare proprietà Notion (Sezione 5)
- [ ] Connettere tutti i nodi
- [ ] Verificare connessioni ai_tool
- [ ] Configurare credentials OpenAI
- [ ] Configurare credentials Notion
- [ ] Configurare environment variable NOTION_DATABASE_ID
- [ ] Testare singoli tool
- [ ] Testare workflow end-to-end
- [ ] Attivare workflow

---

**Versione:** 1.0
**Data:** 2025-01-17
**Autore:** Claude Code
