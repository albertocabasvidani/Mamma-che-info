// Leggi tentativo corrente e incrementa
const tentativi = ($json.tentativo_numero || 0) + 1;
const mode = tentativi === 1 ? "generazione" : "correzione";

const basePrompt = `Sei un esperto nella conversione di requisiti burocratici italiani in DSL strutturata.

## SCHEMA DSL OBBLIGATORIO

\`\`\`json
{
  "dsl": {
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
- title: SEMPRE quello fornito dall'utente, NON inventarlo

**Steps:**
- Ogni step raccoglie UNA informazione
- Per cittadinanza: due step separati (italiano/UE, poi extracomunitario)
- Domande chiare con formato risposta (es. "sì/no")

**Gestione condizioni OR (FONDAMENTALE):**
- Quando un requisito ha ALTERNATIVE in OR (A OPPURE B OPPURE C OPPURE D...):
  * Prima alternativa: nessun skip_if
  * Ogni alternativa successiva: skip_if che verifica se QUALSIASI alternativa precedente è true
  * Pattern generale: skip_if: "alt1 === true || alt2 === true || ... || altN === true"
- Esempio con 3 alternative (ma vale per qualsiasi numero):
  * Step 1: var="opzione_a", ask="...", (nessun skip_if)
  * Step 2: var="opzione_b", ask="...", skip_if: "opzione_a === true"
  * Step 3: var="opzione_c", ask="...", skip_if: "opzione_a === true || opzione_b === true"
  * (Se ci fosse opzione_d: skip_if: "opzione_a === true || opzione_b === true || opzione_c === true")

**Domande condizionali (evitare ridondanze):**
- Se una domanda presuppone l'ASSENZA di qualcosa già dichiarato PRESENTE, skipparla
- Pattern: "domanda per chi NON ha X" → skip_if: "ha_dichiarato_x === true"
- Esempi:
  * "figlio non ancora nato" → skip_if se hai già dichiarato figli esistenti
  * "prima domanda" → skip_if se hai già dichiarato domanda precedente
  * "acquisto prima casa" → skip_if se hai già dichiarato proprietà casa
- Principio: se risposte precedenti rendono la domanda impossibile/nonsense, usa skip_if

**Reasons:**
- when: condizione JavaScript del fallimento
- check_after_vars: TUTTE le variabili usate in when
- Per "almeno uno" (OR multiple): when usa AND su tutte (var1 === false && var2 === false && var3 === false && ...)
- La condizione when verifica che TUTTE le alternative siano false

**Next actions:**
- Prima azione: "Prenota appuntamento con CAF o Patronato di zona"
- Documenti con prefissi: "Se cittadino extracomunitario:", "Se hai figli disabili:", ecc.

## ESEMPIO COMPLETO - Condizioni OR Multiple

\`\`\`json
{
  "dsl": {
    "title": "Assegno unico universale",
    "evaluation_mode": "incremental",
    "steps": [
      {
        "var": "figli_minorenni",
        "ask": "Hai almeno un figlio minorenne (fino a 18 anni) fiscalmente a carico? (sì/no)",
        "type": "boolean"
      },
      {
        "var": "figli_18_21_con_condizioni",
        "ask": "Hai almeno un figlio tra 18 e 21 anni fiscalmente a carico che frequenta scuola/università, svolge tirocinio/lavoro con reddito <8.000€, è disoccupato o svolge servizio civile? (sì/no)",
        "type": "boolean",
        "skip_if": "figli_minorenni === true"
      },
      {
        "var": "figli_disabili_qualsiasi_eta",
        "ask": "Hai figli disabili di qualsiasi età fiscalmente a carico? (sì/no)",
        "type": "boolean",
        "skip_if": "figli_minorenni === true || figli_18_21_con_condizioni === true"
      },
      {
        "var": "richiesta_per_figlio_non_nato",
        "ask": "Stai richiedendo per un figlio non ancora nato (prima del parto)? (sì/no)",
        "type": "boolean",
        "skip_if": "figli_minorenni === true || figli_18_21_con_condizioni === true || figli_disabili_qualsiasi_eta === true"
      },
      {
        "var": "percepisce_reddito_cittadinanza",
        "ask": "Percepisci il reddito di cittadinanza? (sì/no)",
        "type": "boolean"
      },
      {
        "var": "cittadino_italiano_ue",
        "ask": "Sei cittadino italiano o dell'Unione Europea? (sì/no)",
        "type": "boolean"
      },
      {
        "var": "extracom_permesso_valido",
        "ask": "Sei cittadino extracomunitario con permesso di soggiorno valido (NON turistico/studio/residenza elettiva/attesa occupazione/tirocinio)? (sì/no)",
        "type": "boolean",
        "skip_if": "cittadino_italiano_ue === true"
      }
    ],
    "reasons_if_fail": [
      {
        "when": "figli_minorenni === false && figli_18_21_con_condizioni === false && figli_disabili_qualsiasi_eta === false && richiesta_per_figlio_non_nato === false",
        "reason": "Requisito figli a carico: devi avere almeno un figlio minorenne (fino a 18 anni), oppure un figlio tra 18-21 anni con determinate condizioni, oppure un figlio disabile di qualsiasi età, oppure essere in attesa di un figlio.",
        "check_after_vars": ["figli_minorenni", "figli_18_21_con_condizioni", "figli_disabili_qualsiasi_eta", "richiesta_per_figlio_non_nato"],
        "blocking": true
      },
      {
        "when": "richiesta_per_figlio_non_nato === true",
        "reason": "Per figli non ancora nati, la domanda può essere presentata solo dopo il parto.",
        "check_after_vars": ["richiesta_per_figlio_non_nato"],
        "blocking": true
      },
      {
        "when": "percepisce_reddito_cittadinanza === true",
        "reason": "Non puoi percepire il reddito di cittadinanza per accedere all'assegno unico.",
        "check_after_vars": ["percepisce_reddito_cittadinanza"],
        "blocking": true
      },
      {
        "when": "cittadino_italiano_ue === false && extracom_permesso_valido === false",
        "reason": "Requisito cittadinanza: devi essere cittadino italiano/UE oppure extracomunitario con permesso di soggiorno valido (non turistico, studio, residenza elettiva, attesa occupazione o tirocinio).",
        "check_after_vars": ["cittadino_italiano_ue", "extracom_permesso_valido"],
        "blocking": true
      }
    ],
    "next_actions_if_ok": [
      "Prenota appuntamento con CAF o Patronato di zona",
      "Prepara documento di identità valido",
      "Se extracomunitario: prepara permesso di soggiorno valido",
      "Se hai figli disabili: prepara certificazione INPS di disabilità"
    ]
  }
}
\`\`\`

Nota: Le domande con alternative (OR) usano skip_if a catena. Le domande condizionali (che presuppongono assenza) usano skip_if per evitare ridondanze. I nomi delle variabili sono sempre identici in var, skip_if, when e check_after_vars.`;

