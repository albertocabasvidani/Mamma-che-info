#!/usr/bin/env node

/**
 * Test Setup - Verifica configurazione e dipendenze
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Test Setup N8N Workflow Simulator\n');
console.log('='.repeat(60));

let hasErrors = false;

// Test 1: File .env
console.log('\n[1] Verifica file .env');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('    ✅ File .env trovato');

  // Carica .env
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });

  if (process.env.OPENAI_API_KEY) {
    const key = process.env.OPENAI_API_KEY;
    const masked = key.substring(0, 8) + '...' + key.substring(key.length - 4);
    console.log(`    ✅ OPENAI_API_KEY configurata: ${masked}`);
  } else {
    console.log('    ❌ OPENAI_API_KEY non trovata in .env');
    hasErrors = true;
  }
} else {
  console.log('    ❌ File .env non trovato');
  console.log('       Crea: echo "OPENAI_API_KEY=sk-..." > .env');
  hasErrors = true;
}

// Test 2: File dipendenze
console.log('\n[2] Verifica file dipendenze');

const files = [
  'nodo-code-generazione-prompt.js',
  'dsl-schema-validator.js',
  'n8n-workflow-simulator.js'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`    ✅ ${file}`);
  } else {
    console.log(`    ❌ ${file} - NON TROVATO`);
    hasErrors = true;
  }
});

// Test 3: Sintassi JavaScript
console.log('\n[3] Verifica sintassi JavaScript nei nodi');

function checkSyntax(file) {
  try {
    const code = fs.readFileSync(path.join(__dirname, file), 'utf8');
    // Prova a validare sintassi (non esegue)
    new Function(code);
    console.log(`    ✅ ${file} - sintassi valida`);
    return true;
  } catch (error) {
    console.log(`    ❌ ${file} - errore: ${error.message}`);
    hasErrors = true;
    return false;
  }
}

checkSyntax('nodo-code-generazione-prompt.js');
checkSyntax('dsl-schema-validator.js');

// Test 4: Simulazione ambiente n8n
console.log('\n[4] Test simulazione ambiente n8n');

try {
  // Simula Prepare Prompt node
  const promptCode = fs.readFileSync(
    path.join(__dirname, 'nodo-code-generazione-prompt.js'),
    'utf8'
  );

  // Mock environment
  const $env = { MAX_DSL_RETRIES: '3' };
  const $json = {
    requisiti_utente: 'Test requisiti',
    tentativo_numero: 0,
    max_tentativi: 3
  };

  const result = eval(`(function() { ${promptCode} })()`);

  if (result.json && result.json.systemPrompt && result.json.userMessage) {
    console.log('    ✅ Nodo "Prepare Prompt" eseguibile');
    console.log(`       - systemPrompt: ${result.json.systemPrompt.length} caratteri`);
    console.log(`       - userMessage: ${result.json.userMessage.length} caratteri`);
    console.log(`       - tentativo_numero: ${result.json.tentativo_numero}`);
  } else {
    console.log('    ❌ Output nodo "Prepare Prompt" invalido');
    hasErrors = true;
  }
} catch (error) {
  console.log(`    ❌ Errore simulazione: ${error.message}`);
  hasErrors = true;
}

// Test 5: OpenAI API (ping)
console.log('\n[5] Test connessione OpenAI API');

async function testOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('    ⏭️  Saltato (OPENAI_API_KEY non configurata)');
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const hasGPT4o = data.data.some(m => m.id === 'gpt-4o');
      console.log(`    ✅ API key valida`);
      console.log(`    ${hasGPT4o ? '✅' : '⚠️'}  Modello gpt-4o ${hasGPT4o ? 'disponibile' : 'NON disponibile'}`);

      if (!hasGPT4o) {
        console.log('       Nota: Il workflow usa gpt-4o');
      }
    } else {
      const error = await response.text();
      console.log(`    ❌ API key invalida o quota esaurita`);
      console.log(`       ${response.status}: ${error}`);
      hasErrors = true;
    }
  } catch (error) {
    console.log(`    ❌ Errore connessione: ${error.message}`);
    hasErrors = true;
  }
}

// Test 6: Cartella output
console.log('\n[6] Verifica cartella output');

const testsDir = path.join(__dirname, 'tests');
if (!fs.existsSync(testsDir)) {
  fs.mkdirSync(testsDir, { recursive: true });
  console.log('    ✅ Cartella tests/ creata');
} else {
  console.log('    ✅ Cartella tests/ esistente');
}

// Summary
console.log('\n' + '='.repeat(60));

testOpenAI().then(() => {
  console.log('\n📊 RISULTATO TEST\n');

  if (hasErrors) {
    console.log('❌ FALLITO - Correggi gli errori sopra prima di eseguire il workflow');
    console.log('\nSuggerimenti:');
    console.log('  1. Crea file .env con OPENAI_API_KEY');
    console.log('  2. Verifica che tutti i file siano presenti');
    console.log('  3. Controlla la sintassi dei file JavaScript');
    process.exit(1);
  } else {
    console.log('✅ TUTTO OK - Pronto per eseguire il workflow!');
    console.log('\nEsempio:');
    console.log('  node n8n-workflow-simulator.js test-requisiti-semplice.txt');
    process.exit(0);
  }
});
