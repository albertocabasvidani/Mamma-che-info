# DSL Tester - Verificatore Requisiti Pratiche Burocratiche

App web per testare DSL (Domain Specific Language) che verificano i requisiti di accesso alle pratiche burocratiche con valutazione incrementale.

🌐 **Demo Live**: https://albertocabasvidani.github.io/Mamma-che-info/

## 🎯 Caratteristiche

- ✅ **Valutazione Incrementale**: blocco immediato quando un requisito non è soddisfatto
- ✅ **Valutazione Batch**: raccolta completa dati prima della valutazione (modalità classica)
- ✅ **Monitoraggio CTX in tempo reale**: vedi lo stato della sessione ad ogni step
- ✅ **Compatibilità n8n**: codice utilizzabile direttamente nei Code nodes
- ✅ **Chat interattiva**: simula la conversazione con l'utente
- ✅ **Storico modifiche**: traccia tutte le variazioni del CTX

## 🚀 Utilizzo

### Online
Apri direttamente la demo: https://albertocabasvidani.github.io/Mamma-che-info/

### Locale
1. Scarica `index.html` o `DSL CTX/dsl-tester.html`
2. Apri il file nel browser
3. Nessuna installazione richiesta - tutto funziona client-side

## 📋 Struttura DSL

### Schema Semplice (Evaluation Mode: Incremental)

```json
{
  "title": "Assegno unico",
  "evaluation_mode": "incremental",
  "steps": [
    {
      "var": "reddito",
      "ask": "Qual è il tuo ISEE (in euro)?",
      "type": "number"
    }
  ],
  "reasons_if_fail": [
    {
      "when": "reddito > 25000",
      "reason": "Il reddito ISEE supera il limite di 25.000€.",
      "check_after_vars": ["reddito"],
      "blocking": true
    }
  ],
  "next_actions_if_ok": [
    "Prenota appuntamento con il CAF"
  ]
}
```

### Proprietà DSL

#### Root Level
- `title` (string): Nome della pratica
- `evaluation_mode` (string): `"incremental"` o `"batch"` (default: "batch")
- `steps` (array): Lista di domande da porre all'utente
- `reasons_if_fail` (array): Condizioni di inammissibilità
- `next_actions_if_ok` (array): Azioni da fare se ammissibile

#### Steps
- `var` (string): Nome variabile dove salvare la risposta
- `ask` (string): Domanda da porre all'utente
- `type` (string): `"string"`, `"number"`, o `"boolean"`
- `skip_if` (string, opzionale): Espressione JavaScript che, se vera, salta questo step

#### Reasons If Fail
- `when` (string): Espressione JavaScript che ritorna true se la condizione di fallimento è verificata
- `reason` (string): Messaggio da mostrare all'utente
- `check_after_vars` (array): Lista variabili necessarie per valutare questa regola
- `blocking` (boolean): Se true, ferma immediatamente la valutazione

## 🔄 Modalità di Valutazione

### Incremental Mode
Valuta ogni `reasons_if_fail` subito dopo aver raccolto le variabili specificate in `check_after_vars`. Se una regola con `blocking: true` fallisce, la valutazione si ferma immediatamente mostrando il motivo.

**Vantaggio**: L'utente scopre subito se non è ammissibile, senza dover rispondere a tutte le domande.

### Batch Mode
Raccoglie tutte le risposte, poi valuta tutte le `reasons_if_fail` alla fine. Mostra tutti i motivi di inammissibilità insieme.

**Vantaggio**: Controllo completo dello stato prima della decisione finale.

## ⏭️ Skip Condizionale (skip_if)

Il sistema supporta lo skip condizionale di step tramite la proprietà `skip_if`. Questo permette di saltare automaticamente domande non rilevanti in base alle risposte precedenti.

### Sintassi

```json
{
  "var": "extracom_permesso",
  "ask": "È extracomunitario con permesso di soggiorno valido? (sì/no)",
  "type": "boolean",
  "skip_if": "cittadino_italiano_ue === true"
}
```

### Come Funziona

