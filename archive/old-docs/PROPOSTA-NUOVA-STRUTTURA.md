# Proposta Nuova Struttura Progetto DSL

## 🎯 Obiettivi Riorganizzazione

1. **Separare chiaramente** le fasi del workflow: Input → Creation → Validation → Execution
2. **Distinguere** codice n8n da tool locali
3. **Centralizzare** documentazione e schemi
4. **Archiviare** file legacy/obsoleti
5. **Semplificare** navigazione per nuovi contributor

---

## 📁 Struttura Proposta

```
DSL CTX/
│
├── 📚 docs/                              # TUTTA la documentazione
│   ├── README.md                         # Overview progetto (root)
│   ├── CLAUDE.md                         # Istruzioni per Claude Code
│   ├── architecture/
│   │   ├── n8n-workflow-architecture.md
│   │   ├── n8n-workflow-setup-retry.md
│   │   └── strategia-generazione-dsl-affidabile.md
│   ├── guides/
│   │   ├── linee-guida-compilazione-requisiti.md
│   │   ├── prompt-creazione-DSL.md
│   │   └── analisi-requisiti-assegno-unico.md
│   └── examples/
│       ├── requisiti-congedo-maternita.md
│       └── test-requisiti-semplice.txt
│
├── 🏭 n8n/                               # Codice per workflow n8n
│   ├── README.md                         # Setup n8n
│   ├── nodes/
│   │   ├── create-ctx.js                 # Nodo: crea CTX iniziale
│   │   ├── generate-prompt.js            # Nodo: genera prompt OpenAI
│   │   ├── validate-dsl.js               # Nodo: valida schema DSL
│   │   └── process-dsl.js                # Nodo: elabora DSL incrementale
│   ├── workflows/
│   │   └── dsl-generation-workflow.json  # Export workflow completo
│   └── tests/
│       └── test-setup.js                 # Verifica configurazione n8n
│
├── 🎨 dsl-definitions/                   # DSL definitive produzione
│   ├── README.md                         # Spiegazione DSL
│   ├── assegno-unico.json
│   ├── bonus-nuovi-nati.json
│   ├── congedo-maternita.json
│   ├── bonus-nido.json                   # ← da aggiungere
│   └── schemas/
│       ├── schema-dsl-incremental.json   # Schema base incrementale
│       └── schema-dsl-batch.json         # Schema base batch
│
├── 📥 input/                             # Materiali input per generazione DSL
│   ├── checklists/                       # Checklist INPS in linguaggio naturale
│   │   ├── bonus-nido.pdf
│   │   ├── congedo-parentale.pdf
│   │   ├── invalidita.pdf
│   │   └── naspi.pdf
│   ├── requirements/                     # Requisiti estratti/processati
│   │   ├── bonus-nido.txt
│   │   └── congedo-maternita.txt
│   └── vademecum/
│       └── maternita.pdf
│
├── 🔧 tools/                             # Tool standalone (non n8n)
│   │
│   ├── dsl-creator/                      # Tool creazione DSL
│   │   ├── README.md
│   │   ├── workflow-simulator.js         # Simula workflow n8n completo
│   │   ├── prompt-generator.js           # Genera prompt (versione standalone)
│   │   ├── schema-validator.js           # Valida schema DSL
│   │   └── validator-service.js          # Service validazione
│   │
│   └── dsl-tester/                       # Tool test/esecuzione DSL
│       ├── README.md
│       ├── test-runner.js                # Runner base (singolo test)
│       ├── test-generator.js             # Genera TUTTE le casistiche
│       └── ctx-simulator.js              # Simula CTX workflow
│
├── 🧪 tests/                             # Output test & report
│   ├── creation/                         # Test generazione DSL
│   │   ├── bonus-nido/
│   │   │   ├── workflow-execution-report.md
│   │   │   ├── dsl-generated.json
│   │   │   └── execution-data.json
│   │   └── README.md
│   │
│   └── execution/                        # Test esecuzione DSL
│       ├── bonus-nido/
│       │   ├── automated-test-report.md
│       │   ├── automated-test-results.json
│       │   └── manual-tests/
│       │       ├── test-runner-specific.js
│       │       └── test-results.json
│       └── README.md
│
├── 🗄️ archive/                           # File obsoleti/legacy
│   ├── old-tests/                        # Test runner vecchi
│   │   ├── dsl-assegno-unico-test-runner.js
│   │   └── ...
│   ├── old-code/
│   │   ├── codice-creazione-ctx-15-10-2025.txt
│   │   └── ...
│   └── old-reports/
│       └── test-report-playwright.md
│
├── .gitignore
├── package.json                          # Dipendenze (se necessario)
└── LICENSE
```

