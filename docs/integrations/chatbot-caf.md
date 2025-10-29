# Chatbot CAF - Documentazione Workflow

## Workflow Principale: Chatbot CAF

### Descrizione
Assistente AI conversazionale per un Centro di Assistenza Fiscale che guida gli utenti attraverso la verifica dei requisiti per pratiche burocratiche.

### ID Workflow
`CALZqcWyYavTAFOj`

### Stato
Inattivo

### Funzionamento

#### 1. Ricezione Messaggio
- Riceve messaggi chat tramite trigger "When chat message received"
- Estrae `sessionId` e `chatInput` dal messaggio

#### 2. Gestione Sessione
Verifica lo stato della sessione tramite DataTable e decide il flusso:
- **Nuova sessione**: crea una nuova conversazione
- **Cerca pratica**: identifica quale pratica burocratica l'utente richiede
- **Verifica requisiti**: raccoglie informazioni per verificare i requisiti
- **Appuntamento**: gestisce la prenotazione finale

#### 3. Ricerca Semantica Pratiche
- Usa vector store Supabase con embeddings OpenAI e reranker Cohere
- Cerca nel database di documenti che descrivono pratiche burocratiche
- Carica i dettagli da Notion (database con DSL - Domain Specific Language)

#### 4. AI Agent
L'agente AI (GPT-4o) gestisce la conversazione:
- Pone domande per verificare requisiti
- Usa tool per far avanzare la pratica
- Usa tool per recuperare lo status della sessione
- Mantiene memoria della conversazione (Simple Memory con buffer window di 10 messaggi)
- Elimina sessioni completate

#### 5. Risposta
- Verifica se la CTX è completata
- Se completata: passa allo stato "appuntamento"
- Risponde all'utente tramite "Respond to Chat"

### Componenti Principali
- **Nodi**: 32
- **Modello AI**: GPT-4o (temperatura 0.5)
- **Memoria**: Buffer window (10 messaggi)
- **Database**: Supabase per sessions, Notion per pratiche
- **Vector Store**: Supabase documents con embeddings OpenAI (1536 dimensioni)

---

## Sub-Workflow 1: Ottieni DSL

### ID Workflow
`x0kmPsvklZ3p6PJS`

### Scopo
Fornisce la definizione della pratica (Domain Specific Language)

### Comportamento
- Riceve in input: `codice-pratica`
- La DSL viene passata direttamente come parametro nel trigger del workflow
- Restituisce la DSL ricevuta in input

### Struttura DSL
```json
{
  "title": "Nome Pratica",
  "steps": [
    {
      "var": "nome_variabile",
      "ask": "Domanda da porre",
      "type": "number|boolean|string",
      "validate": "espressione di validazione"
    }
  ],
  "rules": [
    {
      "if": "condizione",
      "result": "ammissibile|non_ammissibile",
      "message": "Messaggio da mostrare"
    }
  ],
  "next_actions_if_ok": [
    "Azione 1",
    "Azione 2"
  ]
}
```

---

## Sub-Workflow 2: Avanzamento Pratica

### ID Workflow
`6voYBPbsIjjGQF7E`

### Scopo
Gestisce la logica di avanzamento della verifica requisiti

### Input
- `user_id`: ID utente
- `message`: Messaggio dell'utente
- `session_id`: ID sessione
- `dsl`: Oggetto DSL della pratica

### Comportamento

1. **Verifica Sessione**
   - Cerca se esiste già una sessione attiva su Supabase (tabella `rag_sessions`)

2. **Creazione/Caricamento CTX**
   - **Se NON esiste**: Chiama "Ottieni CTX" per creare un nuovo contesto, poi inizia una nuova sessione su Supabase
   - **Se esiste**: Carica il CTX esistente

3. **Code Runner**
   Esegue la logica di avanzamento in base allo status:

   - **Status "collecting"**:
     - Raccoglie le risposte dell'utente
     - Valida i dati secondo le regole definite nella DSL
     - Salva i valori in `ctx.variables`
     - Avanza al prossimo step (`ctx.step_index++`)
     - Restituisce la prossima domanda

   - **Status "checking"**:
     - Valuta le regole di ammissibilità definite nella DSL
     - Esegue le condizioni usando `Function()` con le variabili raccolte
     - Determina il risultato (ammissibile/non_ammissibile)
     - Passa allo status "complete"

   - **Status "complete"**:
     - Sessione conclusa
     - Può resettare se l'utente richiede "reset/ricomincia/nuova"

