# Report Test Creazione DSL: assegno-unico-requisiti

**Data**: 2025-10-20
**Modello**: gpt-4o (temperature=0, seed=42)
**Risultato**: ✅ **DSL VALIDA**
**Tentativi necessari**: 1/3

---

## Requisiti Forniti

- Il richiedente è cittadino italiano o dell'Unione Europea, oppure cittadino extracomunitario con permesso di soggiorno valido.
- I permessi di soggiorno validi sono: soggiornante di lungo periodo, permesso unico di lavoro con scadenza superiore a 6 mesi, protezione temporanea, rifugiato politico, protezione internazionale, carta blu, ricongiungimento familiare, assistenza minori, protezione speciale.
- Non sono validi i permessi per: attesa occupazione, studio, tirocinio, residenza elettiva o turismo.
- Ha almeno un figlio minorenne di età inferiore a 18 anni, oppure ha figli tra 18 e 21 anni che frequentano scuola o università, oppure ha figli tra 18 e 21 anni che svolgono tirocinio o lavoro con reddito annuo massimo 8.000 euro, oppure ha figli tra 18 e 21 anni disoccupati iscritti ai Centri per l'Impiego, oppure ha figli tra 18 e 21 anni che svolgono servizio civile, oppure ha figli con disabilità di qualsiasi età.
- Il richiedente non percepisce attualmente il Reddito di Cittadinanza. Se percepisce il Reddito di Cittadinanza, l'Assegno Unico viene corrisposto d'ufficio dall'INPS e non è necessario presentare domanda.

---

## Riepilogo Tentativi

| Tentativo | Tipo | Risultato | Errori |
|-----------|------|-----------|--------|
| 1 | Generazione | ✅ Valida | 0 |

---

## Dettaglio Tentativi

### Tentativo 1: Generazione

**Risultato**: ✅ **Valida**
**Errori**: Nessuno

La DSL è stata generata senza errori di validazione.

---

## DSL Finale Generata

```json
{
  "title": "Assegno Unico Universale",
  "evaluation_mode": "incremental",
  "steps": [
    {
      "var": "cittadino_italiano_ue",
      "ask": "Il richiedente è cittadino italiano o dell'Unione Europea? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "extracom_permesso_valido",
      "ask": "Il richiedente è cittadino extracomunitario con permesso di soggiorno valido? (sì/no)",
      "type": "boolean",
      "skip_if": "cittadino_italiano_ue === true"
    },
    {
      "var": "figlio_minorenne",
      "ask": "Hai almeno un figlio minorenne di età inferiore a 18 anni? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "figlio_18_21_scuola_universita",
      "ask": "Hai figli tra 18 e 21 anni che frequentano scuola o università? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "figlio_18_21_tirocinio_lavoro",
      "ask": "Hai figli tra 18 e 21 anni che svolgono tirocinio o lavoro con reddito annuo massimo 8.000 euro? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "figlio_18_21_disoccupato",
      "ask": "Hai figli tra 18 e 21 anni disoccupati iscritti ai Centri per l'Impiego? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "figlio_18_21_servizio_civile",
      "ask": "Hai figli tra 18 e 21 anni che svolgono servizio civile? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "figlio_disabile",
      "ask": "Hai figli con disabilità di qualsiasi età? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "percepisce_reddito_cittadinanza",
      "ask": "Il richiedente percepisce attualmente il Reddito di Cittadinanza? (sì/no)",
      "type": "boolean"
    }
  ],
  "reasons_if_fail": [
    {
      "when": "cittadino_italiano_ue === false && extracom_permesso_valido === false",
      "reason": "Requisito cittadinanza: il richiedente deve essere cittadino italiano/UE oppure extracomunitario con permesso valido.",
      "check_after_vars": [
        "cittadino_italiano_ue",
        "extracom_permesso_valido"
      ],
      "blocking": true
    },
    {
      "when": "figlio_minorenne === false && figlio_18_21_scuola_universita === false && figlio_18_21_tirocinio_lavoro === false && figlio_18_21_disoccupato === false && figlio_18_21_servizio_civile === false && figlio_disabile === false",
      "reason": "Devi avere almeno un figlio minorenne o un figlio tra 18 e 21 anni che soddisfi i requisiti specificati.",
      "check_after_vars": [
        "figlio_minorenne",
        "figlio_18_21_scuola_universita",
        "figlio_18_21_tirocinio_lavoro",
        "figlio_18_21_disoccupato",
        "figlio_18_21_servizio_civile",
        "figlio_disabile"
      ],
      "blocking": true
    },
    {
      "when": "percepisce_reddito_cittadinanza === true",
      "reason": "Se percepisci il Reddito di Cittadinanza, l'Assegno Unico viene corrisposto d'ufficio dall'INPS e non è necessario presentare domanda.",
      "check_after_vars": [
        "percepisce_reddito_cittadinanza"
      ],
      "blocking": true
    }
  ],
  "next_actions_if_ok": [
    "Prenota appuntamento con CAF o Patronato di zona",
    "Prepara documento di identità valido",
    "Se extracomunitario: prepara permesso di soggiorno valido"
  ]
}
```

---

## Analisi della DSL

### Punti di Forza

1. **Struttura completa**:
   - 9 steps di raccolta dati
   - 3 condizioni di fallimento
   - 3 azioni successive

2. **Schema rispettato**:
   - `evaluation_mode`: `"incremental"` ✓
   - Tutti i `type` sono validi (boolean/string/number) ✓
   - Tutti i `blocking` sono `true` ✓

3. **Consistenza nomi variabili**:
   - Tutti i nomi in `check_after_vars[]` corrispondono a `steps[].var` ✓

## Conclusioni

Il prompt ha generato una DSL valida al primo tentativo, dimostrando:

- Corretta comprensione dei requisiti
- Applicazione delle regole di schema
- Consistenza nei nomi delle variabili

**Risultato finale**: ✅ **Test superato con successo**
