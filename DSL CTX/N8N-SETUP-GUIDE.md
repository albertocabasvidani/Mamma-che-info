# Guida Setup: DSL Chat Agent in n8n

Questa guida spiega come configurare e usare il workflow n8n per generare e validare automaticamente DSL per pratiche burocratiche italiane tramite chat conversazionale.

---

## Panoramica Sistema

**Cosa fa:**
- L'utente chatta con un AI agent (GPT-4)
- Descrive i requisiti di una pratica burocratica
- L'agent genera automaticamente una DSL JSON
- Esegue test automatici di validazione
- Se i test falliscono, chiede chiarimenti all'utente
- Se i test passano, salva la DSL su Notion

**Architettura:**
```
User Chat → n8n Chat Trigger → AI Agent (GPT-4) → Tools:
                                                    ├─ Generate DSL
                                                    ├─ Validate DSL
                                                    └─ Save to Notion
```

---

## Prerequisiti

### 1. n8n Installato
- Versione: >= 1.0.0
- Self-hosted o n8n Cloud

### 2. Account OpenAI
- API Key con accesso a GPT-4
- Budget configurato (consigliato: almeno $10)

### 3. Notion Account
- Workspace Notion
- Integration creata
- Database preparato

### 4. File System Access
- Il file `dsl-validator-service.js` deve essere accessibile da n8n
- Path: `/mnt/c/claude-code/Mamma che info/DSL CTX/dsl-validator-service.js`

---

## Setup Passo per Passo

### Step 1: Configurare OpenAI in n8n

1. In n8n, vai a **Settings → Credentials**
2. Clicca **Add Credential**
3. Cerca e seleziona **OpenAI**
4. Inserisci la tua **API Key**
5. Testa la connessione
6. Salva con nome: `OpenAI Account`

### Step 2: Preparare Notion Database

1. **Crea un nuovo database in Notion:**
   - Nome: "DSL Repository"
   - Tipo: Database - Table

2. **Aggiungi le seguenti properties:**

| Property Name | Type | Description |
|---------------|------|-------------|
| **Name** | Title | Nome della pratica (auto-popolato) |
| **Evaluation Mode** | Select | Options: `incremental`, `batch` |
| **Steps Count** | Number | Numero di steps nella DSL |
| **Rules Count** | Number | Numero di reasons_if_fail |
| **Status** | Select | Options: `Validated`, `Draft`, `Archived` |
| **Session ID** | Text | ID sessione chat |
| **Created At** | Date | Data creazione (auto) |

3. **Crea Notion Integration:**
   - Vai su https://www.notion.so/my-integrations
   - Clicca **New Integration**
   - Nome: "n8n DSL Agent"
   - Associated workspace: il tuo workspace
   - Salva e copia il **Internal Integration Token**

4. **Connetti Integration al Database:**
   - Apri il database "DSL Repository"
   - Clicca **⋯** (menu) → **Add connections**
   - Seleziona "n8n DSL Agent"

5. **Ottieni Database ID:**
   - Apri il database in Notion
   - Dalla URL, copia la parte dopo l'ultimo `/` e prima del `?`
   - Esempio: `https://notion.so/workspace/abc123def456` → `abc123def456`

### Step 3: Importare Workflow in n8n

1. **Copia il contenuto del file:**
   ```bash
   cat "DSL CTX/n8n-workflow-dsl-chat.json"
   ```

2. **In n8n:**
   - Vai su **Workflows**
   - Clicca **Add Workflow** → **Import from File**
   - Incolla il JSON o carica il file
   - Clicca **Import**

3. **Il workflow si chiamerà:** "DSL Chat Agent - Generate & Validate"

### Step 4: Configurare i Nodi

#### 4.1 OpenAI Chat Model Node

1. Apri il nodo **"OpenAI Chat Model - GPT-4"**
2. In **Credentials**, seleziona `OpenAI Account`
3. Model: `gpt-4o` (o `gpt-4-turbo` se disponibile)
4. Temperature: `0.3` (per output consistente)
5. Max Tokens: `4000`
6. Salva

