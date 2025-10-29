#!/usr/bin/env node

/**
 * N8N Workflow Simulator - Test DSL Generation Pipeline
 *
 * Simula esattamente il workflow n8n:
 * 1. Genera prompt usando nodo-code-generazione-prompt.js
 * 2. Chiama OpenAI GPT-4o
 * 3. Valida con dsl-schema-validator.js
 * 4. Loop retry se non valido
 * 5. Report dettagliato
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURAZIONE
// ============================================================================

// Carica variabili d'ambiente da .env
function loadEnv() {
  const envPath = path.join(__dirname, '.env');

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    lines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;

      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('❌ ERRORE: OPENAI_API_KEY non configurata');
  console.error('\nCrea file .env:');
  console.error('  OPENAI_API_KEY=sk-your-key-here');
  process.exit(1);
}

const OPENAI_CONFIG = {
  model: 'gpt-4o',
  temperature: 0,
  seed: 42,
  max_tokens: 4000
};

// ============================================================================
// SIMULAZIONE AMBIENTE N8N
// ============================================================================

/**
 * Simula il Code Node: Generazione Prompt
 * Usa esattamente il codice da nodo-code-generazione-prompt.js
 */
function simulatePromptGeneratorNode(inputData) {
  // Simula ambiente n8n
  const $env = {
    MAX_DSL_RETRIES: process.env.MAX_DSL_RETRIES
  };

  const $json = inputData;

  // Esegue il codice del nodo (caricato da file)
  const nodeCode = fs.readFileSync(
    path.join(__dirname, 'nodo-code-generazione-prompt.js'),
    'utf8'
  );

  // Esegue il codice in un contesto simulato
  const result = eval(`(function() { ${nodeCode} })()`);

  return result.json;
}

/**
 * Simula il Code Node: Validazione DSL
 * Usa esattamente il codice da dsl-schema-validator.js
 */
function simulateDSLValidatorNode(dslData, metadata) {
  // Simula ambiente n8n con struttura message.content
  const $input = {
    first: () => ({
      json: {
        message: {
          content: {
            dsl: dslData,
            tentativo_numero: metadata.tentativo_numero,
            max_tentativi: metadata.max_tentativi,
            requisiti_utente: metadata.requisiti_utente
          }
        }
      }
    })
  };

  // Esegue il codice del validator
  const validatorCode = fs.readFileSync(
    path.join(__dirname, 'dsl-schema-validator.js'),
    'utf8'
  );

  const result = eval(`(function() { ${validatorCode} })()`);

  return result;
}

/**
 * Simula chiamata OpenAI (come nodo OpenAI in n8n)
 */
async function simulateOpenAINode(systemPrompt, userMessage) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_CONFIG.model,
      temperature: OPENAI_CONFIG.temperature,
      seed: OPENAI_CONFIG.seed,
      max_tokens: OPENAI_CONFIG.max_tokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const parsed = JSON.parse(content);
    return parsed.dsl || parsed; // Supporta sia {dsl: {...}} che {...} diretto
  } catch (e) {
    throw new Error(`Invalid JSON from OpenAI: ${content}`);
  }
}

// ============================================================================
// WORKFLOW SIMULATION ENGINE
// ============================================================================

/**
 * Esegue il workflow completo n8n
 */
