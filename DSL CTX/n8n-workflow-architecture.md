# Architettura Workflow n8n: DSL Chat Agent

## 1. Overview

### Scopo
Workflow conversazionale che:
1. Raccoglie requisiti per pratiche burocratiche dall'utente via chat
2. Genera automaticamente una DSL JSON strutturata
3. Valida la DSL con test automatici
4. Salva la DSL validata su Notion

### Architettura
**Workflow con AI Agent + Feedback Loop** per generazione e validazione iterativa DSL.

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
         ├───────────────►┌──────────────────────────────┐
         │                │ Tool: "Crea DSL"             │
         │                │                              │
         │                │  ┌──────────────────┐       │
         │                │  │ Code: Prepare    │       │
         │                │  │ Prompt           │       │
         │                │  └────────┬─────────┘       │
         │                │           │                  │
         │                │           ▼                  │
         │                │  ┌──────────────────┐       │
         │                │  │ Message a Model  │       │
         │                │  │ (gpt-4o, T=0)    │       │
         │                │  └────────┬─────────┘       │
         │                │           │                  │
         │                │           ▼                  │
         │                │  ┌──────────────────┐       │
         │                │  │ Code: Validate   │◄──┐   │
         │                │  │ DSL Schema       │   │   │
         │                │  └────────┬─────────┘   │   │
         │                │           │              │   │
         │                │    errori?│              │   │
         │                │           └──────────────┘   │
         │                │        (max 3 loop)          │
         │                └──────────────────────────────┘
         │
         └───────────────►┌──────────────────┐
                          │ Tool: "Salva in  │
                          │ Notion"          │
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
- `ai_tool[0]` ← Tool: "Crea DSL"
- `ai_tool[1]` ← Tool: "Salva in Notion"

---

### Nodo 5: Tool - "Crea DSL" (Workflow Completo)
**Descrizione:** Genera e valida una DSL JSON con feedback loop automatico (max 3 tentativi)

**Input richiesti:**
```json
{
  "mode": "generazione" | "correzione",
  "requisiti_utente": "string (testo completo requisiti)",
  "dsl_da_correggere": "object (solo se mode=correzione)",
  "errori_validazione": "array (solo se mode=correzione)",
  "tentativo_numero": "number (opzionale, 1-3)"
}
```

#### Nodo 5.1: Code - "Prepare Prompt"

**Codice completo:**
```javascript
const mode = $json.mode || "generazione";

const basePrompt = `Sei un esperto nella conversione di requisiti burocratici italiani in DSL strutturata.

## SCHEMA DSL OBBLIGATORIO