#### 4.2 Tool: Generate DSL Node

1. Apri il nodo **"Tool: Generate DSL"**
2. Nel campo **Code**, verifica che il prompt contenga gli esempi DSL corretti
3. Se vuoi personalizzare il prompt, modifica la variabile `systemPrompt`
4. Salva

#### 4.3 Tool: Validate DSL Node

1. Apri il nodo **"Tool: Validate DSL"**
2. Verifica il path del validator:
   ```javascript
   const validatorPath = '/mnt/c/claude-code/Mamma che info/DSL CTX/dsl-validator-service.js';
   ```
3. **IMPORTANTE:** Se il tuo path è diverso, aggiornalo qui
4. Salva

#### 4.4 Tool: Save to Notion Node

1. Apri il nodo **"Tool: Save to Notion"**
2. **Trova queste righe:**
   ```javascript
   const NOTION_DATABASE_ID = 'YOUR_NOTION_DATABASE_ID'; // TODO: Replace this
   const NOTION_TOKEN = 'YOUR_NOTION_INTEGRATION_TOKEN'; // TODO: Replace this
   ```
3. **Sostituisci con i tuoi valori:**
   ```javascript
   const NOTION_DATABASE_ID = 'abc123def456'; // Il tuo database ID
   const NOTION_TOKEN = 'secret_xxxxxxxxxxxxxxxxxxxxx'; // Il tuo integration token
   ```
4. Salva

### Step 5: Attivare il Workflow

1. Clicca **Save** in alto a destra
2. Clicca **Active** per attivare il workflow
3. Copia il **Webhook URL** dal nodo "Chat Trigger"

---

## Testing

### Test 1: Verifica Validator Service

Prima di testare il workflow completo, verifica che il validator funzioni:

```bash
cd "DSL CTX"

# Test con DSL esistente
node dsl-validator-service.js dsl-assegno-unico.json
```

**Output atteso:**
```json
{
  "valid": true,
  "schemaValidation": {
    "valid": true,
    "errors": []
  },
  "testResults": [...],
  "summary": {
    "totalTests": 3,
    "passed": 3,
    "failed": 0
  },
  "diagnostics": {
    "type": "ok",
    ...
  }
}
```

### Test 2: Chat con l'Agent

#### Opzione A: n8n Chat Widget

1. In n8n, vai al workflow attivo
2. Clicca **Chat** in alto a destra
3. Si apre una finestra di chat

#### Opzione B: Webhook Test

```bash
curl -X POST https://your-n8n.com/webhook/dsl-chat-agent \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sendMessage",
    "sessionId": "test-123",
    "message": "Voglio creare una DSL per il Bonus Bebè"
  }'
```

### Test 3: Conversazione Completa

**Esempio di conversazione:**

**User:**
> Voglio creare una DSL per Bonus Bebè

**Agent:**
> Perfetto! Posso aiutarti a creare la DSL. Descrivi i requisiti principali: cittadinanza, ISEE, età del bambino, tempistiche, ecc.

**User:**
> Requisiti: Cittadino italiano o UE. ISEE minore di 25000 euro. Bambino nato da meno di 1 anno.

**Agent:**
> [Genera DSL e la valida automaticamente]
> ✅ DSL generata e validata con successo! Tutti i test sono passati (3/3). Vuoi che la salvi su Notion?

**User:**
> Sì, salva

**Agent:**
> ✅ DSL salvata su Notion: https://notion.so/...
> La pratica "Bonus Bebè" è ora disponibile nel tuo database.

---

## Troubleshooting

### Problema: "Cannot find module 'dsl-validator-service.js'"

**Soluzione:**
1. Verifica che il file esista:
   ```bash
   ls -la "DSL CTX/dsl-validator-service.js"
   ```
2. Aggiorna il path nel nodo "Tool: Validate DSL"
3. Se usi n8n Docker, verifica che la directory sia montata:
   ```yaml
   volumes:
     - /mnt/c/claude-code:/data/custom-scripts:ro
   ```
