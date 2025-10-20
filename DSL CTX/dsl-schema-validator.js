// Ottieni la DSL dall'input del nodo precedente
const dsl = $input.first().json;

// Validazione schema
const errors = [];

// 1. Controllo campi obbligatori principali
if (!dsl.title || typeof dsl.title !== 'string') {
    errors.push('Campo "title" obbligatorio (string)');
}

if (!dsl.evaluation_mode || !['incremental', 'batch'].includes(dsl.evaluation_mode)) {
    errors.push('Campo "evaluation_mode" deve essere "incremental" o "batch"');
}

if (!Array.isArray(dsl.steps)) {
    errors.push('Campo "steps" obbligatorio (array)');
}

if (!Array.isArray(dsl.reasons_if_fail)) {
    errors.push('Campo "reasons_if_fail" obbligatorio (array)');
}

if (!Array.isArray(dsl.next_actions_if_ok)) {
    errors.push('Campo "next_actions_if_ok" obbligatorio (array)');
}

// 2. Validazione steps
const declaredVars = new Set();
if (Array.isArray(dsl.steps)) {
    dsl.steps.forEach((step, idx) => {
        if (!step.var || typeof step.var !== 'string') {
            errors.push(`Step ${idx}: campo "var" obbligatorio (string)`);
        } else {
            declaredVars.add(step.var);
        }

        if (!step.ask || typeof step.ask !== 'string') {
            errors.push(`Step ${idx}: campo "ask" obbligatorio (string)`);
        }

        if (!step.type || !['boolean', 'string', 'number'].includes(step.type)) {
            errors.push(`Step ${idx}: campo "type" deve essere "boolean", "string" o "number"`);
        }

        // skip_if è opzionale, ma se presente deve essere string
        if (step.skip_if !== undefined && typeof step.skip_if !== 'string') {
            errors.push(`Step ${idx}: campo "skip_if" deve essere string (se presente)`);
        }
    });
}

// 3. Validazione reasons_if_fail
if (Array.isArray(dsl.reasons_if_fail)) {
    dsl.reasons_if_fail.forEach((reason, idx) => {
        if (!reason.when || typeof reason.when !== 'string') {
            errors.push(`Reason ${idx}: campo "when" obbligatorio (string)`);
        }

        if (!reason.reason || typeof reason.reason !== 'string') {
            errors.push(`Reason ${idx}: campo "reason" obbligatorio (string)`);
        }

        if (!Array.isArray(reason.check_after_vars)) {
            errors.push(`Reason ${idx}: campo "check_after_vars" obbligatorio (array)`);
        } else {
            // Verifica che tutte le variabili referenziate esistano
            reason.check_after_vars.forEach(varName => {
                if (!declaredVars.has(varName)) {
                    errors.push(`Reason ${idx}: variabile "${varName}" non dichiarata in steps`);
                }
            });
        }

        if (typeof reason.blocking !== 'boolean') {
            errors.push(`Reason ${idx}: campo "blocking" obbligatorio (boolean)`);
        }
    });
}

// 4. Validazione next_actions_if_ok
if (Array.isArray(dsl.next_actions_if_ok)) {
    dsl.next_actions_if_ok.forEach((action, idx) => {
        if (typeof action !== 'string') {
            errors.push(`Next action ${idx}: deve essere una stringa`);
        }
    });
}

// Ritorna risultato validazione
return {
    valid: errors.length === 0,
    errors: errors,
    message: errors.length === 0 ? 'DSL valida' : `Trovati ${errors.length} errori di validazione`
};