\`\`\`json
{
  "title": "<string>",
  "evaluation_mode": "incremental",
  "steps": [
    {
      "var": "<string>",
      "ask": "<string>",
      "type": "<'boolean' | 'string' | 'number'>",
      "skip_if": "<string | opzionale>"
    }
  ],
  "reasons_if_fail": [
    {
      "when": "<string>",
      "reason": "<string>",
      "check_after_vars": ["<string>"],
      "blocking": true
    }
  ],
  "next_actions_if_ok": ["<string>"]
}
\`\`\`

## REGOLE CRITICHE

**Consistenza nomi variabili:**
- I nomi in check_after_vars[] DEVONO essere IDENTICI a quelli in steps[].var
- I nomi in when DEVONO essere IDENTICI a quelli in steps[].var
- I nomi in skip_if DEVONO essere IDENTICI a quelli in steps[].var
- NON abbreviare, NON parafrasare

**Tipi corretti:**
- evaluation_mode: sempre "incremental"
- type: solo "boolean", "string" o "number"
- blocking: sempre true (boolean, non stringa)

**Steps:**
- Ogni step raccoglie UNA informazione
- Per cittadinanza: due step separati (italiano/UE, poi extracomunitario)
- Domande chiare con formato risposta (es. "sì/no")

**Reasons:**
- when: condizione JavaScript del fallimento
- check_after_vars: TUTTE le variabili usate in when
- Per "almeno uno": var1 === false && var2 === false

**Next actions:**
- Prima azione: "Prenota appuntamento con CAF o Patronato di zona"
- Documenti con prefissi: "Se cittadino extracomunitario:", "Se hai figli disabili:", ecc.

## ESEMPIO COMPLETO

\`\`\`json
{
  "title": "Bonus nuovi nati",
  "evaluation_mode": "incremental",
  "steps": [
    {
      "var": "cittadino_italiano_ue",
      "ask": "Il genitore richiedente è cittadino italiano o dell'Unione Europea? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "extracom_permesso",
      "ask": "Il genitore richiedente è cittadino extracomunitario con permesso di soggiorno valido? (sì/no)",
      "type": "boolean",
      "skip_if": "cittadino_italiano_ue === true"
    },
    {
      "var": "figli_in_tutela_o_affido",
      "ask": "Hai figli in affido o sotto tutela? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "documentazione_tutela",
      "ask": "Hai la documentazione comprovante? (sì/no)",
      "type": "boolean",
      "skip_if": "figli_in_tutela_o_affido === false"
    }
  ],
  "reasons_if_fail": [
    {
      "when": "cittadino_italiano_ue === false && extracom_permesso === false",
      "reason": "Requisito cittadinanza: il genitore richiedente deve essere cittadino italiano/UE oppure extracomunitario con permesso valido.",
      "check_after_vars": ["cittadino_italiano_ue", "extracom_permesso"],
      "blocking": true
    },
    {
      "when": "figli_in_tutela_o_affido === true && documentazione_tutela === false",
      "reason": "Per figli in affido o tutela è richiesta la documentazione comprovante.",
      "check_after_vars": ["figli_in_tutela_o_affido", "documentazione_tutela"],
      "blocking": true
    }
  ],
  "next_actions_if_ok": [
    "Prenota appuntamento con CAF o Patronato di zona",
    "Prepara documento di identità valido",
    "Se extracomunitario: prepara permesso di soggiorno valido"
  ]
}
\`\`\`

Nota: "figli_in_tutela_o_affido" è identico in var, skip_if, when e check_after_vars.`;

let userMessage = '';

if (mode === "correzione") {
  userMessage = `## MODALITÀ: CORREZIONE MIRATA

REQUISITI ORIGINALI (per contesto):
${$json.requisiti_utente}

DSL DA CORREGGERE:
\`\`\`json
${JSON.stringify($json.dsl_da_correggere, null, 2)}
\`\`\`

ERRORI DI VALIDAZIONE:
${$json.errori_validazione.map((e, i) => `${i + 1}. ${e}`).join('\n')}

ISTRUZIONI:
Correggi SOLO gli errori elencati sopra.
Mantieni tutto il resto della DSL identico.
Verifica che i nomi delle variabili siano consistenti.

${$json.tentativo_numero ? `(Tentativo ${$json.tentativo_numero}/3)` : ''}

Genera SOLO il JSON valido, senza commenti o markdown code blocks.
Il JSON deve iniziare con { e terminare con }.`;
} else {
  userMessage = `## MODALITÀ: GENERAZIONE NUOVA DSL

REQUISITI DELLA PRATICA BUROCRATICA:
${$json.requisiti_utente}

ISTRUZIONI:
Genera una DSL completa che modelli questi requisiti.
Segui rigorosamente lo schema e le regole indicate sopra.

Genera SOLO il JSON valido, senza commenti o markdown code blocks.
Il JSON deve iniziare con { e terminare con }.`;
}