---

## 📋 Mapping File Attuali → Nuova Struttura

### 📚 Documentazione

| File Attuale | Destinazione Nuova |
|--------------|-------------------|
| `CLAUDE.md` | `docs/CLAUDE.md` |
| `README.md` (root progetto) | `docs/README.md` |
| `n8n-workflow-architecture.md` | `docs/architecture/n8n-workflow-architecture.md` |
| `strategia-generazione-dsl-affidabile.md` | `docs/architecture/strategia-generazione-dsl-affidabile.md` |
| `linee-guida-compilazione-requisiti.md` | `docs/guides/linee-guida-compilazione-requisiti.md` |
| `analisi-requisiti-assegno-unico.md` | `docs/guides/analisi-requisiti-assegno-unico.md` |
| `dsl-creation-test/prompt creazione DSL.md` | `docs/guides/prompt-creazione-dsl.md` |
| `requisiti-congedo-maternita.md` | `docs/examples/requisiti-congedo-maternita.md` |

### 🏭 N8N Workflow

| File Attuale | Destinazione Nuova |
|--------------|-------------------|
| `dsl-creation-test/nodo-code-generazione-prompt.js` | `n8n/nodes/generate-prompt.js` |
| `dsl-creation-test/dsl-schema-validator.js` | `n8n/nodes/validate-dsl.js` |
| `dsl-execution-test/codice elaborazione DSL incrementale.txt` | `n8n/nodes/process-dsl.js` |
| `test/codice creazione CTX 15-10-2025.txt` | `n8n/nodes/create-ctx.js` |
| `dsl-creation-test/n8n-workflow-setup-retry.md` | `docs/architecture/n8n-workflow-setup-retry.md` |
| `dsl-creation-test/test-setup.js` | `n8n/tests/test-setup.js` |

### 🎨 DSL Definitions

| File Attuale | Destinazione Nuova |
|--------------|-------------------|
| `DSL definitive/dsl-assegno-unico.json` | `dsl-definitions/assegno-unico.json` |
| `DSL definitive/bonus-nuovi-nati-completo.json` | `dsl-definitions/bonus-nuovi-nati.json` |
| `DSL definitive/dsl-congedo-maternita.json` | `dsl-definitions/congedo-maternita.json` |
| `dsl-creation-test/tests/checklist-bonus-nido-text/dsl-generated.json` | `dsl-definitions/bonus-nido.json` |
| `schema-dsl-incrementale.json` | `dsl-definitions/schemas/schema-dsl-incremental.json` |
| `schema-dsl-semplice-incrementale.json` | `dsl-definitions/schemas/schema-dsl-batch.json` |

### 📥 Input Materials

| File Attuale | Destinazione Nuova |
|--------------|-------------------|
| `dsl-creation-test/checklist linguaggio naturale/*.pdf` | `input/checklists/*.pdf` |
| `dsl-creation-test/checklist-bonus-nido-text.txt` | `input/requirements/bonus-nido.txt` |
| `test requisiti congedo di maternità.txt` | `input/requirements/congedo-maternita.txt` |
| `vademecum maternità.pdf` | `input/vademecum/maternita.pdf` |

### 🔧 Tools

