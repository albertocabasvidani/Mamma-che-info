# Test Results

Questa cartella contiene i risultati dei test di generazione DSL.

## Struttura

Ogni test ha una cartella dedicata con tre file:

```
{nome-test}/
├── requisiti.txt        # Requisiti in linguaggio naturale
├── test-report.md       # Report completo del test con analisi
└── dsl-generated.json   # DSL generata (se valida)
```

## Test Disponibili

### 1. bonus-nuovi-nati
Test per la pratica "Bonus Nuovi Nati"
- **Risultato**: ✅ Valida al 1° tentativo
- **Steps**: 9
- **Reasons**: 7

### 2. assegno-unico
Test per la pratica "Assegno Unico e Universale"
- **Risultato**: ✅ Valida al 1° tentativo
- **Steps**: 9
- **Reasons**: 3

## Come Aggiungere un Nuovo Test

1. Crea un file con i requisiti (es. `nuova-pratica-requisiti.txt`)
2. Esegui: `node dsl-creation-test-runner.js nuova-pratica-requisiti.txt`
3. I risultati saranno salvati automaticamente in `tests/nuova-pratica-requisiti/`

## Note

- I nomi delle cartelle sono derivati automaticamente dal nome del file requisiti
- Spazi e caratteri speciali vengono convertiti in trattini
- Ogni esecuzione sovrascrive i file precedenti nella cartella del test