return {
  json: {
    systemPrompt: basePrompt,
    userMessage: userMessage
  }
};
```

#### Nodo 5.2: Message a Model (OpenAI)

**Tipo:** `@n8n/n8n-nodes-langchain.lmChatOpenAi` o nodo OpenAI standard
**Versione:** 1

**Configurazione:**
```json
{
  "model": "gpt-4o",
  "options": {
    "temperature": 0,
    "seed": 42,
    "maxTokens": 4000,
    "responseFormat": "json_object"
  }
}
```

**System Message:** `{{ $json.systemPrompt }}`
**User Message:** `{{ $json.userMessage }}`

**Note configurazione:**
- **Model:** gpt-4o (NON mini) per massima affidabilità
- **Temperature:** 0 per output deterministico
- **Seed:** 42 (o qualsiasi numero fisso) per consistenza tra chiamate
- **responseFormat:** json_object per garantire JSON valido

**Credentials:** OpenAI API (già configurate)

#### Nodo 5.3: Code - "Validate DSL Schema"

**Codice:** Vedi `dsl-schema-validator.js` nella Sezione 4

**Output:**
```json
{
  "valid": true|false,
  "errors": ["errore 1", "errore 2"],
  "message": "DSL valida" | "Trovati N errori di validazione"
}
```

**Logica Feedback Loop:**
- Se `valid === true` → ritorna DSL al chiamante
- Se `valid === false` && tentativi < 3 → torna a Nodo 5.1 con mode="correzione"
- Se `valid === false` && tentativi >= 3 → ritorna errore

---

### Nodo 6: Tool - "Salva in Notion"
**Tipo:** `@n8n/n8n-nodes-langchain.toolNotion`
**Versione:** (verifica versione corrente)

**Configurazione come Tool:**
- Abilitare "Use as Tool"
- Nome tool: "Salva in Notion"
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
# Assistente per la Creazione di DSL Burocratiche

Sei un assistente specializzato nella creazione di DSL (Domain Specific Language) per pratiche burocratiche italiane.

## Tool disponibili

- **Crea DSL**: genera una DSL JSON strutturata da requisiti in linguaggio naturale
- **Valida DSL**: valida formalmente lo schema di una DSL
- **Salva in Notion**: salva una DSL validata nel database Notion

## Il tuo compito

1. Chiedi all'utente di descrivere TUTTI i requisiti in UN'UNICA risposta
2. Quando ricevi i requisiti, chiama "Crea DSL" passando il testo completo
3. Mostra la DSL generata all'utente
4. STOP - non validare, non salvare, attendi istruzioni

## Come comportarti

**Primo messaggio:**
"Descrivi tutti i requisiti e le condizioni di ammissibilità per la pratica burocratica che vuoi gestire. Includi: chi può richiedere, requisiti economici (ISEE), requisiti di residenza, condizioni temporali, documenti necessari, e tutto ciò che è rilevante."

**Dopo la risposta dell'utente:**
- Chiama "Crea DSL" passando ESATTAMENTE il testo fornito dall'utente
- NON riformulare, NON riassumere
- Mostra la DSL generata

**Dopo aver mostrato la DSL:**
- STOP
- Attendi istruzioni dall'utente

## Cosa NON fare

- NON fare domande multiple
- NON raccogliere requisiti passo-passo
- NON chiedere conferme prima di chiamare "Crea DSL"
- NON validare automaticamente
- NON salvare automaticamente

```

---

## 4. Codice Validatore DSL Schema

**File:** `dsl-schema-validator.js`

Il codice completo per la validazione dello schema DSL si trova nel file `dsl-schema-validator.js`.

### Cosa fa il validatore

Esegue una **validazione formale dello schema** DSL, verificando:

1. **Campi obbligatori**: title, evaluation_mode, steps, reasons_if_fail, next_actions_if_ok
2. **Tipi corretti**:
   - evaluation_mode deve essere "incremental" o "batch"
   - steps deve essere un array con oggetti contenenti var, ask, type
   - type deve essere "boolean", "string" o "number"
3. **Coerenza variabili**: tutte le variabili referenziate in check_after_vars devono essere dichiarate in steps

### Output

```json
{
  "valid": true|false,
  "errors": ["errore 1", "errore 2", ...],
  "message": "DSL valida" | "Trovati N errori di validazione"
}
```