4. Aggiorna il path a: `/data/custom-scripts/Mamma che info/DSL CTX/dsl-validator-service.js`

### Problema: "Invalid JSON generated" nel Tool Generate DSL

**Causa:** GPT-4 ha generato testo prima o dopo il JSON.

**Soluzione:**
1. Aumenta la temperature a 0.1 nel nodo OpenAI
2. Migliora il system prompt aggiungendo:
   ```
   CRITICAL: Output ONLY valid JSON. No markdown, no ```json```, no explanations.
   Start with { and end with }
   ```

### Problema: Test Validation Falliscono Sempre

**Debug:**
1. Controlla i log del validator:
   ```bash
   node dsl-validator-service.js /tmp/test-dsl.json
   ```
2. Verifica `diagnostics.questionsForUser` nell'output
3. L'agent dovrebbe fare queste domande automaticamente

### Problema: Notion API Error 400

**Cause possibili:**
1. Database ID errato → Verifica copiando dalla URL Notion
2. Integration Token scaduto → Rigenera da https://notion.so/my-integrations
3. Integration non connessa al database → Vai su database → Add connections
4. Schema database non corrisponde → Verifica property names (case-sensitive!)

### Problema: Agent Non Chiama i Tools

**Soluzione:**
1. Verifica che tutti i tools siano connessi al nodo "AI Agent"
2. Controlla i collegamenti: devono essere tipo `ai_tool`
3. Rimuovi e ricrea i collegamenti se necessario

### Problema: Memory Non Funziona (Non Ricorda Conversazioni Precedenti)

**Soluzione:**
1. Verifica che Window Buffer Memory sia connesso con tipo `ai_memory`
2. Session Key deve essere: `={{ $json.sessionId }}`
3. Context Window Length: almeno 10

---

## Personalizzazioni

### Modificare il System Prompt

**Dove:** Nodo "AI Agent - Conversational" → Parameters → Text

**Cosa puoi aggiungere:**
- Esempi di DSL specifici per il tuo dominio
- Regole aggiuntive per la generazione
- Stile di conversazione (formale/informale)

**Esempio:**
```
Sei un esperto in pratiche INPS. Quando generi DSL per bonus INPS,
ricorda sempre di includere:
- Verifica residenza in Italia
- Controllo ISEE minorenni (non ordinario)
- Tempistiche relative alla nascita/adozione
```

### Aggiungere Test Cases Custom

**Dove:** File `dsl-validator-service.js` → Funzione `autoGenerateTestCases()`

**Esempio - Aggiungere test per edge cases:**
```javascript
function autoGenerateTestCases(dsl) {
    const testCases = [];

    // Test esistenti...
    testCases.push({
        name: 'Happy Path',
        inputs: generateHappyPathInputs(dsl),
        expectedResult: 'ammissibile',
        expectedQuestions: dsl.steps.length
    });

    // NUOVO: Test ISEE esattamente sulla soglia
    if (hasISEERequirement(dsl)) {
        testCases.push({
            name: 'ISEE Boundary Test',
            inputs: generateISEEBoundaryInputs(dsl),
            expectedResult: 'ammissibile',
            expectedQuestions: dsl.steps.length
        });
    }

    return testCases;
}
```

### Cambiare il Modello LLM

**GPT-4 → Claude:**
1. Aggiungi credential Anthropic in n8n
2. Sostituisci "OpenAI Chat Model" con "Anthropic Chat Model"
3. Model: `claude-3-5-sonnet-20241022`
4. Ricollega al nodo AI Agent

**GPT-4 → Llama/Local:**
1. Configura Ollama su server locale
2. Usa "Ollama Chat Model" node
3. Model: `llama3` o altro
4. Base URL: `http://localhost:11434`

---

## Monitoring & Logging

### Visualizzare Execution History

