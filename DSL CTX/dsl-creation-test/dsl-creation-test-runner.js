#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Importa il validatore dalla cartella parent
const validatorPath = path.join(__dirname, '..', 'dsl-schema-validator.js');
const validatorCode = fs.readFileSync(validatorPath, 'utf8');

// Estrae la funzione validateDSLSchema dal file
const validateDSLSchema = eval(`(${validatorCode.match(/function validateDSLSchema\(dsl\) \{[\s\S]*?\n\}/)[0]})`);

// Carica variabili d'ambiente da file .env se esiste
function loadEnv() {
  const envPath = path.join(__dirname, '.env');

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    lines.forEach(line => {
      line = line.trim();

      // Ignora commenti e linee vuote
      if (!line || line.startsWith('#')) return;

      // Parse KEY=value
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();

        // Imposta solo se non già presente
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

// Carica .env
loadEnv();

// Configurazione OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('❌ ERRORE: Chiave API OpenAI non configurata\n');
  console.error('Opzione 1: Crea file .env nella cartella corrente:');
  console.error('  cat > .env << EOF');
  console.error('  OPENAI_API_KEY=sk-your-key-here');
  console.error('  EOF\n');
  console.error('Opzione 2: Usa variabile d\'ambiente:');
  console.error('  export OPENAI_API_KEY="sk-..."\n');
  process.exit(1);
}

const OPENAI_CONFIG = {
  model: 'gpt-4o',
  temperature: 0,
  seed: 42,
  max_tokens: 4000
};

// Prompt base (schema + regole + esempio)
const BASE_PROMPT = `Sei un esperto nella conversione di requisiti burocratici italiani in DSL strutturata.

## SCHEMA DSL OBBLIGATORIO

\`\`\`json
{
  "title": "<string>",
  "evaluation_mode": "incremental",
  "steps": [
    {
      "var": "<string>",
      "ask": "<string>",
      "type": "<'boolean' | 'string' | 'number'>",
      "skip_if": "<string | opzionale>"
    }
  ],
  "reasons_if_fail": [
    {
      "when": "<string>",
      "reason": "<string>",
      "check_after_vars": ["<string>"],
      "blocking": true
    }
  ],
  "next_actions_if_ok": ["<string>"]
}
\`\`\`

## REGOLE CRITICHE

**Consistenza nomi variabili:**
- I nomi in check_after_vars[] DEVONO essere IDENTICI a quelli in steps[].var
- I nomi in when DEVONO essere IDENTICI a quelli in steps[].var
- I nomi in skip_if DEVONO essere IDENTICI a quelli in steps[].var
- NON abbreviare, NON parafrasare

**Tipi corretti:**
- evaluation_mode: sempre "incremental"
- type: solo "boolean", "string" o "number"
- blocking: sempre true (boolean, non stringa)

**Steps:**
- Ogni step raccoglie UNA informazione
- Per cittadinanza: due step separati (italiano/UE, poi extracomunitario)
- Domande chiare con formato risposta (es. "sì/no")

**Reasons:**
- when: condizione JavaScript del fallimento
- check_after_vars: TUTTE le variabili usate in when
- Per "almeno uno": var1 === false && var2 === false

**Next actions:**
- Prima azione: "Prenota appuntamento con CAF o Patronato di zona"
- Documenti con prefissi: "Se cittadino extracomunitario:", "Se hai figli disabili:", ecc.

## ESEMPIO COMPLETO

\`\`\`json
{
  "title": "Bonus nuovi nati",
  "evaluation_mode": "incremental",
  "steps": [
    {
      "var": "cittadino_italiano_ue",
      "ask": "Il genitore richiedente è cittadino italiano o dell'Unione Europea? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "extracom_permesso",
      "ask": "Il genitore richiedente è cittadino extracomunitario con permesso di soggiorno valido? (sì/no)",
      "type": "boolean",
      "skip_if": "cittadino_italiano_ue === true"
    },
    {
      "var": "figli_in_tutela_o_affido",
      "ask": "Hai figli in affido o sotto tutela? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "documentazione_tutela",
      "ask": "Hai la documentazione comprovante? (sì/no)",
      "type": "boolean",
      "skip_if": "figli_in_tutela_o_affido === false"
    }
  ],
  "reasons_if_fail": [
    {
      "when": "cittadino_italiano_ue === false && extracom_permesso === false",
      "reason": "Requisito cittadinanza: il genitore richiedente deve essere cittadino italiano/UE oppure extracomunitario con permesso valido.",
      "check_after_vars": ["cittadino_italiano_ue", "extracom_permesso"],
      "blocking": true
    },
    {
      "when": "figli_in_tutela_o_affido === true && documentazione_tutela === false",
      "reason": "Per figli in affido o tutela è richiesta la documentazione comprovante.",
      "check_after_vars": ["figli_in_tutela_o_affido", "documentazione_tutela"],
      "blocking": true
    }
  ],
  "next_actions_if_ok": [
    "Prenota appuntamento con CAF o Patronato di zona",
    "Prepara documento di identità valido",
    "Se extracomunitario: prepara permesso di soggiorno valido"
  ]
}
\`\`\`

Nota: "figli_in_tutela_o_affido" è identico in var, skip_if, when e check_after_vars.`;

// Funzione per chiamare OpenAI
async function callOpenAI(systemPrompt, userMessage) {
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

  // Parse JSON
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid JSON from OpenAI: ${content}`);
  }
}

// Funzione per generare DSL (prima volta)
async function generateDSL(requisiti) {
  const userMessage = `## MODALITÀ: GENERAZIONE NUOVA DSL

REQUISITI DELLA PRATICA BUROCRATICA:
${requisiti}

ISTRUZIONI:
Genera una DSL completa che modelli questi requisiti.
Segui rigorosamente lo schema e le regole indicate sopra.

Genera SOLO il JSON valido, senza commenti o markdown code blocks.
Il JSON deve iniziare con { e terminare con }.`;

  return await callOpenAI(BASE_PROMPT, userMessage);
}

// Funzione per correggere DSL
async function correctDSL(requisiti, dsl, errori, tentativo) {
  const userMessage = `## MODALITÀ: CORREZIONE MIRATA

REQUISITI ORIGINALI (per contesto):
${requisiti}

DSL DA CORREGGERE:
\`\`\`json
${JSON.stringify(dsl, null, 2)}
\`\`\`

ERRORI DI VALIDAZIONE:
${errori.map((e, i) => `${i + 1}. ${e}`).join('\n')}

ISTRUZIONI:
Correggi SOLO gli errori elencati sopra.
Mantieni tutto il resto della DSL identico.
Verifica che i nomi delle variabili siano consistenti.

(Tentativo ${tentativo}/3)

Genera SOLO il JSON valido, senza commenti o markdown code blocks.
Il JSON deve iniziare con { e terminare con }.`;

  return await callOpenAI(BASE_PROMPT, userMessage);
}

// Funzione principale di test
async function testDSLGeneration(testCase) {
  const risultato = {
    testName: testCase.name,
    requisiti: testCase.requisiti,
    tentativi: [],
    dslFinale: null,
    valida: false
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Requisiti: ${testCase.requisiti.substring(0, 100)}...`);
  console.log();

  let dsl = null;
  let tentativo = 1;
  const MAX_TENTATIVI = 3;

  // Primo tentativo: generazione
  try {
    console.log(`⏳ Tentativo ${tentativo}/${MAX_TENTATIVI}: Generazione DSL...`);
    dsl = await generateDSL(testCase.requisiti);

    // Validazione
    const validationResult = validateDSLSchema(dsl);

    risultato.tentativi.push({
      numero: tentativo,
      tipo: 'generazione',
      valida: validationResult.valid,
      errori: validationResult.errors,
      dsl: JSON.parse(JSON.stringify(dsl))
    });

    if (validationResult.valid) {
      console.log(`✅ Tentativo ${tentativo}: DSL VALIDA!`);
      risultato.valida = true;
      risultato.dslFinale = dsl;
    } else {
      console.log(`❌ Tentativo ${tentativo}: ERRORI RILEVATI`);
      validationResult.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });

      // Loop di correzione
      tentativo++;
      while (tentativo <= MAX_TENTATIVI && !risultato.valida) {
        console.log(`\n⏳ Tentativo ${tentativo}/${MAX_TENTATIVI}: Correzione DSL...`);

        try {
          dsl = await correctDSL(testCase.requisiti, dsl, validationResult.errors, tentativo);
          const newValidation = validateDSLSchema(dsl);

          risultato.tentativi.push({
            numero: tentativo,
            tipo: 'correzione',
            valida: newValidation.valid,
            errori: newValidation.errors,
            dsl: JSON.parse(JSON.stringify(dsl))
          });

          if (newValidation.valid) {
            console.log(`✅ Tentativo ${tentativo}: DSL VALIDA!`);
            risultato.valida = true;
            risultato.dslFinale = dsl;
          } else {
            console.log(`❌ Tentativo ${tentativo}: ANCORA ERRORI`);
            newValidation.errors.forEach((err, i) => {
              console.log(`   ${i + 1}. ${err}`);
            });
          }

          Object.assign(validationResult, newValidation);
        } catch (error) {
          console.log(`❌ Tentativo ${tentativo}: ERRORE TECNICO - ${error.message}`);
          risultato.tentativi.push({
            numero: tentativo,
            tipo: 'correzione',
            valida: false,
            errori: [error.message],
            dsl: null
          });
        }

        tentativo++;
      }

      if (!risultato.valida) {
        console.log(`\n❌ FALLITO: Impossibile generare DSL valida dopo ${MAX_TENTATIVI} tentativi`);
      }
    }
  } catch (error) {
    console.log(`❌ Tentativo ${tentativo}: ERRORE TECNICO - ${error.message}`);
    risultato.tentativi.push({
      numero: tentativo,
      tipo: 'generazione',
      valida: false,
      errori: [error.message],
      dsl: null
    });
  }

  console.log(`\n📊 Risultato finale: ${risultato.valida ? '✅ VALIDA' : '❌ NON VALIDA'}`);

  return risultato;
}

// Funzione principale
async function main() {
  const args = process.argv.slice(2);

  // Leggi requisiti da file o da argomento
  let requisiti;
  let testName = 'DSL Test';

  if (args.length === 0) {
    console.error('❌ Errore: Nessun input fornito\n');
    console.log('Uso:');
    console.log('  node dsl-creation-test-runner.js <file-requisiti.txt>');
    console.log('  node dsl-creation-test-runner.js "Testo requisiti diretto"');
    console.log('\nEsempio:');
    console.log('  node dsl-creation-test-runner.js requisiti.txt');
    console.log('  node dsl-creation-test-runner.js "Bonus Nido per cittadini italiani..."');
    process.exit(1);
  }

  const input = args.join(' ');

  // Se il primo argomento è un file esistente, leggilo
  if (fs.existsSync(input) && fs.statSync(input).isFile()) {
    try {
      requisiti = fs.readFileSync(input, 'utf8').trim();
      testName = path.basename(input, path.extname(input));
      console.log(`📄 Requisiti caricati da: ${input}`);
    } catch (error) {
      console.error(`❌ Errore lettura file: ${error.message}`);
      process.exit(1);
    }
  } else {
    // Altrimenti usa il testo diretto
    requisiti = input;
    console.log(`📝 Requisiti forniti direttamente`);
  }

  if (!requisiti || requisiti.length < 10) {
    console.error('❌ Errore: Requisiti troppo brevi o vuoti');
    process.exit(1);
  }

  console.log(`🚀 DSL Creation Test Runner v1.0`);
  console.log(`🤖 Modello: ${OPENAI_CONFIG.model} (T=${OPENAI_CONFIG.temperature}, seed=${OPENAI_CONFIG.seed})`);
  console.log();

  // Esegui test
  const testCase = {
    name: testName,
    requisiti: requisiti
  };

  const risultato = await testDSLGeneration(testCase);

  // Salva risultati
  const timestamp = Date.now();
  const outputJsonPath = path.join(__dirname, `creation-test-result-${timestamp}.json`);
  fs.writeFileSync(outputJsonPath, JSON.stringify(risultato, null, 2));

  // Se DSL valida, salva anche la DSL finale
  if (risultato.valida && risultato.dslFinale) {
    const outputDslPath = path.join(__dirname, `dsl-created-${timestamp}.json`);
    fs.writeFileSync(outputDslPath, JSON.stringify(risultato.dslFinale, null, 2));
    console.log(`\n💾 DSL creata salvata in: ${outputDslPath}`);
  }

  console.log(`💾 Report completo salvato in: ${outputJsonPath}`);

  // Riepilogo errori per tentativo
  console.log(`\n${'='.repeat(60)}`);
  console.log(`RIEPILOGO ERRORI PER TENTATIVO`);
  console.log(`${'='.repeat(60)}`);

  risultato.tentativi.forEach(t => {
    if (t.errori.length > 0) {
      console.log(`\n❌ Tentativo ${t.numero} (${t.tipo}): ${t.errori.length} errori`);
      t.errori.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
    } else {
      console.log(`\n✅ Tentativo ${t.numero} (${t.tipo}): Nessun errore`);
    }
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Risultato finale: ${risultato.valida ? '✅ DSL VALIDA' : '❌ DSL NON VALIDA'}`);
  console.log(`Tentativi totali: ${risultato.tentativi.length}`);
  console.log(`${'='.repeat(60)}`);

  process.exit(risultato.valida ? 0 : 1);
}

// Esegui
main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});
