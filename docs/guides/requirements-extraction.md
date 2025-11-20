# Linee Guida per la Generazione di DSL da Requisiti

Questo documento contiene il prompt per LLM e le linee guida per gli operatori umani per convertire requisiti burocratici in DSL strutturata.

---

## PROMPT PER LLM

```markdown
Sei un esperto nella conversione di requisiti burocratici italiani in una DSL (Domain-Specific Language) strutturata.

Il tuo compito è generare un JSON valido che modelli una pratica burocratica secondo questo schema:

**Struttura DSL:**
```json
{
  "title": "Nome della pratica",
  "evaluation_mode": "incremental",
  "steps": [ ... ],
  "reasons_if_fail": [ ... ],
  "next_actions_if_ok": [ ... ]
}
```

**Regole per gli steps:**
- Ogni step raccoglie UNA informazione
- Usa `type: "boolean"` per sì/no, `type: "string"` per scelte multiple, `type: "number"` per valori numerici
- Aggiungi `skip_if` quando uno step dipende da condizioni precedenti
- Per cittadinanza extracomunitaria, crea sempre due step separati: uno per italiani/UE, uno per extracomunitari
- Le domande devono essere chiare e complete, includendo tutte le opzioni quando rilevante

**Regole per reasons_if_fail:**
- Ogni reason verifica UN requisito
- `when` contiene la condizione JavaScript che determina il fallimento
- `check_after_vars` deve contenere TUTTE le variabili usate nel `when`
- `blocking: true` sempre
- Per requisiti "almeno uno di questi", usa condizioni AND (es: `var1 === false && var2 === false`)
- La reason deve spiegare chiaramente perché il requisito non è soddisfatto e cosa manca

**Regole per next_actions_if_ok:**
- Inizia sempre con "Prenota appuntamento con CAF o Patronato di zona"
- Elenca documenti necessari (identità, tessera sanitaria, ecc.)
- Specifica documenti per casi particolari con prefissi come "Se cittadino extracomunitario:", "Se hai figli disabili:", ecc.

**Esempio di mappatura:**
Input: "ISEE: presenza di una DSU valida con ISEE minorenni ≤ 40.000"
Output:
```json
{
  "var": "dsu_valida",
  "ask": "Hai una DSU (Dichiarazione Sostitutiva Unica) valida con indicatore ISEE minorenni in corso di validità? (sì/no)",
  "type": "boolean"
},
{
  "var": "isee_minorenni",
  "ask": "Qual è il valore ISEE minorenni in euro?",
  "type": "number"
}
```

E nella sezione reasons_if_fail:
```json
{
  "when": "dsu_valida === false",
  "reason": "Requisito ISEE: è necessaria una DSU valida con indicatore ISEE minorenni in corso di validità.",
  "check_after_vars": ["dsu_valida"],
  "blocking": true
},
{
  "when": "isee_minorenni > 40000",
  "reason": "Requisito ISEE: il valore dell'indicatore ISEE minorenni deve essere entro 40.000 euro.",
  "check_after_vars": ["isee_minorenni"],
  "blocking": true
}
```

**Input da elaborare:**
[INSERIRE QUI I REQUISITI]

Genera SOLO il JSON valido, senza commenti o spiegazioni.
```

---

## LINEE GUIDA PER LA COMPILAZIONE DEI REQUISITI

### 1. VALORI NUMERICI
Specificare sempre soglie e limiti precisi.
- ISEE ≤ 40.000 euro
- Entro 120 giorni dalla nascita
- Almeno 1 contributo negli ultimi 12 mesi
- Età tra 18 e 21 anni, reddito max 8.000 euro

### 2. CITTADINANZA
Separare sempre le due categorie:
- Cittadini italiani/UE
- Cittadini extracomunitari: specificare tipo permesso (lavoro, protezione internazionale, ricongiungimento familiare)

### 3. REQUISITI ALTERNATIVI (basta uno)
Usare "o" / "oppure" per chiarire che basta uno tra più opzioni:
- Figli < 18 anni oppure figli 18-21 con condizioni oppure figli disabili
- Nascita o adozione o affidamento preadottivo

### 4. REQUISITI CUMULATIVI (servono tutti)
Quando tutti devono essere soddisfatti, elencarli esplicitamente:
- Richiedente residente in Italia e minore residente e minore convivente con richiedente

### 5. REQUISITI CONDIZIONALI
Usare "se..." per requisiti che si applicano solo in certi casi:
- Se extracomunitario: permesso di soggiorno valido
- Se nascita: domanda entro 120 giorni dal parto
- Se lavoratore autonomo: categoria tra [elenco completo]

#### 5.1 REQUISITI CHE PRESUPPONGONO ASSENZA
Quando un requisito si applica solo a chi NON ha qualcosa, rendilo esplicito per evitare domande ridondanti.

**✓ BUONI ESEMPI:**
- "Se non hai già figli a carico: per nuovi nati la domanda può essere fatta solo dopo il parto"
- "Solo per chi non ha ancora presentato domanda: verificare termine scadenza"
- "Se non possiedi già un'abitazione: requisito prima casa"
- "Per chi non ha altri benefici attivi: incompatibilità con bonus X"

**✗ DA EVITARE (ambigui):**
- "Tempistiche per nuovi nati: domanda solo dopo parto" (sembra generale ma si applica solo se non hai già figli)
- "Requisito prima casa" (non chiaro se si applica a chi ha già casa)
- "Domanda entro 90 giorni" (da quando? solo per chi non ha già fatto domanda?)

**PERCHÉ È IMPORTANTE:**
Senza questa precisione, il sistema potrebbe generare domande nonsense tipo:
- Hai figli? → Sì
- Il figlio è già nato? → (domanda inutile, ovviamente sì se ho già figli!)

**COME RIFORMULARE:**
- Identifica prerequisito implicito (es. "nuovi nati" → presuppone nessun figlio esistente)
- Rendilo esplicito: "Se non hai già figli: ..."
- Oppure inverti la logica: "Almeno un figlio (già nato) OPPURE in attesa di un figlio"

### 6. SCELTE MULTIPLE
Elencare tutte le opzioni valide (non "varie", "diverse", ecc.):
- Situazione lavorativa: dipendente privato, gestione separata, autonomo, NASPI, dipendente pubblico, altro

### 7. DOCUMENTI CONDIZIONALI
Prefissare con "se":
- Se extracomunitario: permesso di soggiorno
- Se figlio disabile: verbale invalidità
- Se neonato entro 120 giorni: arretrati da 7° mese gravidanza

### 8. NON CUMULABILITÀ
Specificare esattamente con cosa è incompatibile:
- Non già richiesto dall'altro genitore per lo stesso figlio
- Se percepisce RdC, erogazione automatica (non serve domanda)

---

## TEMPLATE MINIMO

```
PRATICA: [Nome]

- Cittadinanza: [italiano/UE] ; [extracomunitario con permesso tipo X, Y, Z]
- Residenza: [chi dove, convivenza se serve]
- Caratteristiche beneficiario: [età/condizioni con valori numerici]
- ISEE: [tipo] ≤ [valore] euro
- Vincoli temporali: [evento in anno X] ; [domanda entro X giorni da Y]
- Se [condizione]: [requisito aggiuntivo]
- Non cumulabilità: [con cosa]
- Documenti base: [elenco]
- Se [condizione]: [documenti aggiuntivi]
```
