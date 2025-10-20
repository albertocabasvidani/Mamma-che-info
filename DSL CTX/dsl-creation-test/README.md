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

💾 DSL creata salvata in: dsl-created-1737420123456.json
💾 Report completo salvato in: creation-test-result-1737420123456.json

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

**1. `creation-test-result-{timestamp}.json`** - Report completo
```json
{
  "testName": "miei-requisiti",
  "requisiti": "Il Bonus Nido è per...",
  "tentativi": [
    {
      "numero": 1,
      "tipo": "generazione",
      "valida": false,
      "errori": ["Reason 5: variabile \"X\" non dichiarata"],
      "dsl": { "title": "...", ... }
    },
    {
      "numero": 2,
      "tipo": "correzione",
      "valida": true,
      "errori": [],
      "dsl": { "title": "...", ... }
    }
  ],
  "dslFinale": { "title": "...", ... },
  "valida": true
}
```

**2. `dsl-created-{timestamp}.json`** - DSL creata (solo se valida)
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
dsl-creation-test/
├── dsl-creation-test-runner.js  # Script principale
├── README.md                    # Questa guida
├── .env.example                 # Template configurazione
├── .env                         # Tua chiave API (git-ignored)
├── .gitignore                   # Ignora risultati test
├── examples/
│   ├── bonus-nido-requisiti.txt # Esempio requisiti
│   └── test-cases.json          # Vecchi test cases (riferimento)
├── creation-test-result-*.json  # Report generati (git-ignored)
└── dsl-created-*.json           # DSL create (git-ignored)
```

## Configurazione OpenAI

Nel file `dsl-creation-test-runner.js`, modifica:

```javascript
const OPENAI_CONFIG = {
  model: 'gpt-4o',        // Modello da usare (NON mini!)
  temperature: 0,          // 0 = deterministico
  seed: 42,                // Per consistenza
  max_tokens: 4000         // Max tokens risposta
};
```

## Note

- Richiede Node.js v18+ (per fetch nativo)
- Usa il validatore dalla cartella parent: `../dsl-schema-validator.js`
- Max 3 tentativi per DSL (1 generazione + 2 correzioni)
- Exit code: 0 se DSL valida, 1 se non valida

## File di esempio

Vedi `examples/bonus-nido-requisiti.txt` per un esempio di come strutturare i requisiti.
