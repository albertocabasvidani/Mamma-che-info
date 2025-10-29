# Report Test Creazione DSL: bonus-nuovi-nati-requisiti

**Data**: 2025-10-20
**Modello**: gpt-4o (temperature=0, seed=42)
**Risultato**: ✅ **DSL VALIDA**
**Tentativi necessari**: 1/3

---

## Requisiti Forniti

- Cittadinanza: genitore richiedente cittadino italiano o dell'Unione Europea; cittadini extracomunitari con permesso di soggiorno valido.
- Residenza: residenza in Italia al momento della domanda.
- Convivenza: il minore deve essere residente e convivente con il genitore richiedente.
- Nascita/adozione/affidamento: il figlio deve essere nato, adottato o in affido preadottivo in Italia nell'anno di riferimento.
- ISEE: presenza di una Dichiarazione Sostitutiva Unica (DSU) valida con indicatore ISEE minorenni in corso di validità (valore entro 40.000).
- Non cumulabilità: non deve essere già stato richiesto da altro genitore per lo stesso figlio.
- La richiesta del bonus deve avvenire entro 120 giorni dal parto

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
  "title": "Bonus figli",
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
      "var": "residenza_italia",
      "ask": "Il genitore richiedente ha la residenza in Italia al momento della domanda? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "convivenza_minore",
      "ask": "Il minore è residente e convivente con il genitore richiedente? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "nascita_adozione_affido",
      "ask": "Il figlio è nato, adottato o in affido preadottivo in Italia nell'anno di riferimento? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "isee_valido",
      "ask": "Hai una Dichiarazione Sostitutiva Unica (DSU) valida con indicatore ISEE minorenni in corso di validità? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "isee_valore",
      "ask": "Qual è il valore dell'indicatore ISEE minorenni?",
      "type": "number",
      "skip_if": "isee_valido === false"
    },
    {
      "var": "non_cumulabilita",
      "ask": "Il bonus non è già stato richiesto da altro genitore per lo stesso figlio? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "richiesta_entra_120_giorni",
      "ask": "La richiesta del bonus avviene entro 120 giorni dal parto? (sì/no)",
      "type": "boolean"
    }
  ],
  "reasons_if_fail": [
    {
      "when": "cittadino_italiano_ue === false && extracom_permesso === false",
      "reason": "Requisito cittadinanza: il genitore richiedente deve essere cittadino italiano/UE oppure extracomunitario con permesso valido.",
      "check_after_vars": [
        "cittadino_italiano_ue",
        "extracom_permesso"
      ],
      "blocking": true
    },
    {
      "when": "residenza_italia === false",
      "reason": "Il genitore richiedente deve avere la residenza in Italia al momento della domanda.",
      "check_after_vars": [
        "residenza_italia"
      ],
      "blocking": true
    },
    {
      "when": "convivenza_minore === false",
      "reason": "Il minore deve essere residente e convivente con il genitore richiedente.",
      "check_after_vars": [
        "convivenza_minore"
      ],
      "blocking": true
    },
    {
      "when": "nascita_adozione_affido === false",
      "reason": "Il figlio deve essere nato, adottato o in affido preadottivo in Italia nell'anno di riferimento.",
      "check_after_vars": [
        "nascita_adozione_affido"
      ],
      "blocking": true
    },
    {
      "when": "isee_valido === false || isee_valore > 40000",
      "reason": "È necessaria una DSU valida con indicatore ISEE minorenni in corso di validità e valore entro 40.000.",
      "check_after_vars": [
        "isee_valido",
        "isee_valore"
      ],
      "blocking": true
    },
    {
      "when": "non_cumulabilita === false",
      "reason": "Il bonus non deve essere già stato richiesto da altro genitore per lo stesso figlio.",
      "check_after_vars": [
        "non_cumulabilita"
      ],
      "blocking": true
    },
    {
      "when": "richiesta_entra_120_giorni === false",
      "reason": "La richiesta del bonus deve avvenire entro 120 giorni dal parto.",
      "check_after_vars": [
        "richiesta_entra_120_giorni"
      ],
      "blocking": true
    }
  ],
  "next_actions_if_ok": [
    "Prenota appuntamento con CAF o Patronato di zona",
    "Prepara documento di identità valido",
    "Se extracomunitario: prepara permesso di soggiorno valido",
    "Prepara DSU valida con indicatore ISEE minorenni"
  ]
}
```

---

## Analisi della DSL

### Punti di Forza

1. **Struttura completa**:
   - 9 steps di raccolta dati
   - 7 condizioni di fallimento
   - 4 azioni successive

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
