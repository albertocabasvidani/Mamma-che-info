# Prompt Validazione Allineamento Requisiti-DSL

## Scopo
Questo prompt verifica se i requisiti forniti dall'utente sono chiari e inequivocabili confrontandoli con la DSL generata. Se i requisiti sono ambigui, fornisce suggerimenti HTML formattati per aiutare l'utente a riformularli.

## Contesto
La DSL genera una conversazione automatica con un cittadino per verificare se ha i requisiti per una pratica burocratica. Requisiti ambigui portano a domande poco chiare o logica incoerente.

## Prompt Sistema

```
Sei un analista di requisiti per sistemi conversazionali.
```

## Prompt Utente

```
Sei un analista di requisiti per sistemi conversazionali.

CONTESTO:
Questa DSL genera una conversazione automatica con un cittadino per verificare
se ha i requisiti per una pratica burocratica. Il cittadino riceve domande
sequenziali (ask) e alcune vengono saltate (skip_if) in base alle risposte.

Se i requisiti sono ambigui:
- Il cittadino riceve domande poco chiare o nell'ordine sbagliato
- La logica skip_if potrebbe essere incoerente
- La pratica potrebbe essere approvata/rifiutata erroneamente

REQUISITI:
{{ $('On form submission').item.json.Requisiti }}

DSL:
{{ $json.dsl.toJsonString() }}

VERIFICA:
I requisiti sono abbastanza chiari da generare domande inequivocabili
per il cittadino?

CERCA PATTERN AMBIGUI:
1. Parentesi/eccezioni: "X (o Y in caso Z)" - cittadino riceverà domande diverse?
2. DSL separa casi ma requisiti non lo fanno - es. domande diverse per naturale/adottivo
3. skip_if con logica non esplicita - cittadino capirà perché non gli viene chiesto?
4. OR/AND impliciti - cittadino capirà se sono alternative o cumulative?

DOMANDA CHIAVE:
Un cittadino che legge i requisiti capirebbe esattamente quali domande riceverà?
Se NO → esito "rifare"

OUTPUT JSON:
{
  "esito": "ok" | "rifare",
  "suggerimenti": "..."
}

FORMATO SUGGERIMENTI (HTML):
<p><strong>AMBIGUITÀ:</strong> [cita il requisito ambiguo]</p>
<p><strong>PROBLEMA:</strong> [come confonde il cittadino in 1-2 frasi]</p>
<p><strong>RIFORMULA:</strong></p>
<ul>
  <li>[requisito riformulato 1]</li>
  <li>[requisito riformulato 2]</li>
</ul>

Se più ambiguità, separale con <hr>

Rispondi SOLO JSON.
```

## Schema JSON Response

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["esito", "suggerimenti"],
  "properties": {
    "esito": {
      "type": "string",
      "enum": ["ok", "rifare"],
      "description": "ok se requisiti chiari, rifare se ambigui"
    },
    "suggerimenti": {
      "type": "string",
      "description": "HTML formattato con <p>, <ul>, <li>, <strong>, <hr>"
    }
  },
  "additionalProperties": false
}
```

## Configurazione Nodo N8N

```javascript
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "Sei un analista di requisiti per sistemi conversazionali. Rispondi sempre e solo con JSON valido."
    },
    {
      "role": "user",
      "content": "..." // vedere "Prompt Utente" sopra
    }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "validazione_requisiti",
      "strict": true,
      "schema": {
        "type": "object",
        "required": ["esito", "suggerimenti"],
        "properties": {
          "esito": {
            "type": "string",
            "enum": ["ok", "rifare"]
          },
          "suggerimenti": {
            "type": "string"
          }
        },
        "additionalProperties": false
      }
    }
  }
}
```

## Pattern Ambigui Rilevati

1. **Condizioni tra parentesi**: "X (o Y in caso Z)" - non chiaro se Y sostituisce o integra X
2. **Separazione casi implicita**: DSL separa naturale/adottivo ma requisiti li mescolano
3. **skip_if non esplicito**: logica di skip non scritta chiaramente nei requisiti
4. **OR/AND impliciti**: non chiaro se condizioni sono alternative o cumulative

## Esempio Output

### Caso: requisiti chiari
```json
{
  "esito": "ok",
  "suggerimenti": ""
}
```

### Caso: requisiti ambigui
```json
{
  "esito": "rifare",
  "suggerimenti": "<p><strong>AMBIGUITÀ:</strong> Il bambino deve avere meno di 12 anni (o entro 12 anni dall'ingresso in famiglia in caso di adozione/affidamento)</p><p><strong>PROBLEMA:</strong> Non è chiaro se il limite di 12 anni vale per tutti con un'eccezione per adottivi, o se sono due regole separate. Il cittadino riceverà domande diverse a seconda dell'interpretazione.</p><p><strong>RIFORMULA:</strong></p><ul><li>Per genitori naturali: il bambino deve avere meno di 12 anni</li><li>Per genitori adottivi o affidatari: devono essere trascorsi meno di 12 anni dall'ingresso del bambino in famiglia</li></ul>"
}
```

## Note

- Approccio aggressivo: qualsiasi ambiguità porta a esito "rifare"
- Focus sul cittadino: i suggerimenti spiegano come l'ambiguità confonde l'utente finale
- HTML per leggibilità: i suggerimenti sono formattati per presentazione web
- Nessun filtro: non si ignorano casi edge o ambiguità minori
