// Configurazione
const MAX_TENTATIVI = parseInt($env.MAX_DSL_RETRIES || $json.max_tentativi || '3');

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
  "dsl": {
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
}
\`\`\`

Nota: "figli_in_tutela_o_affido" è identico in var, skip_if, when e check_after_vars.`;

let userMessage = '';

if (mode === "correzione") {
  userMessage = `## MODALITÀ: CORREZIONE MIRATA

REQUISITI ORIGINALI (per contesto):
${$json.requisiti_utente}

DSL DA CORREGGERE:
\`\`\`json
${JSON.stringify({ dsl: $json.dsl_da_correggere }, null, 2)}
\`\`\`

ERRORI DI VALIDAZIONE:
${$json.errori_validazione.map((e, i) => `${i + 1}. ${e}`).join('\n')}

(Tentativo ${tentativi}/${MAX_TENTATIVI})

ISTRUZIONI:
Correggi SOLO gli errori elencati sopra.
Mantieni tutto il resto della DSL identico.
Verifica che i nomi delle variabili siano consistenti.

Genera SOLO il JSON valido, senza commenti o markdown code blocks.
Il JSON deve iniziare con { e terminare con }.`;
} else {
  userMessage = `## MODALITÀ: GENERAZIONE NUOVA DSL

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
    max_tentativi: MAX_TENTATIVI,
    requisiti_utente: $json.requisiti_utente || $json.requisiti
  }
};
