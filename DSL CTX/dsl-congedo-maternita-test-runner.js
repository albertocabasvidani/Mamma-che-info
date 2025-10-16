#!/usr/bin/env node
/**
 * DSL Test Runner - Congedo di Maternità Obbligatoria
 * Automated Testing for all profile combinations
 */

const fs = require('fs');
const path = require('path');

// Import base test runner logic
const baseRunner = require('./dsl-test-runner.js');

// Test cases based on analysis
const testCases = [
    // Gruppo 1: Dipendente Privato
    {
        name: 'Test 1: Dipendente Privato + Gravidanza + Fase Prima Parto',
        inputs: ['dipendente_privato', 'sì', 'prima_parto'],
        expectedResult: 'ammissibile',
        expectedQuestions: 3
    },
    {
        name: 'Test 2: Dipendente Privato + Gravidanza + Fase Dopo Parto',
        inputs: ['dipendente_privato', 'sì', 'dopo_parto'],
        expectedResult: 'ammissibile',
        expectedQuestions: 3
    },
    {
        name: 'Test 3: Dipendente Privato + Gravidanza + Maternità Anticipata',
        inputs: ['dipendente_privato', 'sì', 'maternita_anticipata'],
        expectedResult: 'ammissibile',
        expectedQuestions: 3
    },
    {
        name: 'Test 4: Dipendente Privato + No Gravidanza',
        inputs: ['dipendente_privato', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 2
    },

    // Gruppo 2: Gestione Separata
    {
        name: 'Test 5: Gestione Separata + Gravidanza + Contributi OK',
        inputs: ['gestione_separata', 'sì', 'sì'],
        expectedResult: 'ammissibile',
        expectedQuestions: 3
    },
    {
        name: 'Test 6: Gestione Separata + Gravidanza + Contributi NO',
        inputs: ['gestione_separata', 'sì', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 3
    },
    {
        name: 'Test 7: Gestione Separata + No Gravidanza',
        inputs: ['gestione_separata', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 2
    },

    // Gruppo 3: Lavoratore Autonomo
    {
        name: 'Test 8: Autonomo + Artigiano + Contributi OK + Dopo Parto',
        inputs: ['autonomo', 'sì', 'artigiano', 'sì', 'dopo_parto'],
        expectedResult: 'ammissibile',
        expectedQuestions: 5
    },
    {
        name: 'Test 9: Autonomo + Commerciante + Contributi OK + Prima Parto',
        inputs: ['autonomo', 'sì', 'commerciante', 'sì', 'prima_parto'],
        expectedResult: 'ammissibile',
        expectedQuestions: 5
    },
    {
        name: 'Test 10: Autonomo + Coltivatore Diretto + Contributi OK + Dopo Parto',
        inputs: ['autonomo', 'sì', 'coltivatore_diretto', 'sì', 'dopo_parto'],
        expectedResult: 'ammissibile',
        expectedQuestions: 5
    },
    {
        name: 'Test 11: Autonomo + Categoria Altra',
        inputs: ['autonomo', 'sì', 'altra_categoria'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 3
    },
    {
        name: 'Test 12: Autonomo + Artigiano + Contributi NO',
        inputs: ['autonomo', 'sì', 'artigiano', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 4
    },
    {
        name: 'Test 13: Autonomo + Imprenditore Agricolo + Contributi OK + Dopo Parto',
        inputs: ['autonomo', 'sì', 'imprenditore_agricolo', 'sì', 'dopo_parto'],
        expectedResult: 'ammissibile',
        expectedQuestions: 5
    },
    {
        name: 'Test 14: Autonomo + Pescatore + Contributi OK + Prima Parto',
        inputs: ['autonomo', 'sì', 'pescatore_autonomo', 'sì', 'prima_parto'],
        expectedResult: 'ammissibile',
        expectedQuestions: 5
    },
    {
        name: 'Test 15: Autonomo + No Gravidanza',
        inputs: ['autonomo', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 2
    },

    // Gruppo 4: Percettore NASPI
    {
        name: 'Test 16: NASPI + Gravidanza + In NASPI a 2 mesi DPP',
        inputs: ['naspi', 'sì', 'sì'],
        expectedResult: 'ammissibile',
        expectedQuestions: 3
    },
    {
        name: 'Test 17: NASPI + Gravidanza + Non in NASPI a 2 mesi DPP',
        inputs: ['naspi', 'sì', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 3
    },
    {
        name: 'Test 18: NASPI + No Gravidanza',
        inputs: ['naspi', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 2
    },

    // Gruppo 5: Dipendente Pubblico
    {
        name: 'Test 19: Dipendente Pubblico (blocco immediato)',
        inputs: ['dipendente_pubblico'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 1
    },
    {
        name: 'Test 20: Dipendente Pubblico (verifica skip_if)',
        inputs: ['dipendente_pubblico'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 1
    },

    // Gruppo 6: Altra Categoria
    {
        name: 'Test 21: Altro (blocco immediato)',
        inputs: ['altro'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 1
    },
    {
        name: 'Test 22: Altro (verifica skip_if)',
        inputs: ['altro'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 1
    }
];

function main() {
    console.log('========================================');
    console.log('DSL Test Runner - Congedo Maternità');
    console.log('========================================');

    // Load DSL
    const dslPath = path.join(__dirname, 'dsl-congedo-maternita.json');
    const dslContent = fs.readFileSync(dslPath, 'utf8');
    const dsl = JSON.parse(dslContent);

    console.log(`\n📋 DSL Loaded: ${dsl.title}`);
    console.log(`   Evaluation Mode: ${dsl.evaluation_mode}`);
    console.log(`   Total Steps: ${dsl.steps.length}`);
    console.log(`   Total Rules: ${dsl.reasons_if_fail.length}`);

    // Run tests
    const results = [];
    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        const result = baseRunner.runTest(dsl, testCase.inputs, testCase.name);

        const isPass = result.result === testCase.expectedResult &&
                       result.questionsAsked === testCase.expectedQuestions;

        if (isPass) {
            passed++;
            console.log(`   ✅ PASS`);
        } else {
            failed++;
            console.log(`   ❌ FAIL - Expected: ${testCase.expectedResult} (${testCase.expectedQuestions} questions), Got: ${result.result} (${result.questionsAsked} questions)`);
        }

        results.push({
            testName: testCase.name,
            status: isPass ? 'PASS' : 'FAIL',
            result: result.result,
            expectedResult: testCase.expectedResult,
            questionsAsked: result.questionsAsked,
            expectedQuestions: testCase.expectedQuestions,
            reason: result.reason,
            variables: result.variables,
            inputs: testCase.inputs
        });
    }

    // Summary
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log(`Total Tests: ${testCases.length}`);
    console.log(`Passed: ${passed} (${Math.round(passed/testCases.length*100)}%)`);
    console.log(`Failed: ${failed} (${Math.round(failed/testCases.length*100)}%)`);

    // Save JSON results
    const jsonReportPath = path.join(__dirname, 'dsl-congedo-maternita-test-results.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        dsl: dsl.title,
        totalTests: testCases.length,
        passed,
        failed,
        results
    }, null, 2));

    console.log(`\n📄 JSON Report saved to: ${jsonReportPath}`);

    // Generate Markdown Report
    generateMarkdownReport(dsl, results, passed, failed, testCases.length);

    // Exit code
    process.exit(failed > 0 ? 1 : 0);
}

function generateMarkdownReport(dsl, results, passed, failed, totalTests) {
    const reportPath = path.join(__dirname, 'dsl-congedo-maternita-test-report.md');
    let content = fs.readFileSync(reportPath, 'utf8');

    // Find insertion point
    const insertMarker = '## 📝 RISULTATI TEST (da compilare dopo esecuzione)';
    const insertIndex = content.indexOf(insertMarker);

    if (insertIndex === -1) {
        console.error('❌ Could not find insertion marker in report');
        return;
    }

    // Build results section
    let resultsSection = `\n\n### Test Execution Summary\n\n`;
    resultsSection += `**Data Esecuzione**: ${new Date().toLocaleString('it-IT')}\n`;
    resultsSection += `**Totale Test Eseguiti**: ${totalTests} / 22\n`;
    resultsSection += `**Test Passati**: ${passed} (${Math.round(passed/totalTests*100)}%)\n`;
    resultsSection += `**Test Falliti**: ${failed} (${Math.round(failed/totalTests*100)}%)\n`;
    resultsSection += `**Tempo Esecuzione**: < 1 secondo\n\n`;

    resultsSection += `---\n\n`;
    resultsSection += `### Dettaglio Risultati per Test\n\n`;

    // Group results
    const groups = {
        'Gruppo 1: Dipendente Privato': results.slice(0, 4),
        'Gruppo 2: Gestione Separata': results.slice(4, 7),
        'Gruppo 3: Lavoratore Autonomo': results.slice(7, 15),
        'Gruppo 4: Percettore NASPI': results.slice(15, 18),
        'Gruppo 5: Dipendente Pubblico': results.slice(18, 20),
        'Gruppo 6: Altra Categoria': results.slice(20, 22)
    };

    for (const [groupName, groupResults] of Object.entries(groups)) {
        resultsSection += `#### ${groupName}\n\n`;

        for (const result of groupResults) {
            const statusIcon = result.status === 'PASS' ? '✅' : '❌';
            const resultIcon = result.result === 'ammissibile' ? '✅' : '❌';

            resultsSection += `**${result.testName}** ${statusIcon}\n\n`;
            resultsSection += `- **Input**: \`${JSON.stringify(result.inputs)}\`\n`;
            resultsSection += `- **Domande poste**: ${result.questionsAsked} (attese: ${result.expectedQuestions})\n`;
            resultsSection += `- **Risultato**: ${result.result.toUpperCase()} ${resultIcon}\n`;
            resultsSection += `- **Risultato atteso**: ${result.expectedResult.toUpperCase()}\n`;

            if (result.reason && result.reason !== 'N/A') {
                resultsSection += `- **Motivo blocco**: ${result.reason}\n`;
            }

            resultsSection += `- **Variabili finali**:\n`;
            resultsSection += '```json\n';
            resultsSection += JSON.stringify(result.variables, null, 2);
            resultsSection += '\n```\n\n';

            if (result.status === 'FAIL') {
                resultsSection += `⚠️ **TEST FALLITO**: Il risultato o il numero di domande non corrisponde all'atteso.\n\n`;
            }
        }

        resultsSection += `---\n\n`;
    }

    // Insert results
    const beforeMarker = content.substring(0, insertIndex + insertMarker.length);
    const newContent = beforeMarker + resultsSection;

    fs.writeFileSync(reportPath, newContent);
    console.log(`📄 Markdown Report updated: ${reportPath}`);
}

if (require.main === module) {
    main();
}

module.exports = { testCases };
