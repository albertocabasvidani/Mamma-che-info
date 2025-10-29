# Analisi Requisiti - Assegno Unico e Universale

**Data Analisi**: 16 Ottobre 2025
**Pratica**: Assegno Unico e Universale per i Figli a Carico
**Scopo**: Identificare requisiti essenziali per la creazione DSL

---

## 📋 TESTO SORGENTE ANALIZZATO

### CHI PUÒ RICHIEDERLO

- **Famiglie con figli minorenni** (fino a 18 anni)
- **Famiglie con figli 18-21 anni** se sussiste almeno uno di questi requisiti:
    - Frequentano scuola o università
    - Svolgono tirocinio o lavoro con reddito annuo max 8.000€
    - Sono iscritti ai Centri per l'Impiego (disoccupati)
    - Svolgono servizio civile
- **Famiglie con figli disabili** (senza limiti di età)

### CHI NON DEVE PRESENTARE DOMANDA

- Percettori di Reddito di Cittadinanza (corrisposto d'ufficio da INPS)

### TEMPISTICHE DI PRESENTAZIONE

#### NUOVI NATI
- **Quando presentare**: DOPO IL PARTO (anche se decorre da 2 mesi prima)
- **Entro 120 giorni dalla nascita**: per avere arretrati dal 7° mese
- **Dopo 120 giorni**: decorre dal mese di presentazione domanda
- **Maggiorazione**: +50% per tutto il primo anno di vita

#### FIGLI GIÀ NATI
- **Entro il 30 giugno**: arretrati da marzo
- **Dopo il 30 giugno**: dal mese successivo alla presentazione

#### FIGLI CHE COMPIONO 18 ANNI
- **ATTENZIONE**: L'assegno si blocca automaticamente
- **Azione richiesta**: Modificare domanda o presentarne una nuova (anche dal figlio stesso)

### DOCUMENTI NECESSARI

#### SEMPRE OBBLIGATORI
- Carta d'identità e tessera sanitaria valide del richiedente
- Tessera sanitaria valida del/i figlio/i
- IBAN intestato o cointestato al richiedente (2 IBAN se i genitori vogliono incassare separatamente la loro parte di contributo)

#### SE CITTADINO EXTRACOMUNITARIO
- Permesso di soggiorno valido o ricevuta di rinnovo
- Eventuali permessi di soggiorno dei figli

##### PERMESSI VALIDI
- Soggiornanti di lungo periodo
- Permesso unico di lavoro (dipendente/autonomo/stagionale) con scadenza > 6 mesi
- Protezione temporanea (inclusi Ucraini dal 2023)
- Apolidi, rifugiati politici, protezione internazionale
- Carta blu (lavoratori altamente qualificati)
- Cittadini di Marocco, Algeria, Tunisia (accordi euromediterranei)
- Familiari di cittadini UE (carta di soggiorno/soggiorno permanente)
- Ricongiungimento familiare
- Assistenza minori
- Protezione speciale
- Casi speciali (vittime di violenza/sfruttamento)

##### PERMESSI NON VALIDI
- Attesa occupazione
- Tirocinio e formazione professionale
- Studio
- Residenza elettiva
- Visite, affari, turismo

#### CASI PARTICOLARI
- **Figli disabili**: Verbale di invalidità
- **Affido/tutela**: Documentazione comprovante
- **Per maggiorazioni**: Documentazione attestante condizioni (es. contratto lavoro)

### MODIFICHE ALLA DOMANDA

#### QUANDO MODIFICARE
- Assunzione o perdita lavoro (influisce su maggiorazioni)
- Cambio composizione nucleo (separazioni, nuove convivenze)
- Nascita nuovo figlio
- Rinnovo permesso di soggiorno (URGENTE!)
- Figlio diventa maggiorenne
- Variazione invalidità figli
- Cambio IBAN

#### INTEGRAZIONE ISEE
- Possibile in qualsiasi momento dell'anno
- Importante rinnovare entro 28 febbraio per non perdere maggiorazioni

---

## ✅ REQUISITI ESSENZIALI (da includere nella DSL)

Questi requisiti determinano **SE hai diritto** all'appuntamento per richiedere l'assegno unico.

### Requisito 1: Status Cittadinanza/Permesso di Soggiorno

**Condizione**:
- Cittadino italiano o dell'Unione Europea
- **OPPURE** Cittadino extracomunitario con permesso di soggiorno valido tra quelli ammessi

**Fonte testo**:
- "CHI PUÒ RICHIEDERLO" (implicito)
- "SE CITTADINO EXTRACOMUNITARIO" → lista permessi validi/non validi

**Perché è essenziale**:
- Determina se hai diritto di accesso al beneficio
- Senza cittadinanza IT/UE o permesso valido = **INAMMISSIBILE**
- È un requisito normativo di base per accedere a prestazioni sociali

**Implementazione DSL**:
```json
{
  "var": "cittadino_italiano_ue",
  "ask": "Il richiedente è cittadino italiano o dell'Unione Europea? (sì/no)",
  "type": "boolean"
},
{
  "var": "extracom_permesso_valido",
  "ask": "Il richiedente è cittadino extracomunitario con permesso di soggiorno valido tra quelli ammessi (lavoro, protezione, ricongiungimento)? (sì/no)",
  "type": "boolean",
  "skip_if": "cittadino_italiano_ue === true"
}
```

**Validazione**:
```json
{
  "when": "cittadino_italiano_ue === false && extracom_permesso_valido === false",
  "reason": "Requisito cittadinanza: il richiedente deve essere cittadino italiano/UE oppure extracomunitario con permesso di soggiorno valido.",
  "check_after_vars": ["cittadino_italiano_ue", "extracom_permesso_valido"],
  "blocking": true
}
```

---

### Requisito 2: Presenza Figli a Carico

**Condizione**: Almeno una di queste condizioni deve essere vera:
- **Figli minorenni** (< 18 anni)
- **Figli 18-21 anni** con almeno una condizione tra:
  - Frequentano scuola o università
  - Svolgono tirocinio o lavoro con reddito annuo ≤ 8.000€
  - Sono iscritti ai Centri per l'Impiego
  - Svolgono servizio civile
- **Figli disabili** (senza limiti di età)

**Fonte testo**:
- "CHI PUÒ RICHIEDERLO" → tutte e tre le categorie

**Perché è essenziale**:
- È il presupposto fondamentale del beneficio
- "Assegno Unico per i **Figli a Carico**" - senza figli = **INAMMISSIBILE**
- Non puoi richiedere un assegno per figli se non hai figli

**Implementazione DSL**:
```json
{
  "var": "ha_figli_minorenni",
  "ask": "Ha figli di età inferiore a 18 anni? (sì/no)",
  "type": "boolean"
},
{
  "var": "ha_figli_18_21_condizioni",
  "ask": "Ha figli tra 18 e 21 anni che frequentano scuola/università, lavorano con reddito ≤8.000€, sono iscritti ai Centri per l'Impiego o svolgono servizio civile? (sì/no)",
  "type": "boolean",
  "skip_if": "ha_figli_minorenni === true"
},
{
  "var": "ha_figli_disabili",
  "ask": "Ha figli disabili (di qualsiasi età)? (sì/no)",
  "type": "boolean",
  "skip_if": "ha_figli_minorenni === true || ha_figli_18_21_condizioni === true"
}
```

**Validazione**:
```json
{
  "when": "ha_figli_minorenni === false && ha_figli_18_21_condizioni === false && ha_figli_disabili === false",
  "reason": "Requisito figli a carico: è necessario avere almeno un figlio minorenne, un figlio 18-21 anni nelle condizioni previste, o un figlio disabile.",
  "check_after_vars": ["ha_figli_minorenni", "ha_figli_18_21_condizioni", "ha_figli_disabili"],
  "blocking": true
}
```

---

### Requisito 3: Non Percettore di Reddito di Cittadinanza

**Condizione**:
- Non devi percepire Reddito di Cittadinanza

**Fonte testo**:
- "CHI NON DEVE PRESENTARE DOMANDA" → Percettori di RdC (corrisposto d'ufficio da INPS)

**Perché è essenziale**:
- Incompatibilità esplicita con RdC
- Se percepisci RdC = **NON DEVI PRESENTARE DOMANDA** (ti viene corrisposto automaticamente)
- È un blocco normativo esplicito

**Implementazione DSL**:
```json
{
  "var": "percepisce_rdc",
  "ask": "Percepisce attualmente il Reddito di Cittadinanza? (sì/no)",
  "type": "boolean"
}
```

**Validazione**:
```json
{
  "when": "percepisce_rdc === true",
  "reason": "Non è necessario presentare domanda: se percepisce Reddito di Cittadinanza, l'Assegno Unico viene corrisposto d'ufficio dall'INPS.",
  "check_after_vars": ["percepisce_rdc"],
  "blocking": true
}
```

---

## ❌ ELEMENTI ESCLUSI DAI REQUISITI

Tutti gli elementi presenti nel testo sono categorizzati di seguito, con spiegazione del perché NON sono requisiti essenziali per l'ammissibilità.

---

### 1. TEMPISTICHE DI PRESENTAZIONE

**Elementi esclusi**:
- Nuovi nati: entro 120 giorni dalla nascita / dopo 120 giorni
- Figli già nati: entro 30 giugno / dopo 30 giugno
- Figli che compiono 18 anni: modificare domanda

**Fonte testo**: "TEMPISTICHE DI PRESENTAZIONE" → tutte le sezioni

**Perché NON è un requisito**:
- Non determina **SE sei ammissibile**, ma solo **QUANDO** richiedere
- Influenza solo gli **arretrati** e la **decorrenza** del beneficio
- Puoi richiedere l'assegno in qualsiasi momento (ma potresti perdere arretrati)
- È una **ottimizzazione temporale** per massimizzare il beneficio, non un blocco all'accesso
- Anche presentando dopo le scadenze, sei comunque ammissibile (ricevi solo meno arretrati)

**Ruolo nella pratica**: Informazione post-ammissibilità per massimizzare il beneficio economico

**Esempio pratico**:
- Utente A presenta domanda entro 120 gg: **ammissibile** + arretrati dal 7° mese
- Utente B presenta domanda dopo 120 gg: **ammissibile** + decorre da mese presentazione
- Entrambi sono **AMMISSIBILI**, cambia solo l'importo e la decorrenza

---

### 2. DOCUMENTI NECESSARI

**Elementi esclusi**:
- Carta d'identità e tessera sanitaria valide
- IBAN intestato/cointestato
- Permesso di soggiorno (documento fisico)
- Verbale di invalidità (per figli disabili)
- Documentazione affido/tutela
- Contratto di lavoro (per maggiorazioni)

**Fonte testo**: "DOCUMENTI NECESSARI" → tutte le sezioni

**Perché NON è un requisito**:
- Sono documenti **DA PORTARE** all'appuntamento
- Non determinano **SE sei ammissibile**, ma servono per **COMPLETARE** la pratica
- Puoi essere ammissibile anche senza averli fisicamente con te (poi li recuperi e porti)
- Verificano l'identità e i dati, ma non l'accesso al diritto
- Mancanza documenti → appuntamento posticipato, NON inammissibilità

**Ruolo nella pratica**: Checklist operativa per la presentazione fisica della domanda

**Esempio pratico**:
- Hai diritto all'assegno ma hai perso la carta d'identità → **SEI AMMISSIBILE**, devi solo rinnovarla prima dell'appuntamento
- La mancanza del documento non ti toglie il **DIRITTO**, solo ti impedisce la **PROCEDURA** finché non lo recuperi

---

### 3. MAGGIORAZIONI

**Elementi esclusi**:
- +50% per primo anno di vita del figlio
- Maggiorazioni per lavoratori
- Maggiorazioni per famiglie numerose (implicito)

**Fonte testo**:
- "TEMPISTICHE DI PRESENTAZIONE" → "Maggiorazione: +50% per tutto il primo anno di vita"
- "MODIFICHE ALLA DOMANDA" → "Assunzione o perdita lavoro (influisce su maggiorazioni)"

**Perché NON è un requisito**:
- Sono **benefici aggiuntivi** SE sei già ammissibile
- Influenzano l'**importo** dell'assegno, non l'**accesso** all'assegno
- Richiedono documentazione extra, ma la loro mancanza non blocca la domanda base
- Sono variabili economiche di calcolo, non porte di accesso

**Ruolo nella pratica**: Calcolo dell'importo spettante (fase successiva all'ammissibilità)

**Esempio pratico**:
- Famiglia con neonato + lavoratore: assegno base + maggiorazione 50% + maggiorazione lavoro = **€€€**
- Famiglia con figlio 5 anni + disoccupato: assegno base = **€**
- Entrambi sono **AMMISSIBILI**, cambia solo l'importo ricevuto

---

### 4. MODIFICHE ALLA DOMANDA

**Elementi esclusi**:
- Assunzione o perdita lavoro
- Cambio composizione nucleo (separazioni, nuove convivenze)
- Nascita nuovo figlio
- Rinnovo permesso di soggiorno
- Figlio diventa maggiorenne
- Variazione invalidità figli
- Cambio IBAN

**Fonte testo**: "MODIFICHE ALLA DOMANDA" → "QUANDO MODIFICARE"

**Perché NON è un requisito**:
- Sono azioni **POST-appuntamento**
- Riguardano la **gestione** di una pratica già attiva
- Non determinano l'accesso iniziale, ma l'aggiornamento della situazione
- Presuppongono che tu sia già stato ammesso e stia ricevendo l'assegno

**Ruolo nella pratica**: Manutenzione della pratica nel tempo per adeguarla a cambiamenti

**Esempio pratico**:
- Sei già beneficiario dell'assegno
- Nasce un secondo figlio → devi **MODIFICARE** la domanda (non ripresentarla da zero)
- La modifica non rimette in discussione la tua ammissibilità iniziale

**Nota importante sul rinnovo permesso**:
- Anche se segnalato come "URGENTE!", non è un requisito iniziale
- È un obbligo di aggiornamento per mantenere il beneficio attivo
- Per la valutazione iniziale basta sapere: "Hai permesso valido?" (sì/no)

---

### 5. INTEGRAZIONE ISEE

**Elementi esclusi**:
- Presentazione ISEE
- Rinnovo entro 28 febbraio
- ISEE aggiornato

**Fonte testo**: "MODIFICHE ALLA DOMANDA" → "INTEGRAZIONE ISEE"

**Perché NON è un requisito**:
- Puoi richiedere l'assegno **anche senza ISEE**
- Senza ISEE prendi l'**importo minimo** forfettario
- Con ISEE prendi importo proporzionale al reddito (di solito maggiore)
- È una **ottimizzazione economica**, non un blocco all'accesso

**Ruolo nella pratica**: Determinazione dell'importo spettante (opzionale per massimizzare)

**Esempio pratico**:
- Famiglia A con ISEE 10.000€: assegno pieno (es. 200€/mese)
- Famiglia B con ISEE 50.000€: assegno ridotto (es. 50€/mese)
- Famiglia C senza ISEE: assegno minimo (es. 50€/mese)
- **TUTTE E TRE AMMISSIBILI**, cambia solo l'importo

**Nota sulle maggiorazioni**:
- Il testo dice "importante rinnovare entro 28 febbraio per non perdere maggiorazioni"
- Anche qui: perdi la **maggiorazione**, ma non l'**ammissibilità**
- Continui a ricevere l'assegno base

---

### 6. TIPOLOGIE SPECIFICHE DI PERMESSO DI SOGGIORNO

**Elementi parzialmente inclusi**:
- Lista di 11 permessi validi
- Lista di 5 permessi non validi

**Fonte testo**: "SE CITTADINO EXTRACOMUNITARIO" → "PERMESSI VALIDI / PERMESSI NON VALIDI"

**Perché parzialmente incluso**:
- La **validità del permesso** è un requisito (Requisito 1)
- Il **tipo specifico** di permesso può essere verificato in fase successiva o semplificato

**Semplificazione possibile per la DSL**:

**Opzione A - Domanda Semplificata**:
```json
{
  "var": "extracom_permesso_valido",
  "ask": "Ha un permesso di soggiorno valido per lavoro, protezione internazionale o ricongiungimento familiare? (sì/no)",
  "type": "boolean"
}
```

**Opzione B - Domanda Dettagliata**:
```json
{
  "var": "tipo_permesso",
  "ask": "Indica il tipo di permesso di soggiorno (scegli tra: lungo periodo, lavoro, protezione, ricongiungimento, altro)",
  "type": "string"
}
```

**Opzione C - Lista Completa** (più complessa ma precisa):
```json
{
  "var": "permesso_valido_categoria",
  "ask": "Il tuo permesso rientra in una di queste categorie? 1=Soggiornante lungo periodo, 2=Lavoro (dipendente/autonomo/stagionale >6 mesi), 3=Protezione (temporanea/internazionale/speciale), 4=Ricongiungimento familiare, 5=Altro valido, 6=Studio/turismo/attesa occupazione (NON valido)",
  "type": "number"
}
```

**Raccomandazione**: Usare **Opzione A** per la DSL di screening iniziale, poi verificare il tipo specifico durante l'appuntamento con l'operatore.

**Perché**:
- La lista completa è troppo dettagliata per un chatbot
- L'utente medio non conosce la classificazione tecnica del suo permesso
- Meglio chiedere macro-categoria e poi verificare il documento fisico all'appuntamento
- Evita errori di autovalutazione dell'utente

---

## 📊 RIEPILOGO FINALE

### Requisiti DSL (3 domande essenziali)

| # | Requisito | Domanda DSL | Tipo | Blocca se |
|---|-----------|-------------|------|-----------|
| 1 | Cittadinanza/Permesso | Cittadino IT/UE o extracom con permesso valido? | boolean (OR logic) | entrambi false |
| 2 | Figli a carico | Ha figli minorenni/18-21 con condizioni/disabili? | boolean (OR logic) | tutti false |
| 3 | No RdC | Percepisce Reddito di Cittadinanza? | boolean | true |

**Logica di valutazione**: Se tutti e 3 i requisiti sono soddisfatti → **AMMISSIBILE** → può prenotare appuntamento

---

### Elementi Esclusi (6 categorie)

| Categoria | Elementi | Perché Escluso | Ruolo Reale |
|-----------|----------|----------------|-------------|
| **1. Tempistiche** | Entro 120gg, entro 30/06, maggiorenne | Non blocca accesso, solo arretrati | Ottimizzazione beneficio |
| **2. Documenti** | CI, TS, IBAN, permesso fisico, verbali | Da portare, non determinano diritto | Checklist operativa |
| **3. Maggiorazioni** | +50% neonato, lavoro, numerose | Influenzano importo, non accesso | Calcolo importo |
| **4. Modifiche** | Lavoro, nascite, rinnovi, IBAN | Gestione post-attivazione | Manutenzione pratica |
| **5. ISEE** | Presentazione, rinnovo | Opzionale (importo minimo senza) | Ottimizzazione importo |
| **6. Tipo Permesso** | 11 validi, 5 non validi | Dettaglio verificabile dopo | Semplificabile in macro-categoria |

---

## 🎯 LOGICA APPLICATIVA

### Flusso Decisionale DSL

```
START
  ↓
[1] Cittadino IT/UE o extracom con permesso valido?
  ↓
  NO → INAMMISSIBILE (blocco: cittadinanza)
  ↓
  SÌ
  ↓
[2] Ha figli minorenni/18-21 condizioni/disabili?
  ↓
  NO → INAMMISSIBILE (blocco: nessun figlio a carico)
  ↓
  SÌ
  ↓
[3] Percepisce Reddito di Cittadinanza?
  ↓
  SÌ → NON NECESSARIO (già corrisposto d'ufficio)
  ↓
  NO
  ↓
AMMISSIBILE → Può prenotare appuntamento
  ↓
[POST-AMMISSIBILITÀ]
  - Informare su tempistiche ottimali (120gg, 30/06)
  - Fornire checklist documenti da portare
  - Spiegare maggiorazioni disponibili
  - Suggerire presentazione ISEE per massimizzare importo
```

---

## 📝 NOTE IMPLEMENTATIVE

### Per Creazione DSL

1. **Evaluation Mode**: Consigliato `"incremental"`
   - Blocco immediato su cittadinanza/permesso (non ha senso proseguire)
   - Blocco immediato su assenza figli (presupposto fondamentale)
   - Blocco immediato su RdC (informazione su auto-erogazione)

2. **Skip Conditions**:
   - Se cittadino IT/UE → salta domanda permesso extracomunitario
   - Se ha figli minorenni → salta domande su 18-21 e disabili (può comunque averne, ma basta uno per ammissibilità)

3. **Messaggio Finale AMMISSIBILE**:
   ```
   Risulti ammissibile all'Assegno Unico!

   Prossimi passi:
   - Prenota appuntamento con CAF o Patronato
   - Prepara documenti: carta identità, tessera sanitaria, IBAN
   - Se extracomunitario: porta permesso di soggiorno valido
   - Consigliato: presenta ISEE per massimizzare importo
   - Se neonato: presenta entro 120 giorni per arretrati
   ```

4. **Messaggio Finale INAMMISSIBILE**:
   - Personalizzare in base al requisito fallito
   - Fornire informazioni su cosa serve per diventare ammissibile

5. **Gestione Casi Particolari**:
   - Figli disabili: chiedere solo "Hai figli disabili?" (sì/no), il verbale si porta dopo
   - Affido/tutela: come sopra, documentazione verificata all'appuntamento
   - Maggiorazioni: non chiedere in screening iniziale, si ottimizzano dopo

---

## 🔍 VERIFICA COMPLETEZZA

### Checklist Copertura Testo Originale

| Sezione Testo | Categoria Analisi | Stato |
|---------------|-------------------|-------|
| CHI PUÒ RICHIEDERLO | Requisito 2 (figli) | ✅ |
| CHI NON DEVE PRESENTARE DOMANDA | Requisito 3 (no RdC) | ✅ |
| TEMPISTICHE - Nuovi nati | Escluso 1 (tempistiche) | ✅ |
| TEMPISTICHE - Figli già nati | Escluso 1 (tempistiche) | ✅ |
| TEMPISTICHE - Maggiorazione 50% | Escluso 3 (maggiorazioni) | ✅ |
| TEMPISTICHE - Figli 18 anni | Escluso 4 (modifiche) | ✅ |
| DOCUMENTI - Sempre obbligatori | Escluso 2 (documenti) | ✅ |
| DOCUMENTI - Extracomunitari | Requisito 1 + Escluso 2 | ✅ |
| DOCUMENTI - Permessi validi | Requisito 1 + Escluso 6 | ✅ |
| DOCUMENTI - Permessi non validi | Requisito 1 + Escluso 6 | ✅ |
| DOCUMENTI - Casi particolari | Escluso 2 (documenti) | ✅ |
| MODIFICHE - Quando modificare | Escluso 4 (modifiche) | ✅ |
| MODIFICHE - Integrazione ISEE | Escluso 5 (ISEE) | ✅ |

**Conferma**: ✅ Tutti gli elementi del testo originale sono stati analizzati e categorizzati.

---

## 📄 CONCLUSIONI

### Requisiti Essenziali (3)
Solo 3 requisiti determinano l'ammissibilità all'appuntamento per richiedere l'Assegno Unico:
1. Status cittadinanza/permesso valido
2. Presenza figli a carico nelle condizioni previste
3. Non percezione Reddito di Cittadinanza

### Tutto il Resto (escluso dal screening iniziale)
Tutti gli altri 23+ elementi presenti nel testo sono:
- Ottimizzazioni economiche (tempistiche, ISEE, maggiorazioni)
- Checklist operative (documenti)
- Gestione post-attivazione (modifiche)
- Dettagli verificabili dopo (tipo specifico permesso)

### Principio Guiding
**La DSL deve rispondere SOLO a**: *"Posso accedere al servizio?"*
**NON deve rispondere a**: *"Quanto prendo?"* o *"Cosa devo portare?"* o *"Come lo gestisco dopo?"*

Questi aspetti sono gestiti in fasi successive all'ammissibilità iniziale.

---

**Documento preparato per**: Creazione DSL Assegno Unico
**Next Step**: Implementare schema DSL JSON completo basato su questa analisi
