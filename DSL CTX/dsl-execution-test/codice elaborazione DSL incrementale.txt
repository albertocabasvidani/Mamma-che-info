// =======================
// Code Runner con valutazione incrementale
// - Supporta evaluation_mode: "incremental"
// - Valuta reasons_if_fail dopo ogni step con check_after_vars
// - Si ferma immediatamente se blocking: true
// - Supporta skip_if per saltare step condizionalmente
// =======================

// prelievo
const body = $('Flow Runner').first().json;
let practice = $('Flow Runner').first().json.dsl;   // ora è la singola pratica
let ctx  = $input.first().json.ctx ?? $input.first().json.CTX; // ctx è sempre presente

// debug input
console.log('[DBG] body keys:', Object.keys(body || {}));
console.log('[DBG] ctx.practice_code:', ctx?.practice_code, 'ctx.step_index:', ctx?.step_index, 'ctx.status:', ctx?.status);

if (typeof practice === 'string') {
  try { practice = JSON.parse(practice); console.log('[DBG] practice parsed'); }
  catch (e) { console.log('[DBG] practice parse error:', e.message); }
}

if (!practice || typeof practice !== 'object') {
  return [{ json: { reply: 'DSL non valida o mancante.', ctx, status: 'error' } }];
}

// messaggio utente
const msg = String(body?.message ?? '').trim();
console.log('[DBG] msg:', msg);
ctx.last_user = msg;

function toBool(s) {
  if (typeof s === 'boolean') return s;
  const t = String(s).toLowerCase().trim();
  return ['si','sì','yes','y','true','1'].includes(t);
}

// --- funzione per valutare reasons_if_fail incrementali ---
function evaluateIncrementalReasons(practice, vars, justCollectedVar) {
  const reasons = Array.isArray(practice.reasons_if_fail) ? practice.reasons_if_fail : [];

  for (const r of reasons) {
    // Controlla se questa reason deve essere valutata ora
    const checkAfterVars = Array.isArray(r.check_after_vars) ? r.check_after_vars : [];

    // Se check_after_vars include la variabile appena raccolta, valuta
    if (checkAfterVars.includes(justCollectedVar)) {
      // Verifica che tutte le variabili necessarie siano disponibili
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
          console.error('[DBG] Evaluation error for reason:', e.message);
        }
      }
    }
  }

  return { failed: false };
}

// --- funzione per trovare il prossimo step da chiedere ---
function findNextStep(steps, currentIndex, vars) {
  for (let i = currentIndex; i < steps.length; i++) {
    const step = steps[i];

    // Se lo step ha skip_if, valuta la condizione
    if (step.skip_if) {
      try {
        const fn = Function(...Object.keys(vars), `return (${step.skip_if});`);
        const shouldSkip = !!fn(...Object.values(vars));

        if (shouldSkip) {
          console.log(`[DBG] Skipping step ${i} (${step.var}) - skip_if: ${step.skip_if}`);
          continue; // Salta questo step
        }
      } catch (e) {
        console.error('[DBG] Error evaluating skip_if:', e.message);
        // In caso di errore, non skippa lo step per sicurezza
      }
    }

    // Step non skippato, restituiscilo
    return { index: i, step };
  }

  // Nessun step trovato
  return null;
}