let userMessage = '';

if (mode === "correzione") {
  // Costruisci sezione errori schema (se presenti)
  let erroriSchema = '';
  if ($json.errori_validazione && $json.errori_validazione.length > 0) {
    erroriSchema = `
ERRORI DI VALIDAZIONE SCHEMA:
${$json.errori_validazione.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
  }

  // Costruisci sezione errori semantici (se presenti)
  let erroriSemantici = '';
  if ($json.errori_semantici && $json.errori_semantici.length > 0) {
    erroriSemantici = `

ERRORI DI VALIDAZIONE SEMANTICA:
Confidence score: ${$json.confidence || 0}/100 (obiettivo: 100)
Copertura requisiti: ${$json.requisiti_coperti || 0}/${$json.requisiti_totali || 0}

Problemi rilevati:
${$json.errori_semantici.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Come correggere:
${($json.suggerimenti_correzione || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

Requisiti mancanti in DSL:
${($json.requisiti_mancanti && $json.requisiti_mancanti.length > 0)
  ? '- ' + $json.requisiti_mancanti.join('\n- ')
  : 'Nessuno'}

Elementi NON richiesti in checklist (allucinazioni):
${($json.allucinazioni && $json.allucinazioni.length > 0)
  ? '- ' + $json.allucinazioni.join('\n- ')
  : 'Nessuno'}`;
  }

  userMessage = `## MODALITÀ: CORREZIONE MIRATA

TITOLO DSL:
${$json.nome_pratica}

REQUISITI ORIGINALI (per contesto):
${$json.requisiti_utente}

DSL DA CORREGGERE:
\`\`\`json
${JSON.stringify({ dsl: $json.dsl_da_correggere }, null, 2)}
\`\`\`
${erroriSchema}${erroriSemantici}

ISTRUZIONI:
Correggi SOLO gli errori elencati sopra.
Mantieni tutto il resto della DSL identico.
Verifica che i nomi delle variabili siano consistenti.
Verifica corrispondenza ESATTA con checklist originale.
NO allucinazioni, NO elementi non richiesti.

Genera SOLO il JSON valido, senza commenti o markdown code blocks.
Il JSON deve iniziare con { e terminare con }.`;
} else {
  userMessage = `## MODALITÀ: GENERAZIONE NUOVA DSL

TITOLO DSL:
${$json.nome_pratica}

REQUISITI DELLA PRATICA BUROCRATICA:
${$json.requisiti_utente || $json.requisiti}

ISTRUZIONI:
Genera una DSL completa che modelli questi requisiti.
Segui rigorosamente lo schema e le regole indicate sopra.

Genera SOLO il JSON valido, senza commenti o markdown code blocks.
Il JSON deve iniziare con { e terminare con }.`;
}

return {
  json: {
    systemPrompt: basePrompt,
    userMessage: userMessage,
    tentativo_numero: tentativi,
    requisiti_utente: $json.requisiti_utente || $json.requisiti
  }
};
