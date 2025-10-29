#!/bin/bash

# Script Migrazione Struttura Progetto "Mamma che info"
# Riorganizza la struttura completa del progetto

set -e  # Exit on error

echo "========================================================================"
echo "🚀 MIGRAZIONE STRUTTURA PROGETTO - Mamma che info"
echo "========================================================================"
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directory base
BASE_DIR="/mnt/c/claude-code/Mamma che info"
cd "$BASE_DIR"

echo -e "${BLUE}📍 Directory corrente: $(pwd)${NC}"
echo ""

# ============================================================================
# FASE 0: BACKUP
# ============================================================================

echo -e "${YELLOW}[FASE 0] Creazione backup sicurezza${NC}"
git add -A
git commit -m "Backup: pre-ristrutturazione completa" || echo "Nessuna modifica da committare"
git tag v1.0-pre-refactor 2>/dev/null || echo "Tag già esistente"
echo -e "${GREEN}✅ Backup completato${NC}"
echo ""

# ============================================================================
# FASE 1: CREAZIONE STRUTTURA
# ============================================================================

echo -e "${YELLOW}[FASE 1] Creazione nuova struttura cartelle${NC}"

mkdir -p web-app/{assets,examples}
mkdir -p backend/{n8n/{workflows,nodes},api-gateway}
mkdir -p cli-tools/dsl-creator/{bin,lib,config}
mkdir -p cli-tools/dsl-tester/{bin,lib,templates}
mkdir -p dsl-library/{schemas,pratiche,changelog}
mkdir -p resources/{checklists,requirements,vademecum}
mkdir -p tests/cli-tools/{dsl-creator,dsl-tester}
mkdir -p docs/{project,architecture,guides,api,integrations}
mkdir -p archive/{old-code,old-tests,old-docs,deprecated}

echo -e "${GREEN}✅ Struttura cartelle creata${NC}"
echo ""

# ============================================================================
# FASE 2: WEB APP
# ============================================================================

echo -e "${YELLOW}[FASE 2] Migrazione Web App${NC}"

git mv index.html web-app/index.html
echo -e "${GREEN}✅ index.html → web-app/${NC}"
echo ""

# ============================================================================
# FASE 3: BACKEND
# ============================================================================

echo -e "${YELLOW}[FASE 3] Migrazione Backend${NC}"

# N8N Nodes
git mv "DSL CTX/dsl-creation-test/nodo-code-generazione-prompt.js" backend/n8n/nodes/generate-prompt.js
git mv "DSL CTX/dsl-creation-test/dsl-schema-validator.js" backend/n8n/nodes/validate-dsl.js
git mv "DSL CTX/dsl-execution-test/codice elaborazione DSL incrementale.txt" backend/n8n/nodes/process-dsl.js
git mv "DSL CTX/test/codice creazione CTX  15-10-2025.txt" backend/n8n/nodes/create-ctx.js
echo -e "${GREEN}✅ N8N nodes migrati${NC}"

# API Gateway (archiviato - non usato)
git mv kong.yml archive/deprecated/kong.yml
echo -e "${GREEN}✅ kong.yml → archive (non usato)${NC}"
echo ""

# ============================================================================
# FASE 4: CLI TOOLS
# ============================================================================

echo -e "${YELLOW}[FASE 4] Migrazione CLI Tools${NC}"

# DSL Creator
git mv "DSL CTX/dsl-creation-test/n8n-workflow-simulator.js" cli-tools/dsl-creator/lib/workflow-simulator.js
git mv "DSL CTX/dsl-creation-test/dsl-validator-service.js" cli-tools/dsl-creator/lib/schema-validator.js
git mv "DSL CTX/dsl-creation-test/test-setup.js" cli-tools/dsl-creator/bin/setup-check.js
git mv "DSL CTX/dsl-creation-test/dsl-creation-test-runner.js" archive/old-code/dsl-creation-test-runner.js
echo -e "${GREEN}✅ DSL Creator tools migrati${NC}"

# DSL Tester
git mv "DSL CTX/dsl-execution-test/dsl-test-runner.js" cli-tools/dsl-tester/lib/test-runner.js
git mv "DSL CTX/dsl-execution-test/dsl-automated-test-generator.js" cli-tools/dsl-tester/bin/generate-tests.js
echo -e "${GREEN}✅ DSL Tester tools migrati${NC}"
echo ""

# ============================================================================
# FASE 5: DSL LIBRARY
# ============================================================================

echo -e "${YELLOW}[FASE 5] Migrazione DSL Library${NC}"

