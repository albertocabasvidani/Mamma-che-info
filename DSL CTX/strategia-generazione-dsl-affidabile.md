# Strategia per Generazione DSL Affidabile con Input Umani Non Strutturati

**Problema:** Gli utenti non tecnici descrivono i requisiti in modo caotico e non strutturato. La generazione diretta DSL produce errori (es. DSL "Indennità disoccupazione" invece di "Congedo maternità").

**Obiettivo:** Garantire DSL corrette indipendentemente da come l'utente descrive i requisiti.

---

## Architettura Multi-Step Proposta

```
Input Utente (caos)
    ↓
[FASE 1] Normalizzazione Requisiti
    ↓
Requisiti Strutturati (JSON)
    ↓
[FASE 2] Generazione DSL
    ↓
DSL Candidata
    ↓
[FASE 3] Validazione Semantica
    ↓
Confidence Score
    ↓
Se < 80% → [FASE 4] Revisione Umana
    ↓
DSL Validata + Feedback Loop
```

---

## FASE 1: Normalizzazione Requisiti

### Scopo
Trasformare il testo libero dell'utente in un JSON strutturato che estrae informazioni chiave.

### Nodo n8n: "Code - Normalizza Requisiti"

**Input:**
- `$json.requisiti_utente` (testo libero)

**Output:**
```json
{
  "pratica": "Congedo di Maternità Obbligatoria",
  "categorie_ammesse": [
    "Lavoratore dipendente privato",
    "Lavoratore Gestione Separata",
    "Lavoratore autonomo",
    "Percettore NASPI"
  ],
  "categorie_escluse": [
    "Dipendente pubblico"
  ],
  "requisiti_bloccanti": [
    {
      "condizione": "Cittadinanza italiana/UE o permesso soggiorno valido",
      "chi": "Tutti"
    },
    {
      "condizione": "Almeno 1 contributo con aliquota maggiorata ultimi 12 mesi",
      "chi": "Gestione Separata"
    },
    {
      "condizione": "Regolarità versamento contributi periodo maternità",
      "chi": "Lavoratori autonomi"
    },
    {
      "condizione": "Essere in NASPI tra 2 mesi",
      "chi": "Percettori NASPI"
    }
  ],
  "requisiti_documentali": [
    "Certificato telematico gravidanza",
    "Documento identità",
    "Tessera sanitaria",
    "Busta paga (dipendenti)"
  ],
  "casi_speciali": [
    "Maternità anticipata (gravidanza a rischio - provvedimento ASL)",
    "Maternità anticipata (mansione a rischio - provvedimento Ispettorato)",
    "Flessibilità lavorativa (8°/9° mese)",
    "Allattamento a rischio",
    "Contratto tempo determinato scadenza entro 68 giorni",
    "Maternità dopo parto (bambino registrato anagrafe)",
    "Maternità precedente in altro ufficio"
  ],
  "timing": {
    "prima_parto": "Circa 2 settimane prima inizio maternità (2 mesi prima DPP)",
    "dopo_parto": "Circa 3 settimane dopo parto (registrazione anagrafica)"
  }
}
```

**System Prompt:**
```markdown
Sei un esperto nell'analisi di requisiti per pratiche burocratiche italiane.

Il tuo compito è estrarre e strutturare i requisiti da un testo scritto in modo informale da operatori di patronato.

IMPORTANTE:
- Identifica il NOME ESATTO della pratica burocratica
- Distingui tra categorie AMMESSE e ESCLUSE
- Distingui tra requisiti BLOCCANTI (che impediscono accesso) e DOCUMENTALI (da portare all'appuntamento)
- Identifica casi speciali che cambiano la procedura

Output richiesto in formato JSON con questa struttura:
{
  "pratica": "nome completo della pratica",
  "categorie_ammesse": ["categoria1", "categoria2"],
  "categorie_escluse": ["categoria_esclusa"],
  "requisiti_bloccanti": [
    {"condizione": "descrizione", "chi": "a chi si applica"}
  ],
  "requisiti_documentali": ["documento1", "documento2"],
  "casi_speciali": ["caso1", "caso2"],
  "timing": {
    "prima_parto": "quando richiedere se prima",
    "dopo_parto": "quando richiedere se dopo"
  }
}

NON aggiungere informazioni non presenti nel testo.
Se un campo non è chiaro, usa null.

Genera SOLO il JSON, senza markdown o commenti.
```

