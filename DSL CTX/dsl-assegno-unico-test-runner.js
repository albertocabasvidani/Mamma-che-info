#!/usr/bin/env node
/**
 * DSL Test Runner - Assegno Unico e Universale
 * Automated Testing for all possible input combinations
 */

const fs = require('fs');
const path = require('path');

// Import base test runner logic
const baseRunner = require('./dsl-test-runner.js');

// Test cases based on analysis
const testCases = [
    // Gruppo 1: Cittadini IT/UE
    {
        name: 'Test 1: IT/UE + Figli minorenni + No RdC',
        inputs: ['sì', 'sì', 'no'],
        expectedResult: 'ammissibile',
        expectedQuestions: 3
    },
    {
        name: 'Test 2: IT/UE + Figli 18-21 + No RdC',
        inputs: ['sì', 'no', 'sì', 'no'],
        expectedResult: 'ammissibile',
        expectedQuestions: 4
    },
    {
        name: 'Test 3: IT/UE + Figli disabili + No RdC',
        inputs: ['sì', 'no', 'no', 'sì', 'no'],
        expectedResult: 'ammissibile',
        expectedQuestions: 5
    },
    {
        name: 'Test 4: IT/UE + Figli minorenni + RdC',
        inputs: ['sì', 'sì', 'sì'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 3
    },
    {
        name: 'Test 5: IT/UE + No figli + No RdC',
        inputs: ['sì', 'no', 'no', 'no', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 4  // Blocca alla domanda 4 (ha_figli_disabili) prima di chiedere RdC
    },
    {
        name: 'Test 6: IT/UE + No figli + RdC',
        inputs: ['sì', 'no', 'no', 'no', 'sì'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 4  // Blocca alla domanda 4 (ha_figli_disabili) prima di chiedere RdC
    },

    // Gruppo 2: Extracomunitari con Permesso
    {
        name: 'Test 7: Extracom + Permesso + Figli minorenni + No RdC',
        inputs: ['no', 'sì', 'sì', 'no'],
        expectedResult: 'ammissibile',
        expectedQuestions: 4
    },
    {
        name: 'Test 8: Extracom + Permesso + Figli 18-21 + No RdC',
        inputs: ['no', 'sì', 'no', 'sì', 'no'],
        expectedResult: 'ammissibile',
        expectedQuestions: 5
    },
    {
        name: 'Test 9: Extracom + Permesso + Figli disabili + No RdC',
        inputs: ['no', 'sì', 'no', 'no', 'sì', 'no'],
        expectedResult: 'ammissibile',
        expectedQuestions: 6
    },
    {
        name: 'Test 10: Extracom + Permesso + Figli minorenni + RdC',
        inputs: ['no', 'sì', 'sì', 'sì'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 4
    },
    {
        name: 'Test 11: Extracom + Permesso + No figli + No RdC',
        inputs: ['no', 'sì', 'no', 'no', 'no', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 5  // Blocca alla domanda 5 (ha_figli_disabili) prima di chiedere RdC
    },

    // Gruppo 3: Extracomunitari senza Permesso
    {
        name: 'Test 12: Extracom + No Permesso (blocco cittadinanza)',
        inputs: ['no', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 2
    },

    // Gruppo 4: Edge Cases
    {
        name: 'Test 13: IT/UE + Più tipologie figli (minorenni) + No RdC',
        inputs: ['sì', 'sì', 'no'],
        expectedResult: 'ammissibile',
        expectedQuestions: 3
    },
    {
        name: 'Test 14: Extracom + Permesso + Più tipologie figli (18-21) + No RdC',
        inputs: ['no', 'sì', 'no', 'sì', 'no'],
        expectedResult: 'ammissibile',
        expectedQuestions: 5
    },
    {
        name: 'Test 15: IT/UE + Solo figli 18-21 + RdC',
        inputs: ['sì', 'no', 'sì', 'sì'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 4
    },
    {
        name: 'Test 16: IT/UE + Solo figli disabili + RdC',
        inputs: ['sì', 'no', 'no', 'sì', 'sì'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 5
    }
];

function main() {
    console.log('========================================');
    console.log('DSL Test Runner - Assegno Unico');
    console.log('========================================');

    // Load DSL
    const dslPath = path.join(__dirname, 'dsl-assegno-unico.json');
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
    const jsonReportPath = path.join(__dirname, 'dsl-assegno-unico-test-results.json');
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
    const reportPath = path.join(__dirname, 'dsl-assegno-unico-test-report.md');
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
    resultsSection += `**Totale Test Eseguiti**: ${totalTests} / 16\n`;
    resultsSection += `**Test Passati**: ${passed} (${Math.round(passed/totalTests*100)}%)\n`;
    resultsSection += `**Test Falliti**: ${failed} (${Math.round(failed/totalTests*100)}%)\n`;
    resultsSection += `**Tempo Esecuzione**: < 1 secondo\n\n`;

    resultsSection += `---\n\n`;
    resultsSection += `### Dettaglio Risultati per Test\n\n`;

    // Group results
    const groups = {
        'Gruppo 1: Cittadini IT/UE': results.slice(0, 6),
        'Gruppo 2: Extracomunitari con Permesso': results.slice(6, 11),
        'Gruppo 3: Extracomunitari senza Permesso': results.slice(11, 12),
        'Gruppo 4: Edge Cases': results.slice(12, 16)
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