# DSL Pratiche
git mv "DSL CTX/DSL definitive/dsl-assegno-unico.json" dsl-library/pratiche/assegno-unico.json
git mv "DSL CTX/DSL definitive/bonus-nuovi-nati-completo.json" dsl-library/pratiche/bonus-nuovi-nati.json
git mv "DSL CTX/DSL definitive/dsl-congedo-maternita.json" dsl-library/pratiche/congedo-maternita.json
git mv "DSL CTX/dsl-creation-test/tests/checklist-bonus-nido-text/dsl-generated.json" dsl-library/pratiche/bonus-nido.json
echo -e "${GREEN}✅ DSL pratiche migrate${NC}"

# DSL Schemas
git mv "DSL CTX/schema-dsl-incrementale.json" dsl-library/schemas/schema-incremental.json
git mv "DSL CTX/schema-dsl-semplice-incrementale.json" dsl-library/schemas/schema-batch.json
echo -e "${GREEN}✅ DSL schemas migrati${NC}"
echo ""

# ============================================================================
# FASE 6: RESOURCES
# ============================================================================

echo -e "${YELLOW}[FASE 6] Migrazione Resources${NC}"

# Checklists
git mv "DSL CTX/dsl-creation-test/checklist linguaggio naturale" resources/checklists
echo -e "${GREEN}✅ Checklists migrate${NC}"

# Requirements
git mv "DSL CTX/dsl-creation-test/checklist-bonus-nido-text.txt" resources/requirements/bonus-nido.txt
git mv "DSL CTX/test requisiti congedo di maternità.txt" resources/requirements/congedo-maternita.txt
git mv "DSL CTX/dsl-creation-test/test-requisiti-semplice.txt" resources/requirements/esempio-semplice.txt
git mv "DSL CTX/requisiti-congedo-maternita.md" resources/requirements/congedo-maternita.md
echo -e "${GREEN}✅ Requirements migrati${NC}"

# Vademecum
if [ -f "DSL CTX/vademecum maternità.pdf" ]; then
    git mv "DSL CTX/vademecum maternità.pdf" resources/vademecum/maternita.pdf
    echo -e "${GREEN}✅ Vademecum migrati${NC}"
fi
echo ""

# ============================================================================
# FASE 7: TESTS
# ============================================================================

echo -e "${YELLOW}[FASE 7] Migrazione Tests${NC}"

# Test Creation
git mv "DSL CTX/dsl-creation-test/tests" tests/cli-tools/dsl-creator/
echo -e "${GREEN}✅ Test creation migrati${NC}"

# Test Execution
git mv "DSL CTX/dsl-execution-test/automated-tests" tests/cli-tools/dsl-tester/
echo -e "${GREEN}✅ Test execution migrati${NC}"

# Test manuali legacy → archive
git mv "DSL CTX/test/dsl-assegno-unico-test-runner.js" archive/old-tests/
git mv "DSL CTX/test/dsl-congedo-maternita-test-runner.js" archive/old-tests/
git mv "DSL CTX/test/dsl-assegno-unico-test-results.json" archive/old-tests/
git mv "DSL CTX/test/dsl-congedo-maternita-test-results.json" archive/old-tests/
git mv "DSL CTX/test/dsl-assegno-unico-test-report.md" archive/old-tests/
git mv "DSL CTX/test/dsl-congedo-maternita-test-report.md" archive/old-tests/
git mv "DSL CTX/test/test-results.json" archive/old-tests/
git mv "DSL CTX/test/test-report-playwright.md" archive/old-tests/
git mv "DSL CTX/test/automated-test-summary.md" archive/old-tests/
git mv "DSL CTX/test/TEST-RUNNER-README.md" archive/old-docs/
echo -e "${GREEN}✅ Test legacy archiviati${NC}"
echo ""

# ============================================================================
# FASE 8: DOCUMENTAZIONE
# ============================================================================

echo -e "${YELLOW}[FASE 8] Migrazione Documentazione${NC}"

# CLAUDE.md
git mv "DSL CTX/CLAUDE.md" docs/CLAUDE.md
echo -e "${GREEN}✅ CLAUDE.md → docs/${NC}"

# Architecture
git mv "DSL CTX/n8n-workflow-architecture.md" docs/architecture/n8n-workflow.md
git mv "DSL CTX/strategia-generazione-dsl-affidabile.md" docs/architecture/dsl-generation-strategy.md
git mv "DSL CTX/dsl-creation-test/n8n-workflow-setup-retry.md" docs/architecture/n8n-workflow-setup-retry.md
echo -e "${GREEN}✅ Architecture docs migrati${NC}"

