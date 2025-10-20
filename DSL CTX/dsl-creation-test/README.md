# DSL Creation Test Runner

Applicazione per testare automaticamente il loop di creazione/validazione/correzione delle DSL.

Fornisci tu i requisiti → L'app crea la DSL → Valida → Corregge (max 3 tentativi) → Report errori

## Setup

### 1. Configurare OpenAI API Key

**Opzione A: File .env (consigliato)**

```bash
# Copia il file di esempio
cp .env.example .env

# Modifica .env e inserisci la tua chiave
nano .env
```

Il file `.env` deve contenere:
```
OPENAI_API_KEY=sk-your-actual-key-here
```

**Opzione B: Variabile d'ambiente**

```bash
export OPENAI_API_KEY="sk-..."
```

### 2. Installare dipendenze

Non richiede npm install - usa solo moduli nativi Node.js (fs, path, fetch).

## Uso

### Opzione 1: Da file di testo

```bash
node dsl-creation-test-runner.js requisiti.txt
```

### Opzione 2: Testo diretto

```bash
node dsl-creation-test-runner.js "Il Bonus Nido è per cittadini italiani o UE..."
```

### Esempio completo

```bash
# Crea file con requisiti
cat > miei-requisiti.txt << EOF
Il Bonus Nido è per cittadini italiani, dell'Unione Europea o extracomunitari
con permesso di lungo soggiorno. Serve una DSU valida con ISEE minorenni sotto
40.000 euro. Il bambino deve essere iscritto all'asilo nido pubblico o privato
autorizzato e residente in Italia.
EOF

# Esegui test
node dsl-creation-test-runner.js miei-requisiti.txt
```

## Output

### Console

```
🚀 DSL Creation Test Runner v1.0
📄 Requisiti caricati da: miei-requisiti.txt
🤖 Modello: gpt-4o (T=0, seed=42)

============================================================
TEST: miei-requisiti
============================================================
Requisiti: Il Bonus Nido è per cittadini italiani...

⏳ Tentativo 1/3: Generazione DSL...
❌ Tentativo 1: ERRORI RILEVATI
   1. Reason 5: variabile "figli_in_tutela" non dichiarata in steps
   2. Step 3: campo "type" deve essere "boolean", "string" o "number"

⏳ Tentativo 2/3: Correzione DSL...
✅ Tentativo 2: DSL VALIDA!

📊 Risultato finale: ✅ VALIDA

💾 DSL creata salvata in: tests/bonus-nido/dsl-generated.json
💾 Report completo salvato in: tests/bonus-nido/test-report.md

============================================================
RIEPILOGO ERRORI PER TENTATIVO
============================================================

❌ Tentativo 1 (generazione): 2 errori
   1. Reason 5: variabile "figli_in_tutela" non dichiarata in steps
   2. Step 3: campo "type" deve essere "boolean", "string" o "number"

✅ Tentativo 2 (correzione): Nessun errore

============================================================
Risultato finale: ✅ DSL VALIDA
Tentativi totali: 2
============================================================
```

### File generati

I file di ogni test vengono salvati in una cartella dedicata: `tests/{nome-test}/`

**Struttura cartella test**:
```
tests/
└── {nome-test}/
    ├── requisiti.txt           # Requisiti forniti
    ├── test-report.md          # Report completo in Markdown
    └── dsl-generated.json      # DSL generata (solo se valida)
```

**Contenuto `test-report.md`**:
- Riepilogo test (data, modello, risultato, tentativi)
- Requisiti forniti
- Tabella riepilogo tentativi
- Dettaglio errori per ogni tentativo
- DSL finale generata (in formato JSON)
- Analisi della DSL (punti di forza, copertura requisiti)
- Conclusioni
```json
{
  "title": "Bonus Nido",
  "evaluation_mode": "incremental",
  "steps": [...],
  "reasons_if_fail": [...],
  "next_actions_if_ok": [...]
}
```

## Struttura cartella

```
DSL CTX/
├── nodo-code-generazione-prompt.js  # Codice n8n per generazione prompt (system + user)
├── dsl-schema-validator.js          # Codice n8n per validazione DSL
└── dsl-creation-test/
    ├── dsl-creation-test-runner.js  # Script principale test
    ├── README.md                    # Questa guida
    ├── .env.example                 # Template configurazione
    ├── .env                         # Tua chiave API (git-ignored)
    ├── .gitignore
    └── tests/                       # Cartella risultati test
        ├── bonus-nuovi-nati/        # Test Bonus Nuovi Nati
        │   ├── requisiti.txt
        │   ├── test-report.md
        │   └── dsl-generated.json
        └── assegno-unico/           # Test Assegno Unico
            ├── requisiti.txt
            ├── test-report.md
            └── dsl-generated.json
```

## Configurazione

### OpenAI

Nel file `dsl-creation-test-runner.js`, modifica:

```javascript
const OPENAI_CONFIG = {
  model: 'gpt-4o',        // Modello da usare (NON mini!)
  temperature: 0,          // 0 = deterministico
  seed: 42,                // Per consistenza
  max_tokens: 4000         // Max tokens risposta
};
```

### MAX Tentativi

Numero massimo di tentativi di correzione (default: 3):

```javascript
const MAX_TENTATIVI = 3;  // 1 generazione + 2 correzioni
```

Questo valore corrisponde a `MAX_DSL_RETRIES` in n8n.

## Note

- Richiede Node.js v18+ (per fetch nativo)
- Usa il validatore dalla cartella parent: `../dsl-schema-validator.js`
- Usa il prompt generator dalla cartella parent: `../nodo-code-generazione-prompt.js`
- MAX tentativi configurabile (default: 3)
- Passaggio contatori tra nodi (tentativo_numero, max_tentativi)
- Exit code: 0 se DSL valida, 1 se non valida

## Architettura n8n

I file `dsl-schema-validator.js` e `nodo-code-generazione-prompt.js` sono compatibili con i nodi Code di n8n:

- **nodo-code-generazione-prompt.js**: Genera system prompt e user message per OpenAI
  - Legge `tentativo_numero` e incrementa automaticamente
  - Determina mode: `generazione` (tentativo 1) o `correzione` (tentativo > 1)
  - Input: `$json.requisiti_utente`, `$json.tentativo_numero`, `$json.max_tentativi`
  - Output: `{ systemPrompt, userMessage, tentativo_numero, max_tentativi, requisiti_utente }`

- **dsl-schema-validator.js**: Valida struttura DSL e gestisce retry loop
  - Estrae DSL (wrappato o diretto)
  - Valida schema e decide se ritentare
  - Input: `$input.first().json` (DSL + contatori)
  - Output: `{ valid, dsl?, errors?, retry, tentativo_numero, max_tentativi }`
  - Retry logic: `retry: true` se `tentativo < max_tentativi`

Vedi `n8n-workflow-setup-retry.md` per setup completo del workflow.

## File di esempio

Vedi `examples/bonus-nido-requisiti.txt` per un esempio di come strutturare i requisiti.
