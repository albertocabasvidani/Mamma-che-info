// Ottieni input dal nodo precedente
const input = $input.first().json.message.content;

// Estrai DSL (può essere wrappato in campo "dsl" o diretto)
const dslRaw = input.dsl || input;

// Leggi contatori e configurazione
const tentativo = input.tentativo_numero || 1;
const maxTentativi = input.max_tentativi || 3;
const requisitiUtente = input.requisiti_utente;

// Helper: Valida sintassi JavaScript e variabili usate
function validateJSExpression(expression, declaredVars, context) {
  // 1. Valida sintassi JS
  try {
    new Function(expression);
  } catch (error) {
    return {
      valid: false,
      error: `Sintassi JavaScript invalida in ${context}: ${error.message}`
    };
  }

  // 2. Estrai identificatori (variabili, non keywords/operatori)
  const varPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const jsKeywords = new Set([
    'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
    'var', 'let', 'const', 'if', 'else', 'return', 'function',
    'typeof', 'instanceof', 'new', 'this', 'super', 'class',
    'extends', 'static', 'async', 'await', 'yield', 'delete',
    'void', 'in', 'of', 'break', 'continue', 'switch', 'case',
    'default', 'throw', 'try', 'catch', 'finally', 'while',
    'do', 'for', 'with', 'debugger', 'export', 'import'
  ]);

  const usedVars = [...expression.matchAll(varPattern)]
    .map(m => m[1])
    .filter(v => !jsKeywords.has(v) && !declaredVars.has(v));

  // 3. Segnala variabili non dichiarate
  if (usedVars.length > 0) {
    const uniqueVars = [...new Set(usedVars)];
    return {
      valid: false,
      error: `Variabili non dichiarate in ${context}: ${uniqueVars.join(', ')}`
    };
  }

  return { valid: true };
}

// Validazione schema
const errors = [];

// 1. Controllo campi obbligatori principali
if (!dslRaw.title || typeof dslRaw.title !== 'string') {
    errors.push('Campo "title" obbligatorio (string)');
}

if (!dslRaw.evaluation_mode || !['incremental', 'batch'].includes(dslRaw.evaluation_mode)) {
    errors.push('Campo "evaluation_mode" deve essere "incremental" o "batch"');
}

if (!Array.isArray(dslRaw.steps)) {
    errors.push('Campo "steps" obbligatorio (array)');
}

if (!Array.isArray(dslRaw.reasons_if_fail)) {
    errors.push('Campo "reasons_if_fail" obbligatorio (array)');
}

if (!Array.isArray(dslRaw.next_actions_if_ok)) {
    errors.push('Campo "next_actions_if_ok" obbligatorio (array)');
}

// 2. Validazione steps
const declaredVars = new Set();
if (Array.isArray(dslRaw.steps)) {
    dslRaw.steps.forEach((step, idx) => {
        if (!step.var || typeof step.var !== 'string') {
            errors.push(`Step ${idx}: campo "var" obbligatorio (string)`);
        } else {
            // Aggiungi variabile al set PRIMA di validare skip_if
            // (skip_if può riferirsi solo a variabili dichiarate prima)
            declaredVars.add(step.var);
        }

        if (!step.ask || typeof step.ask !== 'string') {
            errors.push(`Step ${idx}: campo "ask" obbligatorio (string)`);
        }

        if (!step.type || !['boolean', 'string', 'number'].includes(step.type)) {
            errors.push(`Step ${idx}: campo "type" deve essere "boolean", "string" o "number"`);
        }

        // skip_if è opzionale, ma se presente deve essere string e JS valido
        if (step.skip_if !== undefined) {
            if (typeof step.skip_if !== 'string') {
                errors.push(`Step ${idx}: campo "skip_if" deve essere string (se presente)`);
            } else {
                // Crea set con variabili dichiarate PRIMA di questo step
                const declaredVarsBefore = new Set([...declaredVars].filter(v => v !== step.var));
                const skipValidation = validateJSExpression(
                    step.skip_if,
                    declaredVarsBefore,
                    `Step ${idx} campo "skip_if"`
                );
                if (!skipValidation.valid) {
                    errors.push(skipValidation.error);
                }
            }
        }
    });
}

// 3. Validazione reasons_if_fail
if (Array.isArray(dslRaw.reasons_if_fail)) {
    dslRaw.reasons_if_fail.forEach((reason, idx) => {
        if (!reason.when || typeof reason.when !== 'string') {
            errors.push(`Reason ${idx}: campo "when" obbligatorio (string)`);
        } else {
            // Valida sintassi JavaScript e variabili usate in when
            const whenValidation = validateJSExpression(
                reason.when,
                declaredVars,
                `Reason ${idx} campo "when"`
            );
            if (!whenValidation.valid) {
                errors.push(whenValidation.error);
            }
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
if (Array.isArray(dslRaw.next_actions_if_ok)) {
    dslRaw.next_actions_if_ok.forEach((action, idx) => {
        if (typeof action !== 'string') {
            errors.push(`Next action ${idx}: deve essere una stringa`);
        }
    });
}

// Ritorna risultato validazione
if (errors.length === 0) {
    // DSL VALIDA
    return {
        valid: true,
        dsl: dslRaw,
        message: `DSL valida (tentativo ${tentativo}/${maxTentativi})`,
        tentativo_numero: tentativo,
        retry: false
    };
}

// DSL NON VALIDA - Decidi se ritentare
if (tentativo < maxTentativi) {
    // RETRY
    return {
        valid: false,
        errors: errors,
        message: `Trovati ${errors.length} errori - Tentativo ${tentativo}/${maxTentativi}`,
        // Dati per il prossimo tentativo
        dsl_da_correggere: dslRaw,
        errori_validazione: errors,
        requisiti_utente: requisitiUtente,
        tentativo_numero: tentativo,
        max_tentativi: maxTentativi,
        retry: true
    };
}

// TENTATIVI ESAURITI
return {
    valid: false,
    errors: errors,
    message: `DSL non valida dopo ${tentativo} tentativi`,
    dsl_da_correggere: dslRaw,
    tentativo_numero: tentativo,
    retry: false
};