# Guides
git mv "DSL CTX/linee-guida-compilazione-requisiti.md" docs/guides/requirements-extraction.md
git mv "DSL CTX/analisi-requisiti-assegno-unico.md" docs/guides/requirements-analysis-example.md
git mv "DSL CTX/dsl-creation-test/prompt creazione DSL.md" docs/guides/openai-prompts.md
git mv "DSL CTX/dsl-creation-test/README-SIMULATOR.md" docs/guides/dsl-creator-tool.md
git mv "DSL CTX/dsl-execution-test/README-AUTOMATED-GENERATOR.md" docs/guides/dsl-tester-tool.md
echo -e "${GREEN}✅ Guides migrati${NC}"

# Integrations (conservati anche se non usati)
git mv "Chatbot-CAF-Documentazione.md" docs/integrations/chatbot-caf.md
git mv "GUIDA_SUPABASE.md" docs/integrations/supabase-integration.md
git mv "Prompt-Generazione-DSL.md" docs/guides/prompt-generation-dsl.md
echo -e "${GREEN}✅ Integration docs migrati${NC}"
echo ""

# ============================================================================
# FASE 9: ARCHIVIO FILE OBSOLETI
# ============================================================================

echo -e "${YELLOW}[FASE 9] Archiviazione file obsoleti${NC}"

# Codice legacy
git mv "DSL CTX/test/codice elaborazione DSL 15-10-2025.txt" archive/old-code/
git mv "DSL CTX/test/esempio CTX  15-10-2025.txt" archive/old-code/
git mv "DSL CTX/test/esempio DSL  15-10-2025.txt" archive/old-code/
echo -e "${GREEN}✅ Codice legacy archiviato${NC}"

# File duplicati
git mv "DSL CTX/test/bonus-nuovi-nati.json" archive/old-code/bonus-nuovi-nati-duplicate.json
echo -e "${GREEN}✅ File duplicati archiviati${NC}"

# HTML duplicato
git rm "DSL CTX/dsl-execution-test/dsl-tester.html"
echo -e "${GREEN}✅ dsl-tester.html eliminato (duplicato di index.html)${NC}"

# Cartella archivio esistente
if [ -d "DSL CTX/archivio" ]; then
    git mv "DSL CTX/archivio" archive/old-legacy
    echo -e "${GREEN}✅ Cartella archivio esistente migrata${NC}"
fi
echo ""

# ============================================================================
# FASE 10: CLEANUP
# ============================================================================

echo -e "${YELLOW}[FASE 10] Cleanup cartelle vuote${NC}"

# Rimuovi cartelle DSL CTX rimaste vuote
if [ -d "DSL CTX/dsl-creation-test" ]; then
    rmdir "DSL CTX/dsl-creation-test" 2>/dev/null || echo "dsl-creation-test non vuota"
fi

if [ -d "DSL CTX/dsl-execution-test" ]; then
    rmdir "DSL CTX/dsl-execution-test" 2>/dev/null || echo "dsl-execution-test non vuota"
fi

if [ -d "DSL CTX/test" ]; then
    rmdir "DSL CTX/test" 2>/dev/null || echo "test non vuota"
fi

if [ -d "DSL CTX/DSL definitive" ]; then
    rmdir "DSL CTX/DSL definitive" 2>/dev/null || echo "DSL definitive non vuota"
fi

# Verifica se DSL CTX è vuota
if [ -z "$(ls -A 'DSL CTX' 2>/dev/null | grep -v '^\.')" ]; then
    git rm -r "DSL CTX"
    echo -e "${GREEN}✅ Cartella 'DSL CTX' rimossa (vuota)${NC}"
else
    echo -e "${YELLOW}⚠️  Cartella 'DSL CTX' non vuota, verifica contenuto:${NC}"
    ls -la "DSL CTX"
fi
echo ""

# ============================================================================
# FASE 11: VERIFICA
# ============================================================================

echo -e "${YELLOW}[FASE 11] Verifica migrazione${NC}"

echo "Nuova struttura:"
tree -L 2 -d . | head -40

echo ""
echo -e "${GREEN}✅ Migrazione completata!${NC}"
echo ""

# ============================================================================
# INFORMAZIONI FINALI
# ============================================================================

echo "========================================================================"
echo "📋 PROSSIMI STEP"
echo "========================================================================"
echo ""
echo "1. Crea README.md per ogni cartella principale"
echo "2. Aggiorna path in docs/CLAUDE.md"
echo "3. Aggiorna import in file .js"
echo "4. Testa funzionalità:"
echo "   - Web app: open web-app/index.html"
echo "   - CLI creator: cd cli-tools/dsl-creator && node bin/setup-check.js"
echo "   - CLI tester: cd cli-tools/dsl-tester && node bin/generate-tests.js"
echo ""
echo "5. Commit finale:"
echo "   git add -A"
echo "   git commit -m 'Refactor: riorganizzazione completa struttura'"
echo "   git tag v2.0-refactored"
echo "   git push --tags"
echo ""
echo "========================================================================"