// -------- COLLECTING --------
if (ctx.status === 'collecting') {
  const steps = Array.isArray(practice.steps) ? practice.steps : [];
  const evaluationMode = practice.evaluation_mode || 'batch'; // default: batch (vecchio comportamento)

  // Se c'è un last_prompt, significa che stiamo aspettando la risposta
  if (ctx.last_prompt && msg) {
    const currentStep = steps[ctx.step_index];

    if (currentStep) {
      let val = msg;

      // Type conversion
      if (currentStep.type === 'number') {
        val = parseFloat(String(msg).replace(',', '.'));
        if (Number.isNaN(val)) {
          const rep = 'Inserisci un numero valido.';
          ctx.last_prompt = rep;
          return [{ json: { reply: rep, ctx, status: 'collecting' } }];
        }
      }

      if (currentStep.type === 'boolean') val = toBool(msg);

      // Salva valore
      ctx.variables[currentStep.var] = val;
      ctx.checklist[currentStep.var] = true;
      ctx.history.push({ role: 'user', msg });

      // VALUTAZIONE INCREMENTALE: se evaluation_mode è "incremental", valuta subito
      if (evaluationMode === 'incremental') {
        const evalResult = evaluateIncrementalReasons(practice, ctx.variables, currentStep.var);

        if (evalResult.failed) {
          ctx.last_result = 'non_ammissibile';
          ctx.status = 'complete';
          ctx.step_index += 1; // incrementa per indicare a quale step si è fermato

          const reply = `Non risulti ammissibile.\n\nMotivo:\n${evalResult.reason}`;
          ctx.last_prompt = reply;
          return [{ json: { reply, ctx, status: 'complete' } }];
        }
      }

      // Incrementa step_index dopo aver salvato e validato
      ctx.step_index += 1;
    }
  }

  // Trova il prossimo step da chiedere (considera skip_if)
  const nextStepResult = findNextStep(steps, ctx.step_index, ctx.variables);

  if (nextStepResult) {
    // Aggiorna step_index al prossimo step valido
    ctx.step_index = nextStepResult.index;
    ctx.last_prompt = nextStepResult.step.ask;
    ctx.status = 'collecting';
    return [{ json: { reply: nextStepResult.step.ask, ctx, status: 'collecting' } }];
  }

  // Nessun altro step trovato, passa a checking
  ctx.status = 'checking';
}

// -------- CHECKING --------
if (ctx.status === 'checking') {
  const vars = ctx.variables || {};
  let result = 'ammissibile'; // se arrivi qui in incremental mode, sei ammissibile
  let message = 'Risulti ammissibile!';

  // Se non è incremental mode, valuta tutte le reasons_if_fail ora
  const evaluationMode = practice.evaluation_mode || 'batch';

  if (evaluationMode !== 'incremental') {
    // Modalità batch: valuta tutte le reasons alla fine
    const reasons = Array.isArray(practice.reasons_if_fail) ? practice.reasons_if_fail : [];
    const failedReasons = [];

    for (const r of reasons) {
      try {
        const fn = Function(...Object.keys(vars), `return (${r.when});`);
        const failed = !!fn(...Object.values(vars));
        if (failed && r.reason) {
          failedReasons.push(String(r.reason));
        }
      } catch (e) {
        console.error('[DBG] Batch evaluation error:', e.message);
      }
    }

    if (failedReasons.length > 0) {
      result = 'non_ammissibile';
      message = 'Non risulti ammissibile.';
      if (failedReasons.length === 1) {
        message += '\n\nMotivo:\n' + failedReasons[0];
      } else {
        message += '\n\nMotivi:\n- ' + failedReasons.join('\n- ');
      }
    }
  }

  ctx.last_result = result;
  ctx.status = 'complete';

  const suffix = result === 'ammissibile' && Array.isArray(practice.next_actions_if_ok)
    ? '\n\nProssimi passi:\n- ' + practice.next_actions_if_ok.join('\n- ')
    : '';

  const reply = `${message}${suffix}`;
  ctx.last_prompt = reply;
  return [{ json: { reply, ctx, status: 'complete' } }];
}

// -------- COMPLETE --------
if (ctx.status === 'complete') {
  if (/reset|ricomincia|nuova/i.test(msg)) {
    ctx.step_index = 0;
    for (const k of Object.keys(ctx.variables || {})) ctx.variables[k] = null;
    for (const k of Object.keys(ctx.checklist || {})) ctx.checklist[k] = false;
    ctx.status = 'collecting';
    const q = practice.steps[0].ask;
    ctx.last_prompt = q;
    return [{ json: { reply: q, ctx, status: 'collecting' } }];
  }
  return [{ json: { reply: "Valutazione già conclusa. Scrivi 'reset' per ricominciare.", ctx, status: 'complete' } }];
}

// -------- FALLBACK (sempre un array) --------
return [{ json: { reply: 'Stato della CTX non riconosciuto. Imposta correttamente lo stato o reinizializza la sessione.', ctx, status: ctx.status || 'unknown' } }];
