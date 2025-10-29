#!/usr/bin/env node
/**
 * DSL Test Runner - Automated Testing without Browser
 * Estrae la logica DSL dall'index.html e la esegue direttamente
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// LOGICA DSL ESTRATTA DA index.html
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
                    console.error('Evaluation error for reason:', e);
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
                console.error('Error evaluating skip_if:', e);
            }
        }

        return { index: i, step };
    }

    return null;
}

function createCTX(practice) {
    const practiceCode = practice.title || "pratica_senza_titolo";
    const steps = Array.isArray(practice.steps) ? practice.steps : [];
    const varNames = steps.map(s => s?.var).filter(Boolean);

    const variables = {};
    const checklist = {};
    for (const v of varNames) {
        variables[v] = null;
        checklist[v] = false;
    }

    const sessionId = String(Date.now());
    const userId = "test_user";

    return {
        session_id: sessionId,
        user_id: userId,
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
// TEST RUNNER
// ============================================================================

function runTest(dsl, inputs, testName) {
    const ctx = createCTX(dsl);
    const steps = dsl.steps || [];
    const evaluationMode = dsl.evaluation_mode || 'batch';

    let questionsAsked = 0;
    let inputIndex = 0;

    console.log(`\n📝 Running: ${testName}`);
    console.log(`   Inputs: [${inputs.join(', ')}]`);

    while (ctx.status === 'collecting') {
        // Trova il prossimo step
        const nextStepResult = findNextStep(steps, ctx.step_index, ctx.variables);

        if (!nextStepResult) {
            // Nessun altro step, passa a checking
            ctx.status = 'checking';
            break;
        }

        const step = nextStepResult.step;
        questionsAsked++;

        // Simula risposta utente
        if (inputIndex >= inputs.length) {
            console.error(`   ❌ ERROR: Not enough inputs! Expected ${questionsAsked}, got ${inputs.length}`);
            return {
                status: 'ERROR',
                result: null,
                reason: 'Not enough inputs',
                questionsAsked,
                variables: ctx.variables
            };
        }

        let msg = inputs[inputIndex++];
        let val = msg;

        // Type conversion
        if (step.type === 'number') {
            val = parseFloat(String(msg).replace(',', '.'));
            if (Number.isNaN(val)) {
                console.error(`   ❌ ERROR: Invalid number: ${msg}`);
                return {
                    status: 'ERROR',
                    result: null,
                    reason: `Invalid number: ${msg}`,
                    questionsAsked,
                    variables: ctx.variables
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

                console.log(`   ❌ INAMMISSIBILE (stopped at question ${questionsAsked})`);
                console.log(`   Reason: ${evalResult.reason}`);

                return {
                    status: 'PASS',
                    result: 'non_ammissibile',
                    reason: evalResult.reason,
                    questionsAsked,
                    variables: ctx.variables
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
                    console.error('Batch evaluation error:', e);
                }
            }

            if (failedReasons.length > 0) {
                result = 'non_ammissibile';
            }
        }

        ctx.last_result = result;
        ctx.status = 'complete';

        const reasonText = failedReasons.length > 0 ? failedReasons.join('; ') : 'N/A';

        if (result === 'ammissibile') {
            console.log(`   ✅ AMMISSIBILE (${questionsAsked} questions)`);
        } else {
            console.log(`   ❌ INAMMISSIBILE (${questionsAsked} questions)`);
            console.log(`   Reason: ${reasonText}`);
        }

        return {
            status: 'PASS',
            result,
            reason: reasonText,
            questionsAsked,
            variables: ctx.variables
        };
    }

    return {
        status: 'ERROR',
        result: null,
        reason: 'Unknown error',
        questionsAsked,
        variables: ctx.variables
    };
}

// ============================================================================
// TEST SUITE
// ============================================================================

const testCases = [
    // Fase 1: Test Critici (già completati 1-10)

    // Fase 2: Edge Cases (Test 11-15)
    {
        name: 'Test 11: ISEE = 0 - Valore minimo valido',
        inputs: ['sì', 'sì', 'sì', 'sì', 'nascita', 'sì', 'sì', 'sì', '0', 'no', '50'],
        expectedResult: 'ammissibile',
        expectedQuestions: 11
    },
    {
        name: 'Test 12: giorni_dal_parto = 0 - Valore minimo valido',
        inputs: ['sì', 'sì', 'sì', 'sì', 'nascita', 'sì', 'sì', 'sì', '20000', 'no', '0'],
        expectedResult: 'ammissibile',
        expectedQuestions: 11
    },
    {
        name: 'Test 13: giorni_dal_parto = 119 - Un giorno sotto il limite',
        inputs: ['sì', 'sì', 'sì', 'sì', 'nascita', 'sì', 'sì', 'sì', '20000', 'no', '119'],
        expectedResult: 'ammissibile',
        expectedQuestions: 11
    },
    {
        name: 'Test 14: evento_tipo = " nascita " - Con spazi',
        inputs: ['sì', 'sì', 'sì', 'sì', ' nascita ', 'sì', 'sì', 'sì', '20000', 'no', '50'],
        expectedResult: 'ammissibile',
        expectedQuestions: 11
    },
    {
        name: 'Test 15: evento_tipo = "matrimonio" - Valore non valido',
        inputs: ['sì', 'sì', 'sì', 'sì', 'matrimonio'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 5
    },

    // Fase 3: Coverage Completa (Test 16-22)
    {
        name: 'Test 16: residenza_genitore = false',
        inputs: ['sì', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 2
    },
    {
        name: 'Test 17: minore_residente = false',
        inputs: ['sì', 'sì', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 3
    },
    {
        name: 'Test 18: minore_convivente = false',
        inputs: ['sì', 'sì', 'sì', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 4
    },
    {
        name: 'Test 19: evento_in_italia = false',
        inputs: ['sì', 'sì', 'sì', 'sì', 'nascita', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 6
    },
    {
        name: 'Test 20: evento_anno_corrente = false',
        inputs: ['sì', 'sì', 'sì', 'sì', 'nascita', 'sì', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 7
    },
    {
        name: 'Test 21: dsu_valida = false',
        inputs: ['sì', 'sì', 'sì', 'sì', 'nascita', 'sì', 'sì', 'no'],
        expectedResult: 'non_ammissibile',
        expectedQuestions: 8
    },
    {
        name: 'Test 22: ISEE=40000 + giorni=120 - Double boundary',
        inputs: ['sì', 'sì', 'sì', 'sì', 'nascita', 'sì', 'sì', 'sì', '40000', 'no', '120'],
        expectedResult: 'ammissibile',
        expectedQuestions: 11
    },

    // Fase 4: Stress Tests (Test 23-25)
    {
        name: 'Test 23: cittadino_italiano_ue=false + extracom con permesso',
        inputs: ['no', 'sì', 'sì', 'sì', 'sì', 'nascita', 'sì', 'sì', 'sì', '20000', 'no', '50'],
        expectedResult: 'ammissibile',
        expectedQuestions: 12
    },
    {
        name: 'Test 24: evento_tipo=adozione (no giorni_dal_parto)',
        inputs: ['sì', 'sì', 'sì', 'sì', 'adozione', 'sì', 'sì', 'sì', '20000', 'no'],
        expectedResult: 'ammissibile',
        expectedQuestions: 10
    },
    {
        name: 'Test 25: evento_tipo=affidamento (no giorni_dal_parto)',
        inputs: ['sì', 'sì', 'sì', 'sì', 'affidamento', 'sì', 'sì', 'sì', '20000', 'no'],
        expectedResult: 'ammissibile',
        expectedQuestions: 10
    },
];

// ============================================================================
// MAIN
// ============================================================================

function main() {
    console.log('========================================');
    console.log('DSL Test Runner - Automated Testing');
    console.log('========================================');

    // Carica DSL
    const dslPath = path.join(__dirname, 'bonus-nuovi-nati-completo.json');
    const dslContent = fs.readFileSync(dslPath, 'utf8');
    const dsl = JSON.parse(dslContent);

    console.log(`\n📋 DSL Loaded: ${dsl.title}`);
    console.log(`   Evaluation Mode: ${dsl.evaluation_mode}`);
    console.log(`   Total Steps: ${dsl.steps.length}`);
    console.log(`   Total Rules: ${dsl.reasons_if_fail.length}`);

    // Esegui tutti i test
    const results = [];
    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        const result = runTest(dsl, testCase.inputs, testCase.name);

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
            variables: result.variables
        });
    }

    // Summary
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log(`Total Tests: ${testCases.length}`);
    console.log(`Passed: ${passed} (${Math.round(passed/testCases.length*100)}%)`);
    console.log(`Failed: ${failed} (${Math.round(failed/testCases.length*100)}%)`);

    // Salva report JSON
    const reportPath = path.join(__dirname, 'test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        dsl: dsl.title,
        totalTests: testCases.length,
        passed,
        failed,
        results
    }, null, 2));

    console.log(`\n📄 Report saved to: ${reportPath}`);

    // Exit code
    process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
    main();
}

module.exports = { runTest, createCTX, toBool, evaluateIncrementalReasons, findNextStep };
