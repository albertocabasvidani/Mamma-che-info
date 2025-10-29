# Report Test Workflow N8N - checklist-bonus-nido-text

**Data**: 2025-10-29 10:12:41
**Modello**: gpt-4o (T=0, seed=42)
**Risultato**: ✅ **SUCCESSO**
**Tentativi**: 1/3
**Durata**: 13.37s

---

## Requisiti Input

```
# Checklist per la Domanda Bonus Asilo Nido INPS

## 1. Requisiti Generali
• Il genitore richiedente deve essere residente in Italia.
• Essere cittadino italiano, UE oppure extracomunitario con permesso di soggiorno valido.
• Il bambino deve avere meno di 3 anni (o compiere 3 anni nell'anno di riferimento).
• Il bambino deve far parte del nucleo familiare del richiedente.
• È possibile richiedere il bonus anche per bambini con gravi patologie croniche (supporto domiciliare).
• Il genitore deve sostenere la spesa per la retta di un asilo nido pubblico o privato autorizzato.

## 2. Limiti e Condizioni Economiche
• Importo massimo annuale variabile in base all'ISEE minorenni.
• Fino a €3.000 (o €3.600 per i nati dal 2024) per ISEE basso, €1.500 in assenza di ISEE.
• L'importo erogato non può superare la spesa effettiva per la retta.
• ISEE non obbligatorio ma consigliato per ottenere l'importo massimo.
• Per i nati dal 2024 non è più richiesto un altro figlio minore di 10 anni nel nucleo familiare per ottenere l'importo pieno.

## 3. Documentazione e Modalità di Domanda
• Presentare la domanda online sul portale INPS o tramite CAF/Patronato.
• Scadenza: entro il 31 dicembre dell'anno di riferimento.
• Allegare attestazione ISEE minorenni valida (facoltativa ma utile).
• Allegare fatture o ricevute di pagamento delle rette.
• In caso di supporto domiciliare, allegare certificazione medica della patologia.
• Tenere a disposizione i dati del genitore richiedente e del bambino.

## 4. Suggerimenti Pratici
• Richiedere e aggiornare l'ISEE prima di presentare la domanda.
• Verificare che l'asilo nido scelto sia accreditato o autorizzato.
• Caricare le ricevute tempestivamente per non rischiare ritardi nei pagamenti.
• Controllare regolarmente lo stato della pratica sul portale INPS.
```

---

## Riepilogo Tentativi

| # | Tipo | Risultato | Errori | Note |
|---|------|-----------|--------|------|
| 1 | generazione | ✅ Valida | 0 | Completato |

---

## Dettaglio Workflow per Tentativo

### Tentativo 1: Generazione

**Pipeline Nodes eseguiti:**

1. **Prepare Prompt**
   - Tentativo: 1
   - Modalità: generazione

2. **OpenAI**
   - Caratteri generati: 2693

3. **Validate DSL Schema**
   - Valida: Sì ✅
   - Retry flag: false

<details>
<summary>📄 DSL Generata (click per espandere)</summary>