**User Message:**
```markdown
Analizza questi requisiti e strutturali:

${$json.requisiti_utente}
```

### Vantaggi Fase 1:
- ✅ Separa "comprensione" da "generazione DSL"
- ✅ Output intermedio verificabile dall'operatore
- ✅ Più facile debuggare dove fallisce
- ✅ Riutilizzabile per altre operazioni

---

## FASE 2: Generazione DSL da Requisiti Strutturati

### Scopo
Generare la DSL a partire dal JSON normalizzato (molto più affidabile del testo libero).

### Nodo n8n: "Code - Genera Prompt DSL da JSON"

**Input:**
- `$json.requisiti_normalizzati` (JSON dalla Fase 1)

**Modifiche al prompt generator esistente:**

```javascript
const requisitiNormalizzati = $json.requisiti_normalizzati;

// NUOVO: User message più strutturato
let userMessage = `## MODALITÀ: GENERAZIONE NUOVA DSL

PRATICA BUROCRATICA: ${requisitiNormalizzati.pratica}

## CATEGORIE AMMESSE
${requisitiNormalizzati.categorie_ammesse.map(c => `- ${c}`).join('\n')}

## CATEGORIE ESCLUSE
${requisitiNormalizzati.categorie_escluse.map(c => `- ${c}`).join('\n')}

## REQUISITI BLOCCANTI
${requisitiNormalizzati.requisiti_bloccanti.map(r =>
  `- ${r.condizione} (per: ${r.chi})`
).join('\n')}

## CASI SPECIALI (domande aggiuntive)
${requisitiNormalizzati.casi_speciali.map(c => `- ${c}`).join('\n')}

## DOCUMENTI DA PORTARE (per next_actions)
${requisitiNormalizzati.requisiti_documentali.map(d => `- ${d}`).join('\n')}

ISTRUZIONI:
Genera una DSL per la pratica "${requisitiNormalizzati.pratica}".
Il campo "title" DEVE essere esattamente: "${requisitiNormalizzati.pratica}"

Steps:
1. Prima verifica categoria (ammessa vs esclusa)
2. Poi verifica cittadinanza
3. Poi requisiti specifici per categoria
4. Poi casi speciali (con skip_if appropriati)

Genera SOLO il JSON valido, senza commenti o markdown code blocks.
Il JSON deve iniziare con { e terminare con }.`;

return {
  json: {
    systemPrompt: basePrompt, // quello esistente
    userMessage: userMessage,
    tentativo_numero: tentativi,
    max_tentativi: MAX_TENTATIVI,
    requisiti_utente: JSON.stringify(requisitiNormalizzati)
  }
};
```

### Vantaggi Fase 2:
- ✅ Input molto più chiaro per LLM
- ✅ Title esplicito nel prompt
- ✅ Struttura guidata (step 1, 2, 3...)
- ✅ Riduce ambiguità drasticamente

---

## FASE 3: Validazione Semantica

### Scopo
Verificare che la DSL generata corrisponda effettivamente ai requisiti originali.

### Nodo n8n: "Code - Valida Semantica DSL"

**Input:**
- `$json.requisiti_normalizzati` (JSON Fase 1)
- `$json.dsl` (DSL generata Fase 2)