1. In n8n → Workflows → [Tuo workflow]
2. Tab **Executions**
3. Clicca su un'execution per vedere:
   - Input/output di ogni nodo
   - Errori
   - Tempo di esecuzione

### Salvare Logs Dettagliati

Aggiungi un nodo **HTTP Request** dopo "Tool: Validate DSL":

```javascript
// Node: Log to External Service
{
  method: 'POST',
  url: 'https://your-logging-service.com/log',
  body: {
    workflow: 'DSL Chat Agent',
    timestamp: new Date().toISOString(),
    sessionId: $json.sessionId,
    validationResult: $json.validation,
    dsl: $json.dsl
  }
}
```

### Alert su Validation Failures

Aggiungi un nodo **IF** dopo validate:

```
IF validation.valid === false
  → Send Email/Slack
  → "DSL validation failed for session {{$json.sessionId}}"
```

---

## Best Practices

### 1. Gestione Sessioni
- Usa `sessionId` univoco per ogni utente
- Formato consigliato: `user-{userId}-{timestamp}`
- Esempio: `user-mario.rossi-1705449600000`

### 2. Rate Limiting
- GPT-4 ha limiti di rate (es. 10000 TPM)
- Per produzione, aggiungi retry logic:
  ```javascript
  const response = await $http.request({
    url: '...',
    retry: {
      maxAttempts: 3,
      delay: 1000
    }
  });
  ```

### 3. Costi OpenAI
- GPT-4: ~$0.03 per conversazione completa (10 messaggi)
- GPT-4-turbo: ~$0.01 per conversazione
- Monitora usage: https://platform.openai.com/usage

### 4. Backup DSL
- Esporta regolarmente il database Notion
- Salva anche su file system:
  ```javascript
  fs.writeFileSync(
    `/backup/dsl-${Date.now()}.json`,
    JSON.stringify(dsl, null, 2)
  );
  ```

### 5. Testing Automatico
- Crea webhook separato per testing
- Script di test automatici:
  ```bash
  ./test-workflow.sh --session test-1 --scenario happy-path
  ```

---

## Estensioni Possibili

### 1. Integrazione con Sistema Esistente
- Webhook trigger quando nuovo caso richiede DSL
- Auto-generazione da template predefiniti
- Integrazione con CRM

### 2. Validazione Umana
- Aggiungere step "Review" prima di save to Notion
- Notifica reviewer via email/Slack
- Workflow approval con pulsanti

### 3. Versionamento DSL
- Salvare ogni versione generata
- Comparison tool tra versioni
- Rollback a versione precedente

### 4. Multi-lingua
- Supporto requisiti in inglese
- Traduzione automatica domande
- DSL internazionali

---

## Supporto

**Problemi tecnici:**
- Check n8n community: https://community.n8n.io
- Logs: n8n console e browser dev tools

**Miglioramenti al validator:**
- Modifica `dsl-validator-service.js`
- Test con: `node dsl-validator-service.js <file>`

**Bug o feature requests:**
- Crea issue nel repository del progetto

---

## Appendice: Struttura File

```
DSL CTX/
├── dsl-validator-service.js          # Servizio validazione (da configurare in n8n)
├── n8n-workflow-dsl-chat.json        # Workflow da importare
├── N8N-SETUP-GUIDE.md                # Questa guida
├── linee-guida-compilazione-requisiti.md  # Prompt LLM (usato da Generate DSL tool)
├── dsl-test-runner.js                # Test runner standalone (opzionale)
├── TEST-RUNNER-README.md             # Documentazione test runner
└── [DSL examples]
    ├── dsl-assegno-unico.json
    ├── dsl-congedo-maternita.json
    └── bonus-nuovi-nati-completo.json
```

---

## Changelog

### v1.0.0 (2025-01-17)
- Initial release
- Single workflow architecture
- GPT-4 integration
- Simple memory (Window Buffer)
- Auto-validation with test generation
- Notion integration

---

**Setup completato! Ora puoi iniziare a chattare con l'agent per generare DSL.**