```json
{
  "title": "Domanda Bonus Asilo Nido INPS",
  "evaluation_mode": "incremental",
  "steps": [
    {
      "var": "residente_in_italia",
      "ask": "Il genitore richiedente è residente in Italia? (sì/no)",
      "type": "boolean"
    },
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
      "var": "bambino_eta",
      "ask": "Il bambino ha meno di 3 anni o compie 3 anni nell'anno di riferimento? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "bambino_nucleo_familiare",
      "ask": "Il bambino fa parte del nucleo familiare del richiedente? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "bambino_patologie",
      "ask": "Il bambino ha gravi patologie croniche che richiedono supporto domiciliare? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "genitore_spesa_asilo",
      "ask": "Il genitore sostiene la spesa per la retta di un asilo nido pubblico o privato autorizzato? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "isee_minorenni",
      "ask": "Hai un'attestazione ISEE minorenni valida? (sì/no)",
      "type": "boolean"
    }
  ],
  "reasons_if_fail": [
    {
      "when": "residente_in_italia === false",
      "reason": "Il genitore richiedente deve essere residente in Italia.",
      "check_after_vars": [
        "residente_in_italia"
      ],
      "blocking": true
    },
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
      "when": "bambino_eta === false",
      "reason": "Il bambino deve avere meno di 3 anni o compiere 3 anni nell'anno di riferimento.",
      "check_after_vars": [
        "bambino_eta"
      ],
      "blocking": true
    },
    {
      "when": "bambino_nucleo_familiare === false",
      "reason": "Il bambino deve far parte del nucleo familiare del richiedente.",
      "check_after_vars": [
        "bambino_nucleo_familiare"
      ],
      "blocking": true
    },
    {
      "when": "genitore_spesa_asilo === false",
      "reason": "Il genitore deve sostenere la spesa per la retta di un asilo nido pubblico o privato autorizzato.",
      "check_after_vars": [
        "genitore_spesa_asilo"
      ],
      "blocking": true
    }
  ],
  "next_actions_if_ok": [
    "Prenota appuntamento con CAF o Patronato di zona",
    "Prepara documento di identità valido",
    "Se extracomunitario: prepara permesso di soggiorno valido",
    "Allega attestazione ISEE minorenni valida",
    "Allega fatture o ricevute di pagamento delle rette",
    "Se supporto domiciliare: allega certificazione medica della patologia",
    "Presenta la domanda online sul portale INPS o tramite CAF/Patronato",
    "Controlla regolarmente lo stato della pratica sul portale INPS"
  ]
}
```

</details>

---

## DSL Finale Validata ✅

```json
{
  "title": "Domanda Bonus Asilo Nido INPS",
  "evaluation_mode": "incremental",
  "steps": [
    {
      "var": "residente_in_italia",
      "ask": "Il genitore richiedente è residente in Italia? (sì/no)",
      "type": "boolean"
    },
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
      "var": "bambino_eta",
      "ask": "Il bambino ha meno di 3 anni o compie 3 anni nell'anno di riferimento? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "bambino_nucleo_familiare",
      "ask": "Il bambino fa parte del nucleo familiare del richiedente? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "bambino_patologie",
      "ask": "Il bambino ha gravi patologie croniche che richiedono supporto domiciliare? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "genitore_spesa_asilo",
      "ask": "Il genitore sostiene la spesa per la retta di un asilo nido pubblico o privato autorizzato? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "isee_minorenni",
      "ask": "Hai un'attestazione ISEE minorenni valida? (sì/no)",
      "type": "boolean"
    }
  ],
  "reasons_if_fail": [
    {
      "when": "residente_in_italia === false",
      "reason": "Il genitore richiedente deve essere residente in Italia.",
      "check_after_vars": [
        "residente_in_italia"
      ],
      "blocking": true
    },
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
      "when": "bambino_eta === false",
      "reason": "Il bambino deve avere meno di 3 anni o compiere 3 anni nell'anno di riferimento.",
      "check_after_vars": [
        "bambino_eta"
      ],
      "blocking": true
    },
    {
      "when": "bambino_nucleo_familiare === false",
      "reason": "Il bambino deve far parte del nucleo familiare del richiedente.",
      "check_after_vars": [
        "bambino_nucleo_familiare"
      ],
      "blocking": true
    },
    {
      "when": "genitore_spesa_asilo === false",
      "reason": "Il genitore deve sostenere la spesa per la retta di un asilo nido pubblico o privato autorizzato.",
      "check_after_vars": [
        "genitore_spesa_asilo"
      ],
      "blocking": true
    }
  ],
  "next_actions_if_ok": [
    "Prenota appuntamento con CAF o Patronato di zona",
    "Prepara documento di identità valido",
    "Se extracomunitario: prepara permesso di soggiorno valido",
    "Allega attestazione ISEE minorenni valida",
    "Allega fatture o ricevute di pagamento delle rette",
    "Se supporto domiciliare: allega certificazione medica della patologia",
    "Presenta la domanda online sul portale INPS o tramite CAF/Patronato",
    "Controlla regolarmente lo stato della pratica sul portale INPS"
  ]
}
```

**Statistiche DSL:**
- Steps: 8
- Conditions: 5
- Actions: 8

---

## Conclusioni

✅ **Test SUPERATO**: DSL valida generata dopo 1 tentativo/i.

Il workflow ha dimostrato:
- Corretta simulazione dell'ambiente n8n
- Generazione prompt efficace
- Validazione schema rigorosa
- Generazione corretta al primo colpo
