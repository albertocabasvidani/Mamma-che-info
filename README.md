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