**System Prompt:**
```markdown
Sei un validatore esperto di DSL per pratiche burocratiche italiane.

Il tuo compito è verificare che una DSL generata corrisponda correttamente ai requisiti originali.

Verifica:
1. Il "title" della DSL corrisponde al nome della pratica?
2. Le categorie ammesse sono rappresentate correttamente negli steps?
3. Le categorie escluse causano blocco (reasons_if_fail)?
4. Tutti i requisiti bloccanti sono presenti come reasons_if_fail?
5. I casi speciali sono rappresentati con domande e skip_if appropriati?
6. I documenti sono elencati in next_actions_if_ok?
7. Le variabili in check_after_vars corrispondono a quelle in steps?

Per ogni problema trovato, assegna un punteggio di gravità:
- CRITICO (50 punti): title sbagliato, categoria ammessa trattata come esclusa, requisito bloccante mancante
- ALTO (20 punti): caso speciale importante mancante, logica when invertita
- MEDIO (10 punti): documento mancante in next_actions, variabile inconsistente
- BASSO (5 punti): formulazione domanda poco chiara

Calcola confidence score: 100 - somma_penalità

Output JSON:
{
  "valida": true/false,
  "confidence": 0-100,
  "errori_critici": ["errore1", "errore2"],
  "errori_altri": ["errore3"],
  "suggerimenti": ["suggerimento1"]
}
```

**User Message:**
```markdown
## REQUISITI ORIGINALI NORMALIZZATI

${JSON.stringify($json.requisiti_normalizzati, null, 2)}

## DSL GENERATA DA VALIDARE

${JSON.stringify($json.dsl, null, 2)}

Analizza la corrispondenza e calcola il confidence score.
```

**Output Fase 3:**
```json
{
  "valida": false,
  "confidence": 45,
  "errori_critici": [
    "Title 'Indennità disoccupazione collaboratori' non corrisponde a pratica 'Congedo di Maternità Obbligatoria'",
    "Categoria 'Lavoratore autonomo' trattata come ESCLUSA ma nei requisiti è AMMESSA"
  ],
  "errori_altri": [
    "Manca requisito bloccante: registrazione bambino anagrafe per maternità dopo parto"
  ],
  "suggerimenti": [
    "Aggiungi step per distinguere dipendente pubblico vs privato"
  ]
}
```

### Logica Decisionale (IF Node):

```javascript
if ($json.confidence >= 80) {
  // DSL OK → prosegui
  return "valid";
} else if ($json.confidence >= 50) {
  // DSL dubbia → retry automatico con feedback
  return "retry_with_feedback";
} else {
  // DSL pessima → flag per revisione umana
  return "human_review";
}
```

---

## FASE 4: Feedback Loop e Miglioramento Continuo

### A) Retry con Feedback (confidence 50-79)

Quando il validator trova errori ma la DSL è recuperabile:

**Nodo: "Code - Genera Prompt Correzione con Feedback"**

```javascript
const erroriValidazione = [
  ...($json.errori_critici || []),
  ...($json.errori_altri || [])
];

// Mode = "correzione" (come già implementato)
// Ma aggiunge feedback del validator

const userMessage = `## MODALITÀ: CORREZIONE CON FEEDBACK VALIDATOR

REQUISITI ORIGINALI:
${JSON.stringify($json.requisiti_normalizzati, null, 2)}

DSL DA CORREGGERE:
${JSON.stringify($json.dsl, null, 2)}

ERRORI RILEVATI DAL VALIDATOR:
${erroriValidazione.map((e, i) => `${i + 1}. ${e}`).join('\n')}

CONFIDENCE SCORE: ${$json.confidence}/100 (minimo richiesto: 80)

ISTRUZIONI:
Correggi TUTTI gli errori elencati.
Verifica che il title corrisponda alla pratica.
Verifica che le categorie ammesse non siano bloccate.

(Tentativo ${tentativi}/${MAX_TENTATIVI})
`;
```

Torna alla Fase 2 (generazione) → Fase 3 (validazione) fino a confidence >= 80 o tentativi esauriti.