1. Prima di mostrare uno step, il sistema valuta l'espressione `skip_if`
2. Se l'espressione ritorna `true`, lo step viene saltato automaticamente
3. Il sistema passa allo step successivo senza chiedere nulla all'utente
4. La variabile dello step saltato rimane `null` nel CTX

### Esempi d'Uso

**Esempio 1: Cittadinanza**
```json
{
  "steps": [
    {
      "var": "cittadino_italiano_ue",
      "ask": "Il genitore richiedente è cittadino italiano o UE? (sì/no)",
      "type": "boolean"
    },
    {
      "var": "extracom_permesso",
      "ask": "È extracomunitario con permesso di soggiorno valido? (sì/no)",
      "type": "boolean",
      "skip_if": "cittadino_italiano_ue === true"
    }
  ]
}
```

**Comportamento:**
- Se l'utente risponde "sì" alla prima domanda → la seconda viene saltata
- Se l'utente risponde "no" alla prima domanda → la seconda viene posta

**Esempio 2: Tipo di Evento**
```json
{
  "steps": [
    {
      "var": "evento_tipo",
      "ask": "Indica l'evento: nascita / adozione / affido",
      "type": "string"
    },
    {
      "var": "giorni_dal_parto",
      "ask": "Quanti giorni sono passati dal parto?",
      "type": "number",
      "skip_if": "String(evento_tipo).toLowerCase() !== 'nascita'"
    }
  ]
}
```

**Comportamento:**
- Se l'utente risponde "nascita" → viene chiesto "giorni_dal_parto"
- Se l'utente risponde "adozione" o "affido" → "giorni_dal_parto" viene saltato

### Note Tecniche

- L'espressione `skip_if` ha accesso a tutte le variabili raccolte fino a quel momento
- Se si verifica un errore nella valutazione di `skip_if`, lo step NON viene saltato (fail-safe)
- Gli step saltati vengono loggati in console con `[DBG] Skipping step...`
- Le validazioni in `reasons_if_fail` possono ancora riferirsi a variabili di step saltati (saranno `null`)

### Debugging

Per vedere quali step vengono saltati, apri la console del browser (F12) e cerca i messaggi:
```
[DBG] Skipping step 1 (extracom_permesso) - skip_if: cittadino_italiano_ue === true
```

## 📂 File Importanti

```
├── index.html                                    # App principale (web)
├── DSL CTX/
│   ├── dsl-tester.html                           # Copia app (sviluppo)
│   ├── schema-dsl-semplice-incrementale.json     # Esempio DSL semplice
│   ├── schema-dsl-incrementale.json              # Esempio DSL complesso
│   ├── codice elaborazione DSL incrementale.txt  # Codice per n8n
│   ├── codice creazione CTX 15-10-2025.txt       # Generatore CTX iniziale
│   └── bonus-nuovi-nati.json                     # Esempio DSL completo
```

## 🔧 Integrazione con n8n

Il codice in `codice elaborazione DSL incrementale.txt` è progettato per funzionare in un **Code node** di n8n.

### Input Atteso
```javascript
{
  "dsl": { /* schema DSL */ },
  "message": "risposta utente",
  "ctx": { /* context object */ }
}
```

### Output Restituito
```javascript
[{
  "json": {
    "reply": "Messaggio per l'utente",
    "ctx": { /* context aggiornato */ },
    "status": "collecting|checking|complete"
  }
}]
```

### Esempio Workflow n8n
1. **Webhook Trigger**: riceve messaggio utente
2. **Code Node**: elabora DSL con il codice fornito
3. **Response**: invia risposta all'utente

## 📊 Struttura CTX (Context)

```javascript
{
  "practice_code": "bonus_nuovi_nati",
  "step_index": 0,
  "status": "collecting",  // collecting | checking | complete
  "variables": {
    "reddito": null,
    "eta_figlio": null
    // ...altre variabili
  },
  "checklist": {
    "reddito": false,
    "eta_figlio": false
  },
  "history": [],
  "last_prompt": "Prima domanda...",
  "last_user": "",
  "last_result": null  // "ammissibile" | "non_ammissibile"
}
```

### Stati del CTX