| File Attuale | Destinazione Nuova |
|--------------|-------------------|
| `dsl-creation-test/n8n-workflow-simulator.js` | `tools/dsl-creator/workflow-simulator.js` |
| `dsl-creation-test/dsl-validator-service.js` | `tools/dsl-creator/validator-service.js` |
| `dsl-creation-test/README-SIMULATOR.md` | `tools/dsl-creator/README.md` |
| `dsl-execution-test/dsl-test-runner.js` | `tools/dsl-tester/test-runner.js` |
| `dsl-execution-test/dsl-automated-test-generator.js` | `tools/dsl-tester/test-generator.js` |
| `dsl-execution-test/README-AUTOMATED-GENERATOR.md` | `tools/dsl-tester/README.md` |

### 🧪 Tests & Reports

| File Attuale | Destinazione Nuova |
|--------------|-------------------|
| `dsl-creation-test/tests/*` | `tests/creation/*` |
| `dsl-execution-test/automated-tests/*` | `tests/execution/*/automated-test-*` |
| `test/dsl-*-test-runner.js` | `tests/execution/*/manual-tests/` |
| `test/dsl-*-test-results.json` | `tests/execution/*/manual-tests/` |

### 🗄️ Archive (File Obsoleti)

| File Attuale | Motivo Archiviazione |
|--------------|---------------------|
| `test/codice creazione CTX 15-10-2025.txt` | Obsoleto, sostituito da n8n/nodes/create-ctx.js |
| `test/codice elaborazione DSL 15-10-2025.txt` | Obsoleto, sostituito da n8n/nodes/process-dsl.js |
| `test/esempio CTX 15-10-2025.txt` | Esempio legacy |
| `test/esempio DSL 15-10-2025.txt` | Esempio legacy |
| `test/test-report-playwright.md` | Test con Playwright deprecato |
| `test/automated-test-summary.md` | Sostituito da nuovi report |
| `test/TEST-RUNNER-README.md` | Obsoleto, merge in tools/dsl-tester/README.md |
| `dsl-creation-test/dsl-creation-test-runner.js` | Sostituito da workflow-simulator.js |

---

## 🎯 Vantaggi Nuova Struttura

### 1. **Chiarezza Workflow**
```
Input Materials → DSL Creator → DSL Definitions → DSL Tester → Test Reports
    ↓                ↓              ↓                ↓              ↓
 input/         tools/dsl-creator/  dsl-definitions/  tools/dsl-tester/  tests/
```

### 2. **Separazione N8N vs Local**
- `n8n/` - Solo codice per workflow n8n (production)
- `tools/` - Script standalone per sviluppo/test locale

### 3. **Documentazione Centralizzata**
- Tutte le guide in `docs/`
- Suddivise per categoria (architecture, guides, examples)

### 4. **Test Organizzati per Tipo**
- `tests/creation/` - Test generazione DSL
- `tests/execution/` - Test esecuzione DSL
- Per pratica burocratica

### 5. **Input Separato da Output**
- `input/` - Materiali sorgente (PDF, txt)
- `tests/` - Output generati (reports, DSL)

### 6. **Archive Pulito**
- File legacy non perduti
- Struttura principale snella

---

## 🚀 Piano Migrazione

### Fase 1: Backup (SICUREZZA)
```bash
git add -A
git commit -m "Backup: pre-ristrutturazione"
git push
```

### Fase 2: Creazione Struttura
```bash
# Crea nuove directory
mkdir -p docs/{architecture,guides,examples}
mkdir -p n8n/{nodes,workflows,tests}
mkdir -p dsl-definitions/schemas
mkdir -p input/{checklists,requirements,vademecum}
mkdir -p tools/{dsl-creator,dsl-tester}
mkdir -p tests/{creation,execution}
mkdir -p archive/{old-tests,old-code,old-reports}
```

### Fase 3: Spostamento File (con git mv)
```bash
# Esempio: muovi file mantenendo history
git mv CLAUDE.md docs/CLAUDE.md
git mv "DSL definitive/dsl-assegno-unico.json" dsl-definitions/assegno-unico.json
# ... etc
```