### B) Revisione Umana (confidence < 50)

Quando la DSL è troppo sbagliata per essere corretta automaticamente:

**Nodo: "Notification - Alert Operatore"**

Invia notifica (email/Slack/webhook):
```json
{
  "alert_type": "DSL_GENERATION_FAILED",
  "pratica": "Congedo di Maternità Obbligatoria",
  "confidence": 45,
  "requisiti_originali": "...",
  "dsl_generata": "...",
  "errori": ["..."],
  "azione_richiesta": "Revisione manuale e correzione DSL"
}
```

L'operatore:
1. Corregge manualmente la DSL
2. La DSL corretta viene salvata come "esempio golden"
3. Viene aggiunta al few-shot prompting (miglioramento continuo)

### C) Golden Examples Database

**Tabella Supabase/Notion: `dsl_golden_examples`**

```sql
CREATE TABLE dsl_golden_examples (
  id SERIAL PRIMARY KEY,
  pratica_nome TEXT NOT NULL,
  requisiti_originali TEXT,
  requisiti_normalizzati JSONB,
  dsl_corretta JSONB,
  data_creazione TIMESTAMP DEFAULT NOW(),
  validato_da TEXT,
  note TEXT
);
```

Quando confidence < 50 e operatore corregge:
- Salva esempio nella tabella
- Il sistema lo usa per few-shot prompting nei tentativi successivi

**Modifiche al System Prompt (Fase 2):**

```javascript
// Carica esempi golden per questa pratica
const goldenExamples = await fetchGoldenExamples(requisitiNormalizzati.pratica);

if (goldenExamples.length > 0) {
  const examplesText = goldenExamples.map(ex => `
### ESEMPIO: ${ex.pratica_nome}

Requisiti normalizzati:
${JSON.stringify(ex.requisiti_normalizzati, null, 2)}

DSL corretta:
${JSON.stringify(ex.dsl_corretta, null, 2)}
  `).join('\n\n');

  // Aggiungi al system prompt
  basePrompt += `\n\n## ESEMPI DI DSL CORRETTE PER PRATICHE SIMILI\n\n${examplesText}`;
}
```

---

## Workflow n8n Completo

```
[Chat Trigger]
    ↓
[Code: Estrai requisiti_utente da messaggio]
    ↓
[Code: Normalizza Requisiti] → OpenAI (temperature=0)
    ↓
[IF: Normalizzazione OK?]
    ├─ NO → Chiedi chiarimenti all'utente
    └─ SÌ ↓
        [Code: Genera Prompt DSL da JSON]
        ↓
        [OpenAI: Genera DSL] (temperature=0, seed=42)
        ↓
        [Code: Valida Schema] (validator esistente)
        ↓
        [IF: Schema valido?]
        ├─ NO → Retry loop (max 3)
        └─ SÌ ↓
            [Code: Valida Semantica] → OpenAI
            ↓
            [IF: Confidence >= 80?]
            ├─ SÌ → Return DSL valida
            ├─ 50-79 → Retry con feedback validator
            └─ < 50 → Alert operatore + Human review