4. **Aggiornamento**
   - Aggiorna la sessione su Supabase con il nuovo CTX e status

5. **Output**
   - Restituisce `prossimoMsg`: il prossimo messaggio da mostrare all'utente

### Componenti
- **Nodi**: 12
- **Database**: Supabase (`rag_sessions`)
- **Validazione**: Dinamica tramite espressioni JavaScript

---

## Sub-Workflow 3: Ottieni CTX

### ID Workflow
`ny81A40zf4XyUvCx`

### Scopo
Crea il contesto (CTX) iniziale di una sessione

### Input
- `IDsessione`: ID della sessione
- `codicePratica`: Codice della pratica
- `dsl`: Oggetto DSL della pratica
- `IDutente`: ID dell'utente

### Comportamento

1. **Creazione CTX**
   Il nodo "Crea CTX" crea un nuovo CTX a partire dalla DSL:
   - Estrae i passi (steps) dalla DSL
   - Inizializza `variables` e `checklist` per ogni step
   - Crea la struttura CTX con:
     - `session_id`, `user_id`, `practice_code` (dal campo `title` della DSL)
     - `status: "collecting"`, `step_index: 0`
     - `history`, `last_prompt`, `last_user`, `last_result`

2. **Output**
   - Restituisce il CTX creato

### Struttura CTX
```json
{
  "session_id": "string",
  "user_id": "string",
  "practice_code": "string",
  "step_index": 0,
  "variables": {
    "var1": null,
    "var2": null
  },
  "checklist": {
    "var1": false,
    "var2": false
  },
  "history": [
    { "role": "system", "msg": "sessione creata" }
  ],
  "status": "collecting",
  "last_prompt": null,
  "last_user": null,
  "last_result": null
}
```

### Componenti
- **Nodi**: 9 (solo "Crea CTX" è connesso al trigger)
- **Logica**: JavaScript per parsing DSL e inizializzazione CTX

---

## Sub-Workflow 4: Recupera Status Sessione

### ID Workflow
`leeRAHiRJj6l2LXL`

### Scopo
Verifica lo stato di una sessione esistente

### Input
- `IDsessione`: ID della sessione da verificare

### Comportamento

1. **Ricerca Sessione**
   - Cerca la sessione su Supabase (tabella `rag_sessions`)
   - Limita a 1 risultato

2. **Valutazione**
   - Verifica se l'oggetto risultante è vuoto o meno

3. **Output**
   - **Se trovata**:
     - `statusSessione`: lo status corrente (collecting/checking/complete)
     - `messaggio`: l'ultimo prompt mostrato all'utente (`ctx.last_prompt`)

   - **Se NON trovata**:
     - `status: "null"`

### Utilizzo
Questo workflow è usato dall'AI Agent per decidere come procedere nella conversazione:
- Se status = "null": avvia nuova sessione
- Se status = "collecting": prosegue con la raccolta requisiti
- Se status = "complete": conclude e passa all'appuntamento

### Componenti
- **Nodi**: 5
- **Database**: Supabase (`rag_sessions`)

---

## Flusso Completo

```
1. Utente invia messaggio
   ↓
2. Chatbot CAF → Recupera Status Sessione
   ↓
3. Decision based on status:
   - null → Cerca Pratica (Vector Store) → Carica da Notion
   - collecting → Avanza Pratica → Code Runner → Aggiorna Supabase
   - complete → Passa ad appuntamento
   ↓
4. AI Agent elabora con GPT-4o
   ↓
5. Risponde all'utente
```

## Database Supabase

### Tabella: `rag_sessions`
Campi:
- `session_id`: ID univoco della sessione
- `user_id`: ID dell'utente
- `practice_code`: Codice della pratica
- `status`: Status corrente (collecting/checking/complete)
- `ctx`: Oggetto JSON con il contesto completo

### Tabella: `documents`
Vector store per la ricerca semantica delle pratiche:
- Contiene documenti che descrivono le pratiche burocratiche
- Usa embeddings OpenAI (1536 dimensioni)
- Ricerca con reranker Cohere (top 1 risultato)

## Notion Database

Contiene le pratiche con:
- `Nome`: Nome della pratica (campo title)
- `property_dsl`: La DSL completa della pratica

---

*Ultimo aggiornamento: 2025-10-08*