### Fase 4: Aggiornamento Riferimenti
- Aggiorna path in CLAUDE.md
- Aggiorna import relativi in .js
- Aggiorna README con nuova struttura

### Fase 5: Test & Commit
```bash
# Testa script principali
cd tools/dsl-creator
node workflow-simulator.js ../../input/requirements/bonus-nido.txt

cd ../dsl-tester
node test-generator.js ../../dsl-definitions/bonus-nido.json

# Commit
git add -A
git commit -m "Refactor: nuova struttura cartelle logica"
git push
```

---

## 📝 Note Implementazione

### README da Creare/Aggiornare

1. **`docs/README.md`** - Overview progetto completo
2. **`n8n/README.md`** - Setup e uso workflow n8n
3. **`dsl-definitions/README.md`** - Spiegazione DSL e schema
4. **`tools/dsl-creator/README.md`** - Merge di README-SIMULATOR.md
5. **`tools/dsl-tester/README.md`** - Merge di README-AUTOMATED-GENERATOR.md
6. **`tests/README.md`** - Come leggere report test

### File da Rimuovere (già copiati in archive/)

- `test/TEST-RUNNER-README.md`
- Tutti i file txt datati "15-10-2025"
- Report Playwright obsoleti

### .gitignore da Aggiornare

```gitignore
# Test output temporanei
tests/creation/*/execution-data.json
tests/execution/*/automated-test-results.json

# N8N credentials
n8n/credentials.json

# Environment
.env
*.env.local
```

---

## ✅ Checklist Migrazione

- [ ] **Backup completo** (git commit + push)
- [ ] **Creare struttura directory**
- [ ] **Spostare file documentazione** (docs/)
- [ ] **Spostare codice n8n** (n8n/)
- [ ] **Spostare DSL definitive** (dsl-definitions/)
- [ ] **Spostare input materials** (input/)
- [ ] **Spostare tools** (tools/)
- [ ] **Spostare test output** (tests/)
- [ ] **Archiviare file obsoleti** (archive/)
- [ ] **Aggiornare CLAUDE.md** con nuovi path
- [ ] **Creare README.md** per ogni cartella principale
- [ ] **Testare script principali** con nuovi path
- [ ] **Aggiornare .gitignore**
- [ ] **Commit finale** con messaggio descrittivo
- [ ] **Push su GitHub**
- [ ] **Verificare GitHub Pages** (se usato)

---

## 🎓 Esempi Uso Post-Migrazione

### Generare DSL da checklist

```bash
# Input: checklist PDF
cd tools/dsl-creator
node workflow-simulator.js ../../input/checklists/bonus-nido.pdf

# Output: tests/creation/bonus-nido/dsl-generated.json
```

### Testare DSL generata

```bash
# Input: DSL definitiva
cd tools/dsl-tester
node test-generator.js ../../dsl-definitions/bonus-nido.json

# Output: tests/execution/bonus-nido/automated-test-report.md
```

### Deploy workflow n8n

```bash
# Copia nodi in n8n
cd n8n/nodes
# Import generate-prompt.js in Code node n8n
# Import validate-dsl.js in Code node n8n
```

---

## 🤔 Domande/Decisioni

Prima di procedere, confermare:

1. **Archiviare o eliminare** file in `archive/`?
   - ✅ Archiviare (mantiene history)
   - ❌ Eliminare (pulizia totale)

2. **Mantenere cartella `archivio/`** esistente?
   - Merge in `archive/` proposta?

3. **Package.json necessario?**
   - Se sì, aggiungere dipendenze (nessuna attualmente)

4. **Eseguire migrazione in:**
   - Una volta sola (branch + PR)
   - Incrementale (più commit)

---

**Prossimo Step**: Vuoi che proceda con la migrazione automatica o preferisci farlo manualmente seguendo questa guida?
