# Proposta Riorganizzazione Completa - Mamma che info

## 🎯 Contesto Progetto

**Mamma che info** è un progetto completo che include:
1. **App Web DSL Tester** (GitHub Pages: https://albertocabasvidani.github.io/Mamma-che-info/)
2. **Workflow N8N** per generazione automatica DSL
3. **Tool CLI** per creazione e test DSL
4. **Documentazione** Chatbot CAF, Supabase, API Gateway

---

## 📁 Struttura Attuale (Problematica)

```
Mamma che info/
├── index.html                              # App web (GitHub Pages)
├── README.md                               # Doc app web
├── Chatbot-CAF-Documentazione.md           # Doc chatbot
├── GUIDA_SUPABASE.md                       # Setup database
├── Prompt-Generazione-DSL.md               # Prompt OpenAI
├── kong.yml                                # API Gateway config
├── .gitignore
│
└── DSL CTX/                                # ⚠️ Mix disordinato di tutto
    ├── CLAUDE.md
    ├── dsl-tester.html                     # Duplicato di index.html?
    ├── DSL definitive/                     # DSL produzione
    ├── dsl-creation-test/                  # Test generazione DSL
    ├── dsl-execution-test/                 # Test esecuzione DSL
    ├── test/                               # Test manuali legacy
    ├── archivio/                           # ?
    └── [50+ file sparsi]
```

**Problemi:**
- ❌ "DSL CTX" mescola codice n8n, tool CLI, test, docs
- ❌ Duplicazione `index.html` vs `dsl-tester.html`
- ❌ Documentazione sparsa (root + DSL CTX)
- ❌ Confusione tra "app web" e "tool CLI"

---

## 📁 Struttura Proposta (Chiara e Modulare)

```
mamma-che-info/
│
├── 📱 web-app/                           # App DSL Tester (GitHub Pages)
│   ├── index.html                        # App principale
│   ├── README.md                         # Doc app web
│   ├── assets/                           # CSS, JS, immagini
│   └── examples/                         # DSL esempio per demo
│
├── 🏭 backend/                           # Backend services (opzionale)
│   ├── n8n/                              # Workflow N8N
│   │   ├── README.md
│   │   ├── workflows/
│   │   │   └── dsl-generation.json       # Export workflow
│   │   └── nodes/
│   │       ├── create-ctx.js
│   │       ├── generate-prompt.js
│   │       ├── validate-dsl.js
│   │       └── process-dsl.js
│   │
│   ├── supabase/                         # Database (se usato)
│   │   ├── schema.sql
│   │   └── migrations/
│   │
│   └── api-gateway/                      # Kong config
│       └── kong.yml
│
├── 🔧 cli-tools/                         # Tool a riga di comando
│   ├── README.md                         # Overview tool CLI
│   │
│   ├── dsl-creator/                      # Generazione DSL
│   │   ├── README.md
│   │   ├── bin/
│   │   │   └── create-dsl.js             # Entry point CLI
│   │   ├── lib/
│   │   │   ├── workflow-simulator.js
│   │   │   ├── prompt-generator.js
│   │   │   ├── schema-validator.js
│   │   │   └── openai-client.js
│   │   └── config/
│   │       └── prompts.json
│   │
│   └── dsl-tester/                       # Test/esecuzione DSL
│       ├── README.md
│       ├── bin/
│       │   ├── test-dsl.js               # Entry point CLI
│       │   └── generate-tests.js
│       ├── lib/
│       │   ├── test-runner.js
│       │   ├── test-generator.js
│       │   ├── ctx-simulator.js
│       │   └── reporter.js
│       └── templates/
│           └── report-template.md
│
├── 📦 dsl-library/                       # DSL produzione
│   ├── README.md                         # Catalogo DSL
│   ├── schemas/
│   │   ├── schema-incremental.json
│   │   └── schema-batch.json
│   ├── pratiche/
│   │   ├── assegno-unico.json
│   │   ├── bonus-nuovi-nati.json
│   │   ├── congedo-maternita.json
│   │   └── bonus-nido.json
│   └── changelog/                        # Versioning DSL
│       └── CHANGELOG.md
│
├── 📥 resources/                         # Materiali sorgente
│   ├── checklists/                       # PDF INPS
│   │   ├── bonus-nido.pdf
│   │   ├── congedo-parentale.pdf
│   │   ├── invalidita.pdf
│   │   └── naspi.pdf
│   ├── requirements/                     # Requisiti estratti
│   │   ├── bonus-nido.txt
│   │   └── congedo-maternita.txt
│   └── vademecum/
│       └── maternita.pdf
│
├── 🧪 tests/                             # Test suite completa
│   ├── README.md
│   │
│   ├── web-app/                          # Test app web (Playwright?)
│   │   └── e2e/
│   │
│   ├── cli-tools/                        # Test tool CLI
│   │   ├── dsl-creator/
│   │   │   ├── bonus-nido/
│   │   │   │   ├── workflow-report.md
│   │   │   │   └── dsl-generated.json
│   │   │   └── README.md
│   │   │
│   │   └── dsl-tester/
│   │       ├── bonus-nido/
│   │       │   ├── automated-report.md
│   │       │   └── results.json
│   │       └── README.md
│   │
│   └── integration/                      # Test integrazione n8n
│       └── workflow-tests.md
│
├── 📚 docs/                              # Documentazione completa
│   ├── README.md                         # Indice documentazione
│   ├── project/
│   │   ├── overview.md                   # Panoramica progetto
│   │   └── roadmap.md
│   ├── architecture/
│   │   ├── system-design.md
│   │   ├── n8n-workflow.md
│   │   ├── dsl-schema.md
│   │   └── api-design.md
│   ├── guides/
│   │   ├── user-guide.md                 # Uso app web
│   │   ├── cli-guide.md                  # Uso tool CLI
│   │   ├── dsl-authoring.md              # Come scrivere DSL
│   │   ├── requirements-extraction.md
│   │   └── n8n-setup.md
│   ├── api/
│   │   ├── n8n-nodes.md
│   │   └── supabase-schema.md
│   └── integrations/
│       ├── chatbot-caf.md
│       └── supabase-integration.md
│
├── 🗄️ archive/                           # Legacy/obsoleti
│   ├── old-code/
│   ├── old-tests/
│   └── old-docs/
│
├── .github/                              # GitHub Actions (CI/CD)
│   └── workflows/
│       ├── deploy-web-app.yml
│       └── test-cli-tools.yml
│
├── .gitignore
├── LICENSE
└── README.md                             # README principale progetto
```

---

## 🎯 Principi Organizzazione

### 1. **Separazione per Tipo di Artefatto**

| Cartella | Contenuto | Pubblico |
|----------|-----------|----------|
| `web-app/` | App web HTML/CSS/JS | Utenti finali |
| `backend/` | Servizi server-side | Ops/DevOps |
| `cli-tools/` | Tool riga comando | Developer |
| `dsl-library/` | DSL JSON produzione | Tutti |
| `resources/` | Materiali input | Content creators |
| `tests/` | Test automatici | QA/CI |
| `docs/` | Documentazione | Tutti |

### 2. **Convenzioni Naming**

- **Cartelle**: `kebab-case` (es. `cli-tools`, `dsl-creator`)
- **File JavaScript**: `kebab-case.js` (es. `test-runner.js`)
- **File JSON**: `kebab-case.json` (es. `bonus-nido.json`)
- **File Docs**: `kebab-case.md` (es. `user-guide.md`)

### 3. **Ogni Cartella ha README.md**

Spiega:
- Scopo della cartella
- Come usare i file contenuti
- Link a documentazione dettagliata

---

## 📋 Mapping File Completo

### 📱 Web App

| File Attuale | Destinazione |
|--------------|--------------|
| `/index.html` | `web-app/index.html` |
| `/README.md` (sezione app) | `web-app/README.md` |
| `DSL CTX/dsl-tester.html` | **ELIMINA** (duplicato) |

### 🏭 Backend

| File Attuale | Destinazione |
|--------------|--------------|
| `DSL CTX/dsl-creation-test/nodo-code-generazione-prompt.js` | `backend/n8n/nodes/generate-prompt.js` |
| `DSL CTX/dsl-creation-test/dsl-schema-validator.js` | `backend/n8n/nodes/validate-dsl.js` |
| `DSL CTX/dsl-execution-test/codice elaborazione DSL incrementale.txt` | `backend/n8n/nodes/process-dsl.js` |
| `DSL CTX/test/codice creazione CTX 15-10-2025.txt` | `backend/n8n/nodes/create-ctx.js` |
| `/kong.yml` | `backend/api-gateway/kong.yml` |
| `/GUIDA_SUPABASE.md` | `docs/integrations/supabase-integration.md` |

### 🔧 CLI Tools

| File Attuale | Destinazione |
|--------------|--------------|
| `DSL CTX/dsl-creation-test/n8n-workflow-simulator.js` | `cli-tools/dsl-creator/lib/workflow-simulator.js` |
| `DSL CTX/dsl-creation-test/dsl-validator-service.js` | `cli-tools/dsl-creator/lib/schema-validator.js` |
| `DSL CTX/dsl-creation-test/test-setup.js` | `cli-tools/dsl-creator/bin/setup-check.js` |
| `DSL CTX/dsl-execution-test/dsl-test-runner.js` | `cli-tools/dsl-tester/lib/test-runner.js` |
| `DSL CTX/dsl-execution-test/dsl-automated-test-generator.js` | `cli-tools/dsl-tester/bin/generate-tests.js` |

### 📦 DSL Library

| File Attuale | Destinazione |
|--------------|--------------|
| `DSL CTX/DSL definitive/dsl-assegno-unico.json` | `dsl-library/pratiche/assegno-unico.json` |
| `DSL CTX/DSL definitive/bonus-nuovi-nati-completo.json` | `dsl-library/pratiche/bonus-nuovi-nati.json` |
| `DSL CTX/DSL definitive/dsl-congedo-maternita.json` | `dsl-library/pratiche/congedo-maternita.json` |
| `DSL CTX/dsl-creation-test/tests/checklist-bonus-nido-text/dsl-generated.json` | `dsl-library/pratiche/bonus-nido.json` |
| `DSL CTX/schema-dsl-incrementale.json` | `dsl-library/schemas/schema-incremental.json` |
| `DSL CTX/schema-dsl-semplice-incrementale.json` | `dsl-library/schemas/schema-batch.json` |

### 📥 Resources

| File Attuale | Destinazione |
|--------------|--------------|
| `DSL CTX/dsl-creation-test/checklist linguaggio naturale/*.pdf` | `resources/checklists/*.pdf` |
| `DSL CTX/dsl-creation-test/checklist-bonus-nido-text.txt` | `resources/requirements/bonus-nido.txt` |
| `DSL CTX/test requisiti congedo di maternità.txt` | `resources/requirements/congedo-maternita.txt` |
| `DSL CTX/vademecum maternità.pdf` | `resources/vademecum/maternita.pdf` |

### 🧪 Tests

| File Attuale | Destinazione |
|--------------|--------------|
| `DSL CTX/dsl-creation-test/tests/*` | `tests/cli-tools/dsl-creator/*` |
| `DSL CTX/dsl-execution-test/automated-tests/*` | `tests/cli-tools/dsl-tester/*` |
| `DSL CTX/test/dsl-*-test-runner.js` | `archive/old-tests/` |
| `DSL CTX/test/test-report-playwright.md` | `tests/web-app/e2e/` (se valido) |

### 📚 Documentazione

| File Attuale | Destinazione |
|--------------|--------------|
| `/README.md` | `README.md` (root) |
| `DSL CTX/CLAUDE.md` | `docs/CLAUDE.md` |
| `DSL CTX/n8n-workflow-architecture.md` | `docs/architecture/n8n-workflow.md` |
| `DSL CTX/strategia-generazione-dsl-affidabile.md` | `docs/architecture/dsl-generation-strategy.md` |
| `DSL CTX/linee-guida-compilazione-requisiti.md` | `docs/guides/requirements-extraction.md` |
| `DSL CTX/analisi-requisiti-assegno-unico.md` | `docs/guides/requirements-analysis-example.md` |
| `/Chatbot-CAF-Documentazione.md` | `docs/integrations/chatbot-caf.md` |
| `/Prompt-Generazione-DSL.md` | `docs/guides/openai-prompts.md` |
| `DSL CTX/dsl-creation-test/README-SIMULATOR.md` | `cli-tools/dsl-creator/README.md` |
| `DSL CTX/dsl-execution-test/README-AUTOMATED-GENERATOR.md` | `cli-tools/dsl-tester/README.md` |

---

## 🚀 Piano Migrazione

### Fase 0: Backup Sicurezza

```bash
cd "/mnt/c/claude-code/Mamma che info"
git add -A
git commit -m "Backup: pre-ristrutturazione completa"
git tag v1.0-pre-refactor
git push --tags
```

### Fase 1: Creazione Struttura Base

```bash
# Root level
mkdir -p web-app/{assets,examples}
mkdir -p backend/{n8n/{workflows,nodes},supabase,api-gateway}
mkdir -p cli-tools/{dsl-creator/{bin,lib,config},dsl-tester/{bin,lib,templates}}
mkdir -p dsl-library/{schemas,pratiche,changelog}
mkdir -p resources/{checklists,requirements,vademecum}
mkdir -p tests/{web-app/e2e,cli-tools/{dsl-creator,dsl-tester},integration}
mkdir -p docs/{project,architecture,guides,api,integrations}
mkdir -p archive/{old-code,old-tests,old-docs}
mkdir -p .github/workflows
```

### Fase 2: Spostamento File Web App

```bash
git mv index.html web-app/index.html
# Crea nuovo README specifico per web app
```

### Fase 3: Spostamento Backend

```bash
git mv kong.yml backend/api-gateway/kong.yml
git mv "DSL CTX/dsl-creation-test/nodo-code-generazione-prompt.js" backend/n8n/nodes/generate-prompt.js
git mv "DSL CTX/dsl-creation-test/dsl-schema-validator.js" backend/n8n/nodes/validate-dsl.js
# ... etc
```

### Fase 4: Spostamento CLI Tools

```bash
git mv "DSL CTX/dsl-creation-test/n8n-workflow-simulator.js" cli-tools/dsl-creator/lib/workflow-simulator.js
git mv "DSL CTX/dsl-execution-test/dsl-automated-test-generator.js" cli-tools/dsl-tester/bin/generate-tests.js
# ... etc
```

### Fase 5: Spostamento DSL Library

```bash
git mv "DSL CTX/DSL definitive/dsl-assegno-unico.json" dsl-library/pratiche/assegno-unico.json
# ... etc
```

### Fase 6: Spostamento Resources

```bash
git mv "DSL CTX/dsl-creation-test/checklist linguaggio naturale" resources/checklists
# ... etc
```

### Fase 7: Spostamento Tests

```bash
git mv "DSL CTX/dsl-creation-test/tests" tests/cli-tools/dsl-creator
git mv "DSL CTX/dsl-execution-test/automated-tests" tests/cli-tools/dsl-tester
```

### Fase 8: Spostamento Documentazione

```bash
git mv "DSL CTX/CLAUDE.md" docs/CLAUDE.md
git mv "Chatbot-CAF-Documentazione.md" docs/integrations/chatbot-caf.md
# ... etc
```

### Fase 9: Archiviazione File Legacy

```bash
git mv "DSL CTX/test" archive/old-tests
git mv "DSL CTX/archivio" archive/old-code
```

### Fase 10: Cleanup & Rimozione Cartella DSL CTX

```bash
# Verifica che DSL CTX sia vuota
ls "DSL CTX"

# Se vuota, rimuovi
git rm -r "DSL CTX"
```

### Fase 11: Creazione README per Ogni Cartella

```bash
# Creare README.md in:
# - web-app/
# - backend/n8n/
# - cli-tools/
# - cli-tools/dsl-creator/
# - cli-tools/dsl-tester/
# - dsl-library/
# - resources/
# - tests/
# - docs/
```

### Fase 12: Aggiornamento Riferimenti

- Aggiornare path in `docs/CLAUDE.md`
- Aggiornare import relativi in tutti i `.js`
- Aggiornare README principale
- Aggiornare GitHub Pages config (se necessario)

### Fase 13: Test Funzionali

```bash
# Test web app
open web-app/index.html

# Test CLI creator
cd cli-tools/dsl-creator
node bin/setup-check.js
node lib/workflow-simulator.js ../../resources/requirements/bonus-nido.txt

# Test CLI tester
cd ../dsl-tester
node bin/generate-tests.js ../../dsl-library/pratiche/bonus-nido.json
```

### Fase 14: Commit Finale

```bash
git add -A
git commit -m "Refactor: riorganizzazione completa struttura progetto

- Separa web-app, backend, cli-tools
- Centralizza documentazione in docs/
- DSL library standalone
- Test organizzati per componente
- Archive per file legacy

Breaking changes: tutti i path sono cambiati"

git tag v2.0-refactored
git push --tags
```

---

## 📄 README.md Principali da Creare

### 1. `/README.md` (Root - Aggiornato)

```markdown
# Mamma che info - Sistema Verifica Requisiti Pratiche Burocratiche

Piattaforma completa per verificare ammissibilità a pratiche burocratiche italiane usando DSL (Domain Specific Language).

## 🎯 Componenti

- **[Web App](web-app/)** - Interfaccia web per testare DSL
- **[Backend](backend/)** - Workflow N8N e servizi
- **[CLI Tools](cli-tools/)** - Tool riga comando per dev
- **[DSL Library](dsl-library/)** - Catalogo DSL produzione
- **[Docs](docs/)** - Documentazione completa

## 🚀 Quick Start

### Usa Web App
https://albertocabasvidani.github.io/Mamma-che-info/

### Genera DSL
```bash
cd cli-tools/dsl-creator
node lib/workflow-simulator.js ../../resources/checklists/bonus-nido.pdf
```

### Testa DSL
```bash
cd cli-tools/dsl-tester
node bin/generate-tests.js ../../dsl-library/pratiche/bonus-nido.json
```

## 📚 Documentazione
Vedi [docs/](docs/)
```

### 2. `web-app/README.md`

```markdown
# DSL Tester - Web App

App web per testare interattivamente DSL.

## Deploy
GitHub Pages: https://albertocabasvidani.github.io/Mamma-che-info/

## Sviluppo Locale
1. Apri `index.html` nel browser
2. Nessuna build richiesta
```

### 3. `cli-tools/README.md`

```markdown
# CLI Tools

Tool a riga di comando per sviluppatori.

## Componenti

- **[dsl-creator/](dsl-creator/)** - Genera DSL da requisiti
- **[dsl-tester/](dsl-tester/)** - Testa DSL generate

## Requisiti
- Node.js >= 18
- OpenAI API key (per dsl-creator)
```

### 4. `dsl-library/README.md`

```markdown
# DSL Library

Catalogo DSL produzione per pratiche burocratiche italiane.

## DSL Disponibili

| Nome | File | Versione |
|------|------|----------|
| Assegno Unico | [assegno-unico.json](pratiche/assegno-unico.json) | 1.0 |
| Bonus Nidi | [bonus-nido.json](pratiche/bonus-nido.json) | 1.0 |
| ... | ... | ... |

## Schema
Vedi [schemas/](schemas/)
```

---

## ✅ Checklist Migrazione Completa

- [ ] **Backup completo** (commit + tag)
- [ ] **Creare struttura cartelle**
- [ ] **Spostare web-app/**
- [ ] **Spostare backend/**
- [ ] **Spostare cli-tools/**
- [ ] **Spostare dsl-library/**
- [ ] **Spostare resources/**
- [ ] **Spostare tests/**
- [ ] **Spostare docs/**
- [ ] **Archiviare legacy**
- [ ] **Rimuovere DSL CTX/**
- [ ] **Creare README.md** per ogni cartella principale
- [ ] **Aggiornare path** in docs/CLAUDE.md
- [ ] **Aggiornare import** in file .js
- [ ] **Aggiornare .gitignore**
- [ ] **Testare web-app**
- [ ] **Testare cli-tools/dsl-creator**
- [ ] **Testare cli-tools/dsl-tester**
- [ ] **Verificare GitHub Pages**
- [ ] **Commit finale** + tag v2.0
- [ ] **Push su GitHub**
- [ ] **Aggiornare README.md** principale

---

## 🎓 Vantaggi Struttura Nuova

1. **Chiara separazione concerns**: Web vs Backend vs CLI vs Library
2. **Onboarding veloce**: Ogni cartella ha README con scope
3. **Scalabile**: Facile aggiungere nuovi componenti
4. **Professionale**: Struttura standard industry
5. **Deploy separati**: Web app, n8n, CLI distribuibili indipendentemente
6. **Testing organizzato**: Test per componente, non per tool
7. **Docs centralizzate**: Facile trovare info
8. **No duplicati**: Un solo index.html, un solo README per concetto

---

## 🤔 Domande Prima di Procedere

1. **Kong.yml è ancora usato?** Se no → archive
2. **Supabase è attivo?** Se no → rimuovi riferimenti
3. **Chatbot CAF è integrato?** O è progetto separato?
4. **dsl-tester.html** in DSL CTX è diverso da index.html? Se identico → elimina
5. **GitHub Pages** punta a index.html root? Dovrà puntare a web-app/index.html
6. **Migrazione in una volta o incrementale?**

---

**Pronto per procedere?** Fammi sapere se vuoi:
- **A)** Eseguire migrazione automatica con script
- **B)** Procedere manualmente step-by-step
- **C)** Modificare prima la struttura proposta
