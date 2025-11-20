# Mamma che info - Guida per Claude

## Panoramica Progetto
Sistema per la generazione e validazione automatica di DSL (Domain Specific Language) per pratiche burocratiche italiane. Il sistema utilizza AI per creare checklist interattive che verificano i requisiti di ammissibilità.

## Struttura Progetto

```
/mnt/c/claude-code/Mamma che info/
├── backend/n8n/                      # Workflow n8n e nodi custom
│   ├── nodes/
│   │   ├── generate-prompt.js        # Genera prompt per creazione DSL
│   │   ├── process-dsl.js           # Processa e valida DSL
│   │   └── prossimo-tipo.js         # [NUOVO] Gestione tipo prossimo step
│   ├── prompts/                      # [NUOVO] Template prompt AI
│   └── config/                       # [NUOVO] Configurazioni workflow
├── cli-tools/
│   ├── dsl-creator/                  # Tool per creare DSL
│   │   ├── bin/validate-semantic.js  # [NUOVO] Validazione semantica
│   │   └── lib/
│   │       ├── workflow-simulator.js # Simula workflow n8n
│   │       └── tests/               # [NUOVO] Test suite
│   └── dsl-tester/                  # Tool per testare DSL
│       ├── bin/
│       │   ├── generate-tests.js    # Genera test automatici
│       │   └── automated-tests/     # [NUOVO] Suite test automatizzati
│       └── lib/test-runner.js       # Esegue test DSL
├── dsl-library/pratiche/            # Libreria DSL pratiche
│   ├── bonus-nido.json
│   ├── bonus-nuovi-nati.json
│   ├── assegno-unico-universale.json # [NUOVO]
│   ├── congedo-parentale.json       # [NUOVO]
│   ├── invalidita.json              # [NUOVO]
│   └── naspi.json                   # [NUOVO]
├── docs/
│   ├── architecture/                # Documentazione architettura
│   ├── guides/                      # [NUOVO] Guide implementazione
│   │   └── implementazione-validazione-semantica.md
│   ├── email-validazione-requisiti-*.md # [NUOVO] Email validate
│   └── report-dsl-essenziali.md     # [NUOVO] Report DSL prioritarie
└── resources/checklists/            # Checklist requisiti
    ├── DSL essenziali/              # [NUOVO] 5 DSL prioritarie
    └── checklist linguaggio naturale/ # [NUOVO] Versioni leggibili

```

## Componenti Principali

### 1. Backend N8N

#### generate-prompt.js
**Path**: `backend/n8n/nodes/generate-prompt.js`

Genera prompt per l'AI che crea DSL strutturate. Include:
- Gestione condizioni OR multiple generalizzata (N alternative)
- Pattern skip_if a catena per condizioni incrementali
- Validazione title fornito dall'utente
- Modalità generazione/correzione
- Supporto validazione semantica

**Regole chiave**:
- Condizioni OR: `skip_if: "alt1 === true || alt2 === true || ..."`
- Reasons: `when: "alt1 === false && alt2 === false && ..."`
- Title sempre dall'input utente, mai inventato

#### process-dsl.js
**Path**: `backend/n8n/nodes/process-dsl.js`

Processa DSL ed esegue valutazione step-by-step con:
- Evaluation mode: incremental (blocco immediato) o batch
- Skip_if: valutazione condizionale degli step
- CTX tracking: monitoraggio contesto conversazione
- Gestione reasons con check_after_vars

### 2. CLI Tools

#### dsl-creator
Tool per creare e validare DSL:
- Workflow simulator per test senza n8n
- Validazione semantica con confidence score
- Rilevamento allucinazioni e requisiti mancanti
- Test automatizzati

#### dsl-tester
Tool per testare DSL generate:
- Test runner con scenari automatici
- Generatore test da requisiti
- Report validazione

### 3. DSL Library

Raccolta DSL pratiche italiane validate:
- Bonus nido
- Bonus nuovi nati
- Assegno unico universale
- Congedo parentale
- Invalidità civile
- NASpI

## Schema DSL

```json
{
  "dsl": {
    "title": "Nome pratica",
    "evaluation_mode": "incremental",
    "steps": [
      {
        "var": "nome_variabile",
        "ask": "Domanda? (sì/no)",
        "type": "boolean",
        "skip_if": "altra_var === true"  // opzionale
      }
    ],
    "reasons_if_fail": [
      {
        "when": "var1 === false && var2 === false",
        "reason": "Motivo inammissibilità",
        "check_after_vars": ["var1", "var2"],
        "blocking": true
      }
    ],
    "next_actions_if_ok": ["Azioni da fare"]
  }
}
```

## Pattern Condizioni OR

Per gestire alternative (A OPPURE B OPPURE C...):

```javascript
// Step 1: prima alternativa
{ "var": "opzione_a", "ask": "..." }

// Step 2: seconda alternativa
{ "var": "opzione_b", "ask": "...", "skip_if": "opzione_a === true" }

// Step 3: terza alternativa
{ "var": "opzione_c", "ask": "...", "skip_if": "opzione_a === true || opzione_b === true" }

// Reason: verifica tutte false
{
  "when": "opzione_a === false && opzione_b === false && opzione_c === false",
  "check_after_vars": ["opzione_a", "opzione_b", "opzione_c"]
}
```

## Workflow N8N

1. **Input utente**: nome pratica + requisiti
2. **Generate Prompt**: crea prompt per AI
3. **OpenAI**: genera DSL JSON
4. **Validazione Schema**: verifica struttura
5. **Validazione Semantica**: verifica copertura requisiti
6. **Loop correzione**: se errori, rigenera
7. **Output**: DSL validata

## Validazione Semantica

Criteri (confidence score 0-100):
- ✓ Copertura requisiti: tutti i requisiti sono rappresentati
- ✓ No allucinazioni: nessun elemento non richiesto
- ✓ Logica corretta: skip_if e when coerenti
- ✓ Variabili consistenti: nomi identici ovunque

## Test Automatizzati

Genera e esegue test per verificare:
- Scenari ammissibilità
- Scenari inammissibilità
- Edge cases
- Logica condizioni OR

## Server n8n

- **URL**: http://31.97.122.39:5678
- **API Key**: disponibile in variabile ambiente N8N_API_KEY
- **Workflow ID**: vedere lista con n8n MCP tools

## Modifiche Recenti

### Fix Condizioni OR Multiple (oggi)
- Generalizzato pattern skip_if per N alternative
- Aggiunta regola title dall'utente
- Rimosso max_tentativi (gestione automatica)

### Aggiunte DSL
- 5 nuove DSL prioritarie
- Checklist linguaggio naturale
- Email validazione requisiti

### Validazione Semantica
- Implementato sistema confidence score
- Rilevamento allucinazioni
- Suggerimenti correzione automatici

## Comandi Utili

```bash
# Test DSL locale
node cli-tools/dsl-tester/lib/test-runner.js

# Genera test automatici
node cli-tools/dsl-tester/bin/generate-tests.js

# Simula workflow n8n
node cli-tools/dsl-creator/lib/workflow-simulator.js

# Validazione semantica
node cli-tools/dsl-creator/bin/validate-semantic.js
```

## Note Tecniche

- **Evaluation mode**: sempre "incremental" per blocco immediato
- **Skip_if**: usa `===` per confronti booleani
- **Reasons blocking**: sempre `true` (boolean, non stringa)
- **Check_after_vars**: deve includere TUTTE le variabili in `when`
- **Nome variabili**: identico in var, skip_if, when, check_after_vars

## Repository

https://github.com/albertocabasvidani/Mamma-che-info.git