```

---

## Metriche di Successo da Tracciare

Per ogni generazione DSL, salvare:

```json
{
  "session_id": "abc-123",
  "pratica": "Congedo Maternità",
  "timestamp": "2025-01-20T...",
  "fase_1_normalizzazione": {
    "success": true,
    "tokens_used": 450
  },
  "fase_2_generazione": {
    "tentativi": 2,
    "tokens_used": 2100
  },
  "fase_3_validazione": {
    "confidence_score": 85,
    "errori_trovati": 1
  },
  "risultato_finale": "success",
  "richiesta_human_review": false,
  "tempo_totale_ms": 12500
}
```

**Dashboard Notion/Supabase:**
- % DSL generate con successo (confidence >= 80)
- % che richiedono human review
- Pratiche più problematiche
- Tempo medio di generazione
- Token consumption

---

## Implementazione Incrementale

### Sprint 1 (Setup base)
- ✅ Implementa Fase 1 (Normalizzazione)
- ✅ Testa manualmente output normalizzazione
- ✅ Valida che catturi tutte le info chiave

### Sprint 2 (Generazione migliorata)
- ✅ Modifica Fase 2 per usare JSON normalizzato
- ✅ Testa con requisiti maternità
- ✅ Confronta DSL vecchia vs nuova

### Sprint 3 (Validazione semantica)
- ✅ Implementa Fase 3 (Validator)
- ✅ Testa confidence scoring
- ✅ Configura IF nodes per routing

### Sprint 4 (Feedback loop)
- ✅ Implementa retry con feedback
- ✅ Setup alert per human review
- ✅ Crea tabella golden examples

### Sprint 5 (Miglioramento continuo)
- ✅ Integra few-shot con golden examples
- ✅ Dashboard metriche
- ✅ Ottimizzazione prompt basata su dati

---

## Costi Stimati (OpenAI)

**Fase 1 - Normalizzazione:**
- Input: ~1500 tokens (requisiti + prompt)
- Output: ~500 tokens (JSON)
- Costo: ~$0.02 per generazione

**Fase 2 - Generazione DSL:**
- Input: ~2000 tokens (prompt + JSON normalizzato)
- Output: ~1500 tokens (DSL)
- Costo: ~$0.04 per tentativo (x max 3 = ~$0.12)

**Fase 3 - Validazione Semantica:**
- Input: ~2500 tokens (requisiti + DSL + prompt)
- Output: ~300 tokens (report validazione)
- Costo: ~$0.03 per validazione

**Totale per DSL con successo al 1° tentativo:** ~$0.09
**Totale per DSL con 3 tentativi:** ~$0.25
**Totale per DSL con human review:** ~$0.30 + tempo operatore

Con 100 DSL/mese e success rate 70% al primo tentativo:
- 70 DSL * $0.09 = $6.30
- 30 DSL * $0.25 = $7.50
- **Totale: ~$14/mese**

---

## Alternative da Considerare

### Opzione A: GPT-4o-mini per normalizzazione
- Fase 1 con GPT-4o-mini (più economico)
- Fase 2 e 3 con GPT-4o (più affidabile)
- Risparmio: ~50% su Fase 1

### Opzione B: Claude 3.5 Sonnet
- Migliore comprensione contestuale
- Costo simile a GPT-4o
- Da testare per confronto qualità

### Opzione C: Modelli open-source (self-hosted)
- Llama 3.1 70B o Mixtral 8x7B
- Costo zero (dopo setup infra)
- Qualità inferiore, richiede più tuning

---

## File di Configurazione Suggeriti

### `.env` per n8n
```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL_NORMALIZER=gpt-4o
OPENAI_MODEL_GENERATOR=gpt-4o
OPENAI_MODEL_VALIDATOR=gpt-4o

# Configurazione generazione
MAX_DSL_RETRIES=3
MIN_CONFIDENCE_SCORE=80
ENABLE_HUMAN_REVIEW_ALERTS=true

# Database golden examples
GOLDEN_EXAMPLES_TABLE=dsl_golden_examples
MAX_EXAMPLES_PER_PRATICA=3
```

---

## Next Steps (per domani)

1. **Decisione architetturale:** Vuoi implementare tutte e 4 le fasi o partire con Fase 1+2?

2. **Testing:** Testare Fase 1 (normalizzazione) con i requisiti maternità esistenti

3. **Setup infra:** Creare tabella golden_examples se vuoi Fase 4

4. **Metriche:** Decidere quali metriche tracciare e dove (Notion, Supabase, file?)

5. **Budget:** Confermare che ~$15-20/mese per OpenAI va bene

---

**Versione:** 1.0
**Data:** 2025-01-20
**Autore:** Claude Code
**Status:** Proposta da implementare