**Note:** Questo validatore NON esegue test funzionali, ma solo controlli sintattici e strutturali dello schema

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
Descrivi tutti i requisiti e le condizioni di ammissibilità per la pratica burocratica che vuoi gestire. Includi: chi può richiedere, requisiti economici (ISEE), requisiti di residenza, condizioni temporali, documenti necessari, e tutto ciò che è rilevante.

👤 UTENTE
Il Bonus Nido è per cittadini italiani, UE o extracomunitari con permesso lungo soggiorno. Serve ISEE minorenni sotto 40.000€. Il bambino deve essere iscritto all'asilo nido e residente in Italia.

🤖 AI AGENT
[CHIAMA "Crea DSL" con i requisiti]

Ecco la DSL generata:
```json
{
  "title": "Bonus Nido",
  "evaluation_mode": "incremental",
  "steps": [
    {
      "var": "cittadino_italiano_ue",
      "ask": "Sei cittadino italiano o dell'Unione Europea? (sì/no)",
      "type": "boolean"
    },
    ...
  ],
  "reasons_if_fail": [...],
  "next_actions_if_ok": [...]
}
```

La DSL è stata validata automaticamente e non presenta errori di schema!
```

### Scenario: Errore di Schema (Correzione Automatica)

```
👤 UTENTE
Crea DSL per Assegno Unico

🤖 AI AGENT
Descrivi tutti i requisiti...

👤 UTENTE
[Descrive requisiti...]

🤖 AI AGENT
[CHIAMA "Crea DSL"]
[Internamente: validazione fallisce, loop di correzione automatico]

[Tentativo 1: errore "variabile figli_in_tutela non dichiarata"]
[Tentativo 2: correzione → validazione OK]

Ecco la DSL generata:
```json
{
  "title": "Assegno Unico",
  ...
}
```

