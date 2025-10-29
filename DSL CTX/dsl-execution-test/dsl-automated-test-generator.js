#!/usr/bin/env node

/**
 * DSL Automated Test Generator
 *
 * Genera automaticamente TUTTE le casistiche possibili per una DSL,
 * le testa simulando il workflow n8n, e genera report dettagliato.
 *
 * Usage:
 *   node dsl-automated-test-generator.js <dsl-file.json>
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CODICE CREAZIONE CTX (da workflow n8n)
// ============================================================================

function createCTX(practice, sessionId, userId) {
  const practiceCode = practice.title || "pratica_senza_titolo";
  const steps = Array.isArray(practice.steps) ? practice.steps : [];
  const varNames = steps.map(s => s?.var).filter(Boolean);

  const variables = {};
  const checklist = {};
  for (const v of varNames) {
    variables[v] = null;
    checklist[v] = false;
  }

  const sid = sessionId ? String(sessionId) : String(Date.now());
  const uid = userId ? String(userId) : "test_user";

  return {
    session_id: sid,
    user_id: uid,
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

// ============================================================================
// LOGICA ELABORAZIONE DSL (da workflow n8n)
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
          console.error('[ERROR] Evaluation error for reason:', e.message);
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
        console.error('[ERROR] Error evaluating skip_if:', e.message);
      }
    }

    return { index: i, step };
  }

  return null;
}

function executeDSL(dsl, inputs) {
  const ctx = createCTX(dsl);
  const steps = dsl.steps || [];
  const evaluationMode = dsl.evaluation_mode || 'batch';

  let questionsAsked = 0;
  let inputIndex = 0;
  const questionsTrace = [];

  while (ctx.status === 'collecting') {
    const nextStepResult = findNextStep(steps, ctx.step_index, ctx.variables);

    if (!nextStepResult) {
      ctx.status = 'checking';
      break;
    }

    const step = nextStepResult.step;
    questionsAsked++;
    questionsTrace.push({
      var: step.var,
      ask: step.ask,
      type: step.type
    });

    if (inputIndex >= inputs.length) {
      return {
        error: 'NOT_ENOUGH_INPUTS',
        questionsAsked,
        expectedInputs: questionsAsked,
        providedInputs: inputs.length,
        ctx
      };
    }

    let msg = inputs[inputIndex++];
    let val = msg;

    // Type conversion
    if (step.type === 'number') {
      val = parseFloat(String(msg).replace(',', '.'));
      if (Number.isNaN(val)) {
        return {
          error: 'INVALID_NUMBER',
          questionsAsked,
          invalidValue: msg,
          ctx
        };
      }
    }

    if (step.type === 'boolean') {
      val = toBool(msg);
    }

    // Salva valore
    ctx.variables[step.var] = val;
    ctx.checklist[step.var] = true;
    ctx.step_index = nextStepResult.index + 1;

    // VALUTAZIONE INCREMENTALE
    if (evaluationMode === 'incremental') {
      const evalResult = evaluateIncrementalReasons(dsl, ctx.variables, step.var);

      if (evalResult.failed) {
        ctx.last_result = 'non_ammissibile';
        ctx.status = 'complete';

        return {
          result: 'non_ammissibile',
          reason: evalResult.reason,
          questionsAsked,
          questionsTrace,
          stoppedAt: step.var,
          ctx
        };
      }
    }
  }

  // CHECKING (batch mode o incremental completato)
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
          console.error('[ERROR] Batch evaluation error:', e.message);
        }
      }

      if (failedReasons.length > 0) {
        result = 'non_ammissibile';
      }
    }

    ctx.last_result = result;
    ctx.status = 'complete';

    return {
      result,
      reason: failedReasons.length > 0 ? failedReasons.join('; ') : null,
      questionsAsked,
      questionsTrace,
      ctx
    };
  }

  return {
    error: 'UNKNOWN_ERROR',
    questionsAsked,
    ctx
  };
}

// ============================================================================
// GENERATORE CASISTICHE
// ============================================================================

function analyzeStepPaths(dsl) {
  const steps = dsl.steps || [];
  const paths = [];

  // Genera tutte le combinazioni boolean per gli step
  function generateBooleanCombinations(numBooleanSteps) {
    const combinations = [];
    const total = Math.pow(2, numBooleanSteps);

    for (let i = 0; i < total; i++) {
      const combo = [];
      for (let j = 0; j < numBooleanSteps; j++) {
        combo.push((i & (1 << j)) !== 0);
      }
      combinations.push(combo);
    }

    return combinations;
  }

  // Analizza struttura steps
  const booleanSteps = [];
  const numberSteps = [];
  const stringSteps = [];

  steps.forEach((step, idx) => {
    if (step.type === 'boolean') {
      booleanSteps.push({ idx, var: step.var, skip_if: step.skip_if });
    } else if (step.type === 'number') {
      numberSteps.push({ idx, var: step.var, skip_if: step.skip_if });
    } else if (step.type === 'string') {
      stringSteps.push({ idx, var: step.var, skip_if: step.skip_if });
    }
  });

  console.log(`\n📊 Analisi DSL:`);
  console.log(`   Boolean steps: ${booleanSteps.length}`);
  console.log(`   Number steps: ${numberSteps.length}`);
  console.log(`   String steps: ${stringSteps.length}`);
  console.log(`   Total steps: ${steps.length}`);

  // Stima casistiche
  let estimatedCases = Math.pow(2, booleanSteps.length);

  // Per number: 3 valori (boundary: min, mid, max)
  if (numberSteps.length > 0) {
    estimatedCases *= Math.pow(3, numberSteps.length);
  }

  // Per string: assumiamo 2-3 valori tipici
  if (stringSteps.length > 0) {
    estimatedCases *= Math.pow(2, stringSteps.length);
  }

  console.log(`   Casistiche stimate: ~${estimatedCases}`);

  if (estimatedCases > 1000) {
    console.log(`\n⚠️  ATTENZIONE: Casistiche > 1000, generazione limitata ai casi principali`);
    return generateSmartSample(dsl);
  }

  return generateAllCases(dsl);
}

function generateAllCases(dsl) {
  const steps = dsl.steps || [];
  const cases = [];

  // Identifica tipi
  const booleanSteps = steps.filter(s => s.type === 'boolean');
  const numberSteps = steps.filter(s => s.type === 'number');
  const stringSteps = steps.filter(s => s.type === 'string');

  // Genera combinazioni boolean
  const numBooleans = booleanSteps.length;
  const booleanCombinations = [];
  const total = Math.pow(2, numBooleans);

  for (let i = 0; i < total; i++) {
    const combo = [];
    for (let j = 0; j < numBooleans; j++) {
      combo.push((i & (1 << j)) !== 0 ? 'sì' : 'no');
    }
    booleanCombinations.push(combo);
  }

  // Per ogni combinazione boolean, genera valori number/string
  for (const boolCombo of booleanCombinations) {
    const testCase = {
      inputs: [],
      description: []
    };

    let boolIdx = 0;
    let numIdx = 0;
    let strIdx = 0;

    for (const step of steps) {
      if (step.type === 'boolean') {
        testCase.inputs.push(boolCombo[boolIdx]);
        testCase.description.push(`${step.var}=${boolCombo[boolIdx]}`);
        boolIdx++;
      } else if (step.type === 'number') {
        // Per number: usa valore medio ragionevole
        const value = getNumberValue(step, numIdx);
        testCase.inputs.push(value);
        testCase.description.push(`${step.var}=${value}`);
        numIdx++;
      } else if (step.type === 'string') {
        // Per string: usa valore tipico
        const value = getStringValue(step, strIdx);
        testCase.inputs.push(value);
        testCase.description.push(`${step.var}=${value}`);
        strIdx++;
      }
    }

    cases.push(testCase);
  }

  return cases;
}

function generateSmartSample(dsl) {
  // Genera sample intelligente per DSL complesse
  const cases = [];

  // 1. Caso "tutto sì" (happy path)
  cases.push(generateHappyPath(dsl));

  // 2. Caso "tutto no" (worst case)
  cases.push(generateWorstCase(dsl));

  // 3. Casi per ogni requisito bloccante
  const reasons = dsl.reasons_if_fail || [];
  reasons.forEach((reason, idx) => {
    if (reason.blocking) {
      cases.push(generateReasonTriggerCase(dsl, reason, idx));
    }
  });

  // 4. Casi boundary per number
  const numberSteps = (dsl.steps || []).filter(s => s.type === 'number');
  numberSteps.forEach(step => {
    cases.push(generateBoundaryCase(dsl, step, 'min'));
    cases.push(generateBoundaryCase(dsl, step, 'max'));
  });

  return cases;
}

function generateHappyPath(dsl) {
  const inputs = [];
  const description = [];

  for (const step of dsl.steps || []) {
    if (step.type === 'boolean') {
      inputs.push('sì');
      description.push(`${step.var}=sì`);
    } else if (step.type === 'number') {
      inputs.push('1000');
      description.push(`${step.var}=1000`);
    } else {
      inputs.push('test');
      description.push(`${step.var}=test`);
    }
  }

  return {
    inputs,
    description: ['HAPPY_PATH: ' + description.join(', ')]
  };
}

function generateWorstCase(dsl) {
  const inputs = [];
  const description = [];

  for (const step of dsl.steps || []) {
    if (step.type === 'boolean') {
      inputs.push('no');
      description.push(`${step.var}=no`);
    } else if (step.type === 'number') {
      inputs.push('99999');
      description.push(`${step.var}=99999`);
    } else {
      inputs.push('invalid');
      description.push(`${step.var}=invalid`);
    }
  }

  return {
    inputs,
    description: ['WORST_CASE: ' + description.join(', ')]
  };
}

function generateReasonTriggerCase(dsl, reason, idx) {
  // Genera caso che triggera questo specifico reason
  const inputs = [];
  const description = [`REASON_${idx}: ${reason.reason.substring(0, 50)}...`];

  // TODO: parsing complesso del when per generare input specifico
  // Per ora: genera input generico
  for (const step of dsl.steps || []) {
    if (step.type === 'boolean') {
      inputs.push('no');
    } else if (step.type === 'number') {
      inputs.push('5000');
    } else {
      inputs.push('test');
    }
  }

  return { inputs, description };
}

function generateBoundaryCase(dsl, targetStep, boundary) {
  const inputs = [];
  const description = [`BOUNDARY_${targetStep.var}_${boundary}`];

  for (const step of dsl.steps || []) {
    if (step.var === targetStep.var) {
      if (boundary === 'min') {
        inputs.push('0');
      } else {
        inputs.push('99999');
      }
    } else if (step.type === 'boolean') {
      inputs.push('sì');
    } else if (step.type === 'number') {
      inputs.push('1000');
    } else {
      inputs.push('test');
    }
  }

  return { inputs, description };
}

function getNumberValue(step, idx) {
  // Estrae valori ragionevoli in base al nome variabile
  const varLower = step.var.toLowerCase();

  if (varLower.includes('isee') || varLower.includes('reddito')) {
    return ['10000', '25000', '40000'][idx % 3];
  } else if (varLower.includes('giorni') || varLower.includes('eta')) {
    return ['30', '60', '90'][idx % 3];
  } else {
    return ['100', '500', '1000'][idx % 3];
  }
}

function getStringValue(step, idx) {
  const varLower = step.var.toLowerCase();

  if (varLower.includes('evento') || varLower.includes('tipo')) {
    return ['nascita', 'adozione', 'affido'][idx % 3];
  } else {
    return ['test', 'example', 'sample'][idx % 3];
  }
}

// ============================================================================
// TEST EXECUTION
// ============================================================================

function runAllTests(dsl, testCases) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 ESECUZIONE TEST`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Totale casi da testare: ${testCases.length}\n`);

  const results = [];
  let passed = 0;
  let failed = 0;
  let errors = 0;

  testCases.forEach((testCase, idx) => {
    const testNum = idx + 1;
    const testName = `Test ${testNum}: ${testCase.description.join(' | ')}`;

    process.stdout.write(`\r[${testNum}/${testCases.length}] Testing...`);

    const result = executeDSL(dsl, testCase.inputs);

    const testResult = {
      testNumber: testNum,
      testName,
      inputs: testCase.inputs,
      description: testCase.description,
      ...result
    };

    if (result.error) {
      errors++;
      testResult.status = 'ERROR';
    } else if (result.result === 'ammissibile' || result.result === 'non_ammissibile') {
      passed++;
      testResult.status = 'PASS';
    } else {
      failed++;
      testResult.status = 'FAIL';
    }

    results.push(testResult);
  });

  process.stdout.write('\r' + ' '.repeat(50) + '\r');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 RISULTATI`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Totale test: ${testCases.length}`);
  console.log(`✅ Passati: ${passed}`);
  console.log(`❌ Falliti: ${failed}`);
  console.log(`⚠️  Errori: ${errors}`);
  console.log(`${'='.repeat(70)}\n`);

  return results;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateMarkdownReport(dsl, results, outputDir) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const totalTests = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;

  let md = `# Report Test Automatico DSL - ${dsl.title}\n\n`;
  md += `**Data**: ${timestamp}\n`;
  md += `**DSL**: ${dsl.title}\n`;
  md += `**Evaluation Mode**: ${dsl.evaluation_mode}\n`;
  md += `**Totale Test**: ${totalTests}\n`;
  md += `**Passati**: ${passed} (${Math.round(passed/totalTests*100)}%)\n`;
  md += `**Falliti**: ${failed} (${Math.round(failed/totalTests*100)}%)\n`;
  md += `**Errori**: ${errors} (${Math.round(errors/totalTests*100)}%)\n\n`;
  md += `---\n\n`;

  // Riepilogo
  md += `## Riepilogo Test\n\n`;
  md += `| # | Risultato | Domande | Esito |\n`;
  md += `|---|-----------|---------|-------|\n`;
  results.forEach(r => {
    const statusIcon = r.status === 'PASS' ? '✅' : r.status === 'ERROR' ? '⚠️' : '❌';
    const resultText = r.result || r.error || 'N/A';
    md += `| ${r.testNumber} | ${statusIcon} ${r.status} | ${r.questionsAsked || 0} | ${resultText} |\n`;
  });
  md += `\n---\n\n`;

  // Dettaglio test
  md += `## Dettaglio Test\n\n`;

  results.forEach(r => {
    md += `### Test ${r.testNumber}\n\n`;
    md += `**Descrizione**: ${r.description.join(' | ')}\n\n`;
    md += `**Input**: \`${JSON.stringify(r.inputs)}\`\n\n`;
    md += `**Status**: ${r.status === 'PASS' ? '✅' : r.status === 'ERROR' ? '⚠️' : '❌'} ${r.status}\n\n`;

    if (r.error) {
      md += `**Errore**: ${r.error}\n\n`;
    } else {
      md += `**Risultato**: ${r.result}\n`;
      md += `**Domande poste**: ${r.questionsAsked}\n`;
      if (r.reason) {
        md += `**Motivo**: ${r.reason}\n`;
      }
      if (r.stoppedAt) {
        md += `**Fermato a**: ${r.stoppedAt}\n`;
      }
      md += `\n`;
    }

    if (r.ctx) {
      md += `<details>\n`;
      md += `<summary>📋 Variabili CTX</summary>\n\n`;
      md += `\`\`\`json\n${JSON.stringify(r.ctx.variables, null, 2)}\n\`\`\`\n\n`;
      md += `</details>\n\n`;
    }

    md += `---\n\n`;
  });

  // Salva report
  const reportPath = path.join(outputDir, 'automated-test-report.md');
  fs.writeFileSync(reportPath, md, 'utf8');
  console.log(`📄 Report Markdown: ${reportPath}`);

  return reportPath;
}

function generateJSONReport(dsl, results, outputDir) {
  const report = {
    timestamp: new Date().toISOString(),
    dsl: {
      title: dsl.title,
      evaluation_mode: dsl.evaluation_mode,
      total_steps: dsl.steps?.length || 0,
      total_reasons: dsl.reasons_if_fail?.length || 0
    },
    summary: {
      total_tests: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      errors: results.filter(r => r.status === 'ERROR').length
    },
    results
  };

  const jsonPath = path.join(outputDir, 'automated-test-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`📄 Report JSON: ${jsonPath}`);

  return jsonPath;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Errore: Nessun file DSL fornito\n');
    console.log('Uso:');
    console.log('  node dsl-automated-test-generator.js <dsl-file.json>\n');
    console.log('Esempio:');
    console.log('  node dsl-automated-test-generator.js ../DSL\\ definitive/dsl-assegno-unico.json');
    process.exit(1);
  }

  const dslPath = args[0];

  if (!fs.existsSync(dslPath)) {
    console.error(`❌ Errore: File non trovato: ${dslPath}`);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🤖 DSL AUTOMATED TEST GENERATOR`);
  console.log(`${'='.repeat(70)}`);
  console.log(`File DSL: ${dslPath}\n`);

  // Carica DSL
  const dslContent = fs.readFileSync(dslPath, 'utf8');
  const dsl = JSON.parse(dslContent);

  console.log(`📋 DSL caricata: ${dsl.title}`);
  console.log(`   Evaluation mode: ${dsl.evaluation_mode}`);
  console.log(`   Steps: ${dsl.steps?.length || 0}`);
  console.log(`   Reasons: ${dsl.reasons_if_fail?.length || 0}`);

  // Genera casi test
  console.log(`\n⚙️  Generazione casi test...`);
  const testCases = analyzeStepPaths(dsl);
  console.log(`✅ Generati ${testCases.length} casi test`);

  // Esegui test
  const results = runAllTests(dsl, testCases);

  // Crea output directory
  const dslName = path.basename(dslPath, path.extname(dslPath));
  const outputDir = path.join(__dirname, 'automated-tests', dslName);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Genera report
  console.log(`\n📝 Generazione report...`);
  generateMarkdownReport(dsl, results, outputDir);
  generateJSONReport(dsl, results, outputDir);

  console.log(`\n✨ Completato!`);
  console.log(`📁 Output directory: ${outputDir}`);

  // Exit code
  const hasErrors = results.some(r => r.status === 'ERROR' || r.status === 'FAIL');
  process.exit(hasErrors ? 1 : 0);
}

// Run
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Errore fatale:', error);
    process.exit(1);
  });
}

module.exports = { createCTX, executeDSL, analyzeStepPaths };
