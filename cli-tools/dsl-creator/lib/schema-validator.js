#!/usr/bin/env node
/**
 * DSL Validator Service - Auto-generates tests and validates DSL
 * Used by n8n workflow for automated DSL validation
 */

// ============================================================================
// CORE DSL LOGIC (from dsl-test-runner.js)
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
                    return {
                        failed: true,
                        reason: `Errore valutazione: ${e.message}`
                    };
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

function runTest(dsl, inputs, testName) {
    const ctx = createCTX(dsl);
    const steps = dsl.steps || [];
    const evaluationMode = dsl.evaluation_mode || 'batch';

    let questionsAsked = 0;
    let inputIndex = 0;

    while (ctx.status === 'collecting') {
        const nextStepResult = findNextStep(steps, ctx.step_index, ctx.variables);

        if (!nextStepResult) {
            ctx.status = 'checking';
            break;
        }

        const step = nextStepResult.step;
        questionsAsked++;

        if (inputIndex >= inputs.length) {
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

        if (step.type === 'number') {
            val = parseFloat(String(msg).replace(',', '.'));
            if (Number.isNaN(val)) {
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

        ctx.variables[step.var] = val;
        ctx.checklist[step.var] = true;
        ctx.step_index = nextStepResult.index + 1;

        if (evaluationMode === 'incremental') {
            const evalResult = evaluateIncrementalReasons(dsl, ctx.variables, step.var);

            if (evalResult.failed) {
                ctx.last_result = 'non_ammissibile';
                ctx.status = 'complete';

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
// SCHEMA VALIDATION
// ============================================================================

function validateDSLSchema(dsl) {
    const errors = [];

    // Required fields
    if (!dsl.title) errors.push('Missing: title');
    if (!dsl.evaluation_mode) errors.push('Missing: evaluation_mode');
    if (!Array.isArray(dsl.steps)) errors.push('Missing or invalid: steps (must be array)');
    if (!Array.isArray(dsl.reasons_if_fail)) errors.push('Missing or invalid: reasons_if_fail (must be array)');
    if (!Array.isArray(dsl.next_actions_if_ok)) errors.push('Missing or invalid: next_actions_if_ok (must be array)');

    // Evaluation mode
    if (dsl.evaluation_mode && !['incremental', 'batch'].includes(dsl.evaluation_mode)) {
        errors.push(`Invalid evaluation_mode: "${dsl.evaluation_mode}" (must be "incremental" or "batch")`);
    }

    // Step validation
    const declaredVars = new Set();
    dsl.steps?.forEach((step, idx) => {
        if (!step.var) errors.push(`Step ${idx}: missing var`);
        if (!step.ask) errors.push(`Step ${idx}: missing ask`);
        if (!step.type) errors.push(`Step ${idx}: missing type`);
        if (step.type && !['string', 'number', 'boolean'].includes(step.type)) {
            errors.push(`Step ${idx}: invalid type "${step.type}"`);
        }
        if (step.var) declaredVars.add(step.var);
    });

    // Reason validation
    dsl.reasons_if_fail?.forEach((reason, idx) => {
        if (!reason.when) errors.push(`Reason ${idx}: missing when`);
        if (!reason.reason) errors.push(`Reason ${idx}: missing reason text`);
        if (!Array.isArray(reason.check_after_vars)) {
            errors.push(`Reason ${idx}: missing or invalid check_after_vars (must be array)`);
        }
        if (typeof reason.blocking !== 'boolean') {
            errors.push(`Reason ${idx}: missing or invalid blocking (must be boolean)`);
        }

        // Check if variables in check_after_vars are declared
        reason.check_after_vars?.forEach(varName => {
            if (!declaredVars.has(varName)) {
                errors.push(`Reason ${idx}: variable "${varName}" in check_after_vars not declared in steps`);
            }
        });
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

// ============================================================================
// AUTO TEST CASE GENERATION
// ============================================================================

function generateHappyPathInputs(dsl) {
    const inputs = [];
    const steps = dsl.steps || [];

    for (const step of steps) {
        if (step.type === 'boolean') {
            inputs.push('sì');
        } else if (step.type === 'number') {
            // Find safe number (analyze reasons_if_fail)
            inputs.push('10000'); // Default safe value
        } else if (step.type === 'string') {
            // Try to infer valid option from ask text
            if (step.ask.includes('nascita')) {
                inputs.push('nascita');
            } else if (step.ask.includes('dipendente')) {
                inputs.push('dipendente_privato');
            } else {
                inputs.push('valido'); // Default
            }
        }
    }

    return inputs;
}

function generateTestCaseForReason(reason, dsl, reasonIndex) {
    const inputs = generateHappyPathInputs(dsl);

    // Try to modify inputs to trigger this specific reason
    // This is heuristic-based
    const checkVars = reason.check_after_vars || [];

    checkVars.forEach(varName => {
        const stepIdx = dsl.steps.findIndex(s => s.var === varName);
        if (stepIdx >= 0) {
            const step = dsl.steps[stepIdx];

            // Try to set value that triggers failure
            if (reason.when.includes('=== false') && step.type === 'boolean') {
                inputs[stepIdx] = 'no';
            } else if (reason.when.includes('> ') && step.type === 'number') {
                // Extract number from condition
                const match = reason.when.match(/>\s*(\d+)/);
                if (match) {
                    const threshold = parseInt(match[1]);
                    inputs[stepIdx] = String(threshold + 1000);
                }
            }
        }
    });

    return {
        name: `Test Reason ${reasonIndex + 1}: ${reason.reason.substring(0, 50)}...`,
        inputs,
        expectedResult: 'non_ammissibile',
        expectedQuestions: calculateExpectedQuestions(reason, dsl)
    };
}

function calculateExpectedQuestions(reason, dsl) {
    // In incremental mode, stops at first blocking reason
    if (dsl.evaluation_mode === 'incremental') {
        const checkVars = reason.check_after_vars || [];
        let maxStepIndex = 0;

        checkVars.forEach(varName => {
            const stepIdx = dsl.steps.findIndex(s => s.var === varName);
            if (stepIdx > maxStepIndex) maxStepIndex = stepIdx;
        });

        // Count non-skipped steps up to maxStepIndex
        return maxStepIndex + 1; // Simplified
    }

    return dsl.steps.length; // Batch mode asks all
}

function autoGenerateTestCases(dsl) {
    const testCases = [];

    // Happy path
    testCases.push({
        name: 'Happy Path - All requirements met',
        inputs: generateHappyPathInputs(dsl),
        expectedResult: 'ammissibile',
        expectedQuestions: dsl.steps.length
    });

    // One test per reason_if_fail
    dsl.reasons_if_fail?.forEach((reason, idx) => {
        testCases.push(generateTestCaseForReason(reason, dsl, idx));
    });

    return testCases;
}

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

function classifyErrors(dsl, testResults, schemaValidation) {
    const diagnostics = {
        type: null,  // 'syntax' | 'logic' | 'interpretation' | 'ok'
        confidence: 0,
        details: [],
        suggestedAction: null,
        questionsForUser: []
    };

    // Schema errors = syntax
    if (!schemaValidation.valid) {
        return {
            type: 'syntax',
            confidence: 1.0,
            details: schemaValidation.errors,
            suggestedAction: 'retry_with_feedback',
            questionsForUser: []
        };
    }

    // All tests pass = OK
    const failedTests = testResults.filter(t => t.status === 'FAIL');
    if (failedTests.length === 0) {
        return {
            type: 'ok',
            confidence: 1.0,
            details: ['All tests passed'],
            suggestedAction: 'save_to_notion',
            questionsForUser: []
        };
    }

    // Analyze failed tests
    const happyPathTest = testResults.find(t => t.name.includes('Happy Path'));

    if (happyPathTest && happyPathTest.status === 'FAIL') {
        // Happy path fails = likely interpretation error
        return {
            type: 'interpretation',
            confidence: 0.8,
            details: [`Happy path failed: ${happyPathTest.reason}`],
            suggestedAction: 'ask_clarification',
            questionsForUser: [
                `Il test "happy path" (tutti requisiti soddisfatti) è risultato inammissibile per: "${happyPathTest.reason}". Questo è corretto o c'è un errore nella DSL?`
            ]
        };
    }

    // Some tests fail but happy path passes = might be expected behavior
    if (failedTests.length < testResults.length / 2) {
        return {
            type: 'logic',
            confidence: 0.6,
            details: failedTests.map(t => t.reason || t.name),
            suggestedAction: 'review_with_user',
            questionsForUser: failedTests.map((t, idx) =>
                `Test ${idx + 1} ha dato risultato inatteso: ${t.name}. È corretto?`
            )
        };
    }

    // Most tests fail = likely logic error
    return {
        type: 'logic',
        confidence: 0.7,
        details: [`${failedTests.length}/${testResults.length} test falliti`],
        suggestedAction: 'review_requirements',
        questionsForUser: [
            `La maggior parte dei test fallisce (${failedTests.length}/${testResults.length}). I requisiti potrebbero contenere contraddizioni. Vuoi rivederli?`
        ]
    };
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

function validateDSL(dsl) {
    const result = {
        valid: false,
        schemaValidation: null,
        testResults: [],
        summary: {
            totalTests: 0,
            passed: 0,
            failed: 0
        },
        diagnostics: null
    };

    // Step 1: Schema validation
    const schemaValidation = validateDSLSchema(dsl);
    result.schemaValidation = schemaValidation;

    if (!schemaValidation.valid) {
        result.diagnostics = classifyErrors(dsl, [], schemaValidation);
        return result;
    }

    // Step 2: Auto-generate test cases
    const testCases = autoGenerateTestCases(dsl);

    // Step 3: Run tests
    const testResults = [];
    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        const testResult = runTest(dsl, testCase.inputs, testCase.name);

        const isPass = testResult.result === testCase.expectedResult;

        if (isPass) {
            passed++;
        } else {
            failed++;
        }

        testResults.push({
            testName: testCase.name,
            status: isPass ? 'PASS' : 'FAIL',
            result: testResult.result,
            expectedResult: testCase.expectedResult,
            questionsAsked: testResult.questionsAsked,
            expectedQuestions: testCase.expectedQuestions,
            reason: testResult.reason,
            variables: testResult.variables
        });
    }

    result.testResults = testResults;
    result.summary = {
        totalTests: testCases.length,
        passed,
        failed
    };
    result.valid = failed === 0;

    // Step 4: Classify errors
    result.diagnostics = classifyErrors(dsl, testResults, schemaValidation);

    return result;
}

// ============================================================================
// CLI INTERFACE (for n8n Execute Command)
// ============================================================================

if (require.main === module) {
    const fs = require('fs');

    if (process.argv.length < 3) {
        console.error('Usage: node dsl-validator-service.js <dsl-file.json>');
        process.exit(1);
    }

    const dslPath = process.argv[2];

    try {
        const dslContent = fs.readFileSync(dslPath, 'utf8');
        const dsl = JSON.parse(dslContent);

        const result = validateDSL(dsl);

        // Output JSON for n8n to parse
        console.log(JSON.stringify(result, null, 2));

        process.exit(result.valid ? 0 : 1);
    } catch (err) {
        console.error(JSON.stringify({
            valid: false,
            error: err.message
        }));
        process.exit(1);
    }
}

// ============================================================================
// EXPORTS (for require() in n8n Code Node)
// ============================================================================

module.exports = {
    validateDSL,
    validateDSLSchema,
    autoGenerateTestCases,
    classifyErrors,
    runTest
};
