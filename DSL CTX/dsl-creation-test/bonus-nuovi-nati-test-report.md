# Report Test Creazione DSL: Bonus Nuovi Nati

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

La DSL è stata generata correttamente al primo tentativo senza alcun errore di validazione.

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
      "reason": "È richiesta una DSU valida con indicatore ISEE minorenni in corso di validità e valore entro 40.000.",
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

1. **Gestione cittadinanza corretta**:
   - Step 1 verifica cittadinanza italiana/UE
   - Step 2 verifica extracomunitario con `skip_if` condizionale
   - Reason 1 valida entrambe le condizioni con operatore `&&`

2. **Validazione ISEE strutturata**:
   - Step 6 verifica presenza DSU valida
   - Step 7 raccoglie valore numerico (con skip se non valida)
   - Reason 5 valida sia presenza che soglia (≤ 40.000)

3. **Consistenza nomi variabili**:
   - Tutti i nomi in `check_after_vars[]` sono identici a `steps[].var`
   - Esempio: `richiesta_entra_120_giorni` (nome composto non abbreviato)

4. **Schema rispettato**:
   - `evaluation_mode`: `"incremental"` ✓
   - `type`: solo `"boolean"` e `"number"` ✓
   - `blocking`: sempre `true` (boolean) ✓

5. **Next actions ben strutturate**:
   - Prima azione: appuntamento CAF/Patronato
   - Documenti con prefisso condizionale: "Se extracomunitario: ..."

### Copertura Requisiti

| Requisito | Coperto | Step/Reason |
|-----------|---------|-------------|
| Cittadinanza IT/UE/Extracom | ✅ | Steps 1-2, Reason 1 |
| Residenza Italia | ✅ | Step 3, Reason 2 |
| Convivenza minore | ✅ | Step 4, Reason 3 |
| Nascita/adozione/affido | ✅ | Step 5, Reason 4 |
| ISEE valido ≤ 40.000 | ✅ | Steps 6-7, Reason 5 |
| Non cumulabilità | ✅ | Step 8, Reason 6 |
| Richiesta entro 120gg | ✅ | Step 9, Reason 7 |

**Copertura totale**: 7/7 requisiti ✓

---

## Conclusioni

Il prompt ottimizzato con GPT-4o (T=0, seed=42) ha generato una DSL perfettamente valida al primo tentativo, dimostrando:

- Eccellente comprensione dei requisiti
- Corretta applicazione delle regole di schema
- Consistenza nei nomi delle variabili
- Gestione appropriata di condizioni complesse (cittadinanza, ISEE)

**Risultato finale**: ✅ **Test superato con successo**