#### Status Possibili
- **`"collecting"`**: Raccolta dati in corso (fa domande all'utente)
- **`"checking"`**: Valutazione finale (solo in batch mode)
- **`"complete"`**: Processo terminato (ammissibile o non ammissibile)

#### Flusso Stati - Incremental Mode

```
collecting → collecting → collecting
     ↓            ↓            ↓
  (check)      (check)      (check)
     ↓            ↓            ↓
   PASS?       FAIL? →  complete (non_ammissibile)
     ↓
   PASS?
     ↓
complete (ammissibile)
```

Quando una `reason` con `blocking: true` fallisce, il CTX passa **direttamente** da `"collecting"` a `"complete"` con `last_result: "non_ammissibile"`, saltando lo stato `"checking"`.

#### Flusso Stati - Batch Mode

```
collecting → collecting → collecting → checking → complete
                                          ↓
                                    (valuta tutto)
                                          ↓
                              ammissibile / non_ammissibile
```

#### Esempio CTX - Non Ammissibile (Incremental)

Utente inserisce ISEE = 30000 (> 25000):

```javascript
{
  "practice_code": "bonus_nuovi_nati",
  "step_index": 1,                    // Si ferma allo step che ha fallito
  "status": "complete",               // Va direttamente a complete
  "variables": {
    "reddito": 30000,                 // Solo questa variabile è valorizzata
    "eta_figlio": null,               // Le altre rimangono null
    "residenza": null
  },
  "checklist": {
    "reddito": true,                  // Solo questa è completata
    "eta_figlio": false,
    "residenza": false
  },
  "last_prompt": "Non risulti ammissibile.\n\nMotivo:\nIl reddito ISEE supera il limite di 25.000€.",
  "last_result": "non_ammissibile"
}
```

#### Esempio CTX - Ammissibile (Incremental)

Tutte le risposte passano i controlli:

```javascript
{
  "practice_code": "bonus_nuovi_nati",
  "step_index": 3,                    // Tutti gli step completati
  "status": "complete",
  "variables": {
    "reddito": 20000,
    "eta_figlio": 6,
    "residenza": true
  },
  "checklist": {
    "reddito": true,
    "eta_figlio": true,
    "residenza": true
  },
  "last_prompt": "Risulti ammissibile!\n\nProssimi passi:\n- Prenota appuntamento con il CAF\n- Prepara documento identità e attestazione ISEE",
  "last_result": "ammissibile"
}
```

## 💡 Esempi

### Esempio 1: Assegno Unico (Semplice)
- 3 domande (ISEE, età figlio, residenza)
- Valutazione incrementale
- Blocco immediato su ogni requisito
- File: `schema-dsl-semplice-incrementale.json`

### Esempio 2: Bonus Nuovi Nati (Complesso)
- 12 domande
- Requisiti multipli con dipendenze
- Condizioni OR (cittadino UE O extracomunitario con permesso)
- Validazioni temporali (entro 120 giorni dal parto)
- File: `schema-dsl-incrementale.json`

## 🛠️ Sviluppo

### Testare Nuova DSL
1. Apri l'app
2. Incolla il tuo JSON DSL nell'editor
3. Clicca "Genera CTX con la DSL sopra"
4. Inizia la conversazione

### Modificare il Codice
1. Modifica `index.html` (o `dsl-tester.html`)
2. Ricarica la pagina nel browser
3. Per push su GitHub:
```bash
git add .
git commit -m "Descrizione modifiche"
git push
```

## 📝 Note Tecniche

- **Nessuna dipendenza esterna**: tutto il codice è self-contained
- **Valutazione sicura**: usa `Function()` invece di `eval()`
- **Type conversion automatica**: gestisce string/number/boolean
- **Reset sessione**: comando "reset" per ricominciare
- **Debug integrato**: console.log per tracking problemi

## 🤝 Contributi

Per segnalare bug o proporre miglioramenti, apri una issue su GitHub.

## 📄 Licenza

Codice open source - utilizzabile liberamente per progetti pubblici o privati.

---

**Progetto**: Mamma che info
**Autore**: albertocabasvidani
**Ultimo aggiornamento**: Ottobre 2025