async function runWorkflow(requisiti, maxTentativi = 3) {
  const execution = {
    requisiti,
    maxTentativi,
    attempts: [],
    finalDSL: null,
    success: false,
    startTime: Date.now()
  };

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 WORKFLOW N8N SIMULATOR - DSL Generation Pipeline`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Requisiti: ${requisiti.substring(0, 80)}...`);
  console.log(`Max tentativi: ${maxTentativi}`);
  console.log();

  // Variabili workflow (simulate n8n data flow)
  let workflowData = {
    requisiti_utente: requisiti,
    max_tentativi: maxTentativi,
    tentativo_numero: 0 // Verrà incrementato dal nodo
  };

  let shouldRetry = true;
  let attemptCount = 0;

  while (shouldRetry && attemptCount < maxTentativi) {
    attemptCount++;

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📍 TENTATIVO ${attemptCount}/${maxTentativi}`);
    console.log(`${'─'.repeat(70)}`);

    const attempt = {
      number: attemptCount,
      type: attemptCount === 1 ? 'generazione' : 'correzione',
      timestamp: Date.now(),
      steps: []
    };

    try {
      // STEP 1: Nodo "Prepare Prompt"
      console.log(`\n[1] 🔧 Nodo: Prepare Prompt`);
      const promptData = simulatePromptGeneratorNode(workflowData);
      attempt.steps.push({
        node: 'Prepare Prompt',
        output: {
          tentativo_numero: promptData.tentativo_numero,
          mode: attemptCount === 1 ? 'generazione' : 'correzione'
        }
      });
      console.log(`    ✓ Tentativo: ${promptData.tentativo_numero}/${promptData.max_tentativi}`);
      console.log(`    ✓ Modalità: ${attemptCount === 1 ? 'GENERAZIONE' : 'CORREZIONE'}`);

      // STEP 2: Nodo "OpenAI"
      console.log(`\n[2] 🤖 Nodo: OpenAI (${OPENAI_CONFIG.model})`);
      console.log(`    ⏳ Chiamata in corso...`);
      const dsl = await simulateOpenAINode(promptData.systemPrompt, promptData.userMessage);
      attempt.steps.push({
        node: 'OpenAI',
        output: { dsl }
      });
      attempt.dsl = dsl;
      console.log(`    ✓ DSL generata (${JSON.stringify(dsl).length} caratteri)`);

      // STEP 3: Nodo "Validate DSL Schema"
      console.log(`\n[3] ✅ Nodo: Validate DSL Schema`);
      const validationResult = simulateDSLValidatorNode(dsl, {
        tentativo_numero: promptData.tentativo_numero,
        max_tentativi: promptData.max_tentativi,
        requisiti_utente: requisiti
      });
      attempt.steps.push({
        node: 'Validate DSL Schema',
        output: validationResult
      });
      attempt.validation = validationResult;

      if (validationResult.valid) {
        console.log(`    ✓ VALIDA! 🎉`);
        execution.finalDSL = dsl;
        execution.success = true;
        shouldRetry = false;
      } else {
        console.log(`    ✗ NON VALIDA - ${validationResult.errors?.length || 0} errori`);
        if (validationResult.errors) {
          validationResult.errors.forEach((err, i) => {
            console.log(`      ${i + 1}. ${err}`);
          });
        }

        // STEP 4: IF Node Decision
        console.log(`\n[4] 🔀 Nodo: IF (Check Retry)`);
        if (validationResult.retry) {
          console.log(`    ➜ Retry: TRUE - Loop back to Prepare Prompt`);
          // Prepara dati per prossimo tentativo (simula n8n pass-through)
          workflowData = {
            requisiti_utente: requisiti,
            max_tentativi: maxTentativi,
            tentativo_numero: promptData.tentativo_numero, // Incrementato dal nodo
            dsl_da_correggere: dsl,
            errori_validazione: validationResult.errors
          };
        } else {
          console.log(`    ➜ Retry: FALSE - Tentativi esauriti`);
          shouldRetry = false;
        }
      }

    } catch (error) {
      console.log(`    ❌ ERRORE: ${error.message}`);
      attempt.error = error.message;
      attempt.validation = {
        valid: false,
        errors: [error.message]
      };
      shouldRetry = false;
    }

    execution.attempts.push(attempt);
  }

  execution.endTime = Date.now();
  execution.duration = execution.endTime - execution.startTime;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 WORKFLOW COMPLETATO`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Risultato: ${execution.success ? '✅ DSL VALIDA' : '❌ DSL NON VALIDA'}`);
  console.log(`Tentativi: ${execution.attempts.length}/${maxTentativi}`);
  console.log(`Durata: ${(execution.duration / 1000).toFixed(2)}s`);
  console.log(`${'='.repeat(70)}\n`);

  return execution;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateMarkdownReport(execution, testName) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  let md = `# Report Test Workflow N8N - ${testName}\n\n`;
  md += `**Data**: ${timestamp}\n`;
  md += `**Modello**: ${OPENAI_CONFIG.model} (T=${OPENAI_CONFIG.temperature}, seed=${OPENAI_CONFIG.seed})\n`;
  md += `**Risultato**: ${execution.success ? '✅ **SUCCESSO**' : '❌ **FALLITO**'}\n`;
  md += `**Tentativi**: ${execution.attempts.length}/${execution.maxTentativi}\n`;
  md += `**Durata**: ${(execution.duration / 1000).toFixed(2)}s\n\n`;
  md += `---\n\n`;

  // Requisiti
  md += `## Requisiti Input\n\n`;
  md += `\`\`\`\n${execution.requisiti}\n\`\`\`\n\n`;
  md += `---\n\n`;

  // Tabella riepilogo
  md += `## Riepilogo Tentativi\n\n`;
  md += `| # | Tipo | Risultato | Errori | Note |\n`;
  md += `|---|------|-----------|--------|------|\n`;
  execution.attempts.forEach(att => {
    const result = att.validation?.valid ? '✅ Valida' : '❌ Non valida';
    const errCount = att.validation?.errors?.length || (att.error ? 1 : 0);
    const note = att.error ? 'Errore tecnico' : att.validation?.retry ? 'Retry' : att.validation?.valid ? 'Completato' : 'Esaurito';
    md += `| ${att.number} | ${att.type} | ${result} | ${errCount} | ${note} |\n`;
  });
  md += `\n---\n\n`;

  // Dettaglio workflow per tentativo
  md += `## Dettaglio Workflow per Tentativo\n\n`;

  execution.attempts.forEach(att => {
    md += `### Tentativo ${att.number}: ${att.type.charAt(0).toUpperCase() + att.type.slice(1)}\n\n`;

    // Steps del workflow
    if (att.steps.length > 0) {
      md += `**Pipeline Nodes eseguiti:**\n\n`;
      att.steps.forEach((step, idx) => {
        md += `${idx + 1}. **${step.node}**\n`;

        if (step.node === 'Prepare Prompt') {
          md += `   - Tentativo: ${step.output.tentativo_numero}\n`;
          md += `   - Modalità: ${step.output.mode}\n`;
        } else if (step.node === 'OpenAI') {
          md += `   - Caratteri generati: ${JSON.stringify(step.output.dsl).length}\n`;
        } else if (step.node === 'Validate DSL Schema') {
          md += `   - Valida: ${step.output.valid ? 'Sì ✅' : 'No ❌'}\n`;
          if (step.output.errors && step.output.errors.length > 0) {
            md += `   - Errori: ${step.output.errors.length}\n`;
          }
          md += `   - Retry flag: ${step.output.retry ? 'true' : 'false'}\n`;
        }
        md += `\n`;
      });
    }

    // Errori di validazione
    if (att.validation?.errors && att.validation.errors.length > 0) {
      md += `**Errori di Validazione:**\n\n`;
      att.validation.errors.forEach((err, i) => {
        md += `${i + 1}. ${err}\n`;
      });
      md += `\n`;
    }

    // DSL generata
    if (att.dsl) {
      md += `<details>\n`;
      md += `<summary>📄 DSL Generata (click per espandere)</summary>\n\n`;
      md += `\`\`\`json\n${JSON.stringify(att.dsl, null, 2)}\n\`\`\`\n\n`;
      md += `</details>\n\n`;
    }

    md += `---\n\n`;
  });

  // DSL finale (se valida)
  if (execution.success && execution.finalDSL) {
    md += `## DSL Finale Validata ✅\n\n`;
    md += `\`\`\`json\n${JSON.stringify(execution.finalDSL, null, 2)}\n\`\`\`\n\n`;

    // Statistiche DSL
    const stats = {
      steps: execution.finalDSL.steps?.length || 0,
      reasons: execution.finalDSL.reasons_if_fail?.length || 0,
      actions: execution.finalDSL.next_actions_if_ok?.length || 0
    };

    md += `**Statistiche DSL:**\n`;
    md += `- Steps: ${stats.steps}\n`;
    md += `- Conditions: ${stats.reasons}\n`;
    md += `- Actions: ${stats.actions}\n\n`;
    md += `---\n\n`;
  }

  // Conclusioni
  md += `## Conclusioni\n\n`;
  if (execution.success) {
    md += `✅ **Test SUPERATO**: DSL valida generata dopo ${execution.attempts.length} tentativo/i.\n\n`;
    md += `Il workflow ha dimostrato:\n`;
    md += `- Corretta simulazione dell'ambiente n8n\n`;
    md += `- Generazione prompt efficace\n`;
    md += `- Validazione schema rigorosa\n`;
    md += `- ${execution.attempts.length === 1 ? 'Generazione corretta al primo colpo' : 'Loop di retry funzionante'}\n`;
  } else {
    md += `❌ **Test FALLITO**: DSL non valida dopo ${execution.attempts.length} tentativo/i.\n\n`;
    const lastAttempt = execution.attempts[execution.attempts.length - 1];
    if (lastAttempt.validation?.errors) {
      md += `**Errori persistenti:**\n`;
      lastAttempt.validation.errors.forEach((err, i) => {
        md += `${i + 1}. ${err}\n`;
      });
    }
  }

  return md;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Errore: Nessun input fornito\n');
    console.log('Uso:');
    console.log('  node n8n-workflow-simulator.js <file-requisiti.txt>');
    console.log('  node n8n-workflow-simulator.js "Testo requisiti diretto"\n');
    console.log('Esempio:');
    console.log('  node n8n-workflow-simulator.js ../requisiti-congedo-maternita.md');
    process.exit(1);
  }

  const input = args.join(' ');
  let requisiti, testName;

  // Carica da file o usa testo diretto
  if (fs.existsSync(input) && fs.statSync(input).isFile()) {
    requisiti = fs.readFileSync(input, 'utf8').trim();
    testName = path.basename(input, path.extname(input));
    console.log(`📄 Input caricato da: ${input}`);
  } else {
    requisiti = input;
    testName = `test-${Date.now()}`;
    console.log(`📝 Input fornito direttamente`);
  }

  if (!requisiti || requisiti.length < 10) {
    console.error('❌ Errore: Requisiti troppo brevi o vuoti');
    process.exit(1);
  }

  // Esegui workflow
  const maxTentativi = parseInt(process.env.MAX_DSL_RETRIES || '3');
  const execution = await runWorkflow(requisiti, maxTentativi);

  // Salva risultati
  const testFolderName = testName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const testFolderPath = path.join(__dirname, 'tests', testFolderName);

  if (!fs.existsSync(testFolderPath)) {
    fs.mkdirSync(testFolderPath, { recursive: true });
  }

  // Report markdown
  const report = generateMarkdownReport(execution, testName);
  const reportPath = path.join(testFolderPath, 'workflow-execution-report.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`💾 Report salvato: tests/${testFolderName}/workflow-execution-report.md`);

  // DSL finale (se valida)
  if (execution.success && execution.finalDSL) {
    const dslPath = path.join(testFolderPath, 'dsl-generated.json');
    fs.writeFileSync(dslPath, JSON.stringify(execution.finalDSL, null, 2), 'utf8');
    console.log(`💾 DSL salvata: tests/${testFolderName}/dsl-generated.json`);
  }

  // Execution raw data (per debugging)
  const dataPath = path.join(testFolderPath, 'execution-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(execution, null, 2), 'utf8');
  console.log(`💾 Dati esecuzione: tests/${testFolderName}/execution-data.json`);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✨ Test completato: ${execution.success ? '✅ SUCCESSO' : '❌ FALLITO'}`);
  console.log(`📁 Cartella output: tests/${testFolderName}/`);
  console.log(`${'='.repeat(70)}\n`);

  process.exit(execution.success ? 0 : 1);
}

// Run
main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});