La DSL è stata validata con successo (corretta automaticamente al 2° tentativo).
```

---

## 7. Testing & Debug

### Test Singoli Componenti

#### Test "Crea DSL" - Generazione
1. Preparare input test:
```json
{
  "mode": "generazione",
  "requisiti_utente": "Bonus Nido: cittadini italiani o UE, ISEE minorenni sotto 40.000€"
}
```
2. Eseguire nodo Code "Prepare Prompt"
3. Verificare output: `systemPrompt` e `userMessage` popolati
4. Eseguire nodo "Message a Model"
5. Verificare output JSON valido

#### Test "Crea DSL" - Correzione
1. Preparare input test con errori:
```json
{
  "mode": "correzione",
  "requisiti_utente": "...",
  "dsl_da_correggere": { /* DSL con errori */ },
  "errori_validazione": ["Reason 5: variabile X non dichiarata"],
  "tentativo_numero": 2
}
```
2. Verificare che il prompt contenga errori e DSL da correggere

#### Test Validatore
1. Aprire nodo Code validator
2. Testare con DSL valida → `valid: true`
3. Testare con DSL con errori → `valid: false, errors: [...]`

#### Test "Salva in Notion"
1. Verificare database Notion esistente
2. Testare con DSL validata
3. Verificare creazione pagina su Notion

### Test End-to-End

#### Scenario 1: Happy Path
- Input: Requisiti chiari e completi in un'unica risposta
- Expected: AI Agent chiama "Crea DSL" → DSL generata e validata al primo tentativo
- Verificare: DSL mostrata all'utente

#### Scenario 2: Requisiti Incompleti
- Input: "Voglio il bonus bebè"
- Expected: AI Agent chiede di descrivere TUTTI i requisiti
- Verificare: Messaggio con template richiesta

#### Scenario 3: Errore Schema con Autocorrezione
- Forzare errore (es. modificare prompt per generare variabile sbagliata)
- Expected: Correzione automatica in 2-3 tentativi
- Verificare: DSL finale valida, numero tentativi nel log

#### Scenario 4: Errore Persistente (3 tentativi falliti)
- Forzare errori ripetuti
- Expected: Errore dopo 3 tentativi
- Verificare: Messaggio di errore chiaro

### Common Issues

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| "Tool not found" | Tool non connesso ad Agent | Verificare connessioni ai_tool all'AI Agent |
| "Invalid JSON" | OpenAI genera JSON malformato | Verificare temperature=0, seed, responseFormat=json_object |
| "Notion error" | Database ID errato | Verificare NOTION_DATABASE_ID |
| "Input undefined" | Campo requisiti_utente mancante | Verificare che il nodo precedente passi il campo corretto |
| "Loop infinito" | Validazione sempre fallisce | Controllare logica feedback loop, max 3 tentativi |
| "Inconsistenza variabili" | GPT-4.1-mini meno affidabile | Usare GPT-4o (non mini) con temperature=0 e seed |

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

### Setup Iniziale
- [ ] Creare workflow "DSL Chat Agent" su n8n
- [ ] Aggiungere Chat Trigger
- [ ] Aggiungere Window Buffer Memory
- [ ] Aggiungere OpenAI Chat Model (principale, gpt-4o)
- [ ] Aggiungere AI Agent node
- [ ] Configurare system prompt AI Agent (Sezione 3)

### Tool "Crea DSL"
- [ ] Creare nodo Code "Prepare Prompt"
- [ ] Copiare codice da Sezione 2, Nodo 5.1
- [ ] Creare nodo "Message a Model" (OpenAI)
- [ ] Configurare: model=gpt-4o, temperature=0, seed=42
- [ ] Collegare System Message a `{{ $json.systemPrompt }}`
- [ ] Collegare User Message a `{{ $json.userMessage }}`
- [ ] Creare nodo Code "Validate DSL Schema"
- [ ] Copiare codice da file `dsl-schema-validator.js` (Sezione 4)
- [ ] Implementare logica feedback loop (if errori → torna a Prepare con mode=correzione)

### Tool "Salva in Notion"
- [ ] Aggiungere Tool: Notion
- [ ] Configurare proprietà Notion (Sezione 5)
- [ ] Configurare nome tool: "Salva in Notion"

### Connessioni e Configurazioni
- [ ] Connettere Chat Trigger → AI Agent (main)
- [ ] Connettere Window Memory → AI Agent (ai_memory)
- [ ] Connettere OpenAI Model → AI Agent (ai_languageModel)
- [ ] Connettere Tool "Crea DSL" → AI Agent (ai_tool)
- [ ] Connettere Tool "Salva in Notion" → AI Agent (ai_tool)
- [ ] Configurare credentials OpenAI
- [ ] Configurare credentials Notion
- [ ] Configurare environment variable NOTION_DATABASE_ID

### Testing
- [ ] Testare nodo "Prepare Prompt" (mode=generazione)
- [ ] Testare nodo "Prepare Prompt" (mode=correzione)
- [ ] Testare nodo "Message a Model"
- [ ] Testare nodo "Validate DSL"
- [ ] Testare feedback loop completo (max 3 tentativi)
- [ ] Testare Tool "Salva in Notion"
- [ ] Testare workflow end-to-end con requisiti semplici
- [ ] Testare workflow con requisiti complessi (Assegno Unico)
- [ ] Verificare autocorrezione su errori di schema

### Deploy
- [ ] Attivare workflow
- [ ] Monitorare primi utilizzi
- [ ] Verificare performance (tempo risposta, tasso successo)

---

**Versione:** 2.0
**Data:** 2025-01-20
**Autore:** Claude Code
**Changelog v2.0:**
- Aggiunto feedback loop automatico per correzione DSL
- Prompt unificato con modalità generazione/correzione
- Configurazione OpenAI ottimizzata (gpt-4o, T=0, seed)
- System prompt AI Agent semplificato (raccolta requisiti in unica domanda)
