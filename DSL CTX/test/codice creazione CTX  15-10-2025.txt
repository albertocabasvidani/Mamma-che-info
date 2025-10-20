// Costruisce la CTX a partire da una singola DSL.
// Input atteso in $json con chiavi:
//  - IDsessione (opzionale)
//  - IDutente   (opzionale)
//  - dsl        (object o stringa JSON con una singola pratica)

const input = $json;

// 1) Parsifico la DSL
let practice = input.dsl;
if (!practice) throw new Error('Manca "dsl" in input.');
if (typeof practice === 'string') {
  try { practice = JSON.parse(practice); }
  catch (e) { throw new Error('DSL non è un JSON valido: ' + e.message); }
}
if (typeof practice !== 'object') {
  throw new Error('DSL non valida.');
}

// 2) Recupero nome pratica dal campo title
// (qui non serve codicePratica: ci basta il titolo della pratica)
const practiceCode = practice.title || "pratica_senza_titolo";

// 3) Estraggo le variabili dai passi
const steps = Array.isArray(practice.steps) ? practice.steps : [];
const varNames = steps.map(s => s?.var).filter(Boolean);

// 4) Inizializzo variables e checklist
const variables = {};
const checklist = {};
for (const v of varNames) {
  variables[v] = null;
  checklist[v] = false;
}

// 5) Sessione / utente
const sessionId = input.IDsessione ? String(input.IDsessione) : String(Date.now());
const userId = input.IDutente ? String(input.IDutente) : null;

// 6) CTX finale
const ctx = {
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

return [{ json: ctx }];
