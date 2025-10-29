# Guida all'uso di Supabase su VPS Hostinger

## 📋 Informazioni di accesso

### Dashboard Supabase Studio
- **URL**: https://supabase.srv913085.hstgr.cloud
- **Username**: `supabase`
- **Password**: (vedi `/root/supabase_credentials.txt` sul VPS)

### API
- **URL**: http://31.97.122.39:8000
- **Anon Key**: (vedi credenziali)
- **Service Role Key**: (vedi credenziali)

### Database PostgreSQL
- **Host**: 31.97.122.39
- **Porta**: 5432
- **Database**: postgres
- **User**: postgres
- **Password**: (vedi credenziali)

---

## ⚙️ Architettura Installazione

Questa installazione Supabase è **ottimizzata per VPS** con solo i servizi essenziali per Studio UI e integrazione n8n.

### Container Attivi (7 servizi - ~661MB RAM)

- **supabase-studio** (151.8 MB) - Dashboard web
- **supabase-db** (136 MB) - Database PostgreSQL
- **supabase-meta** (131.3 MB) - Metadata management
- **supabase-kong** (126.4 MB) - API Gateway
- **supabase-vector** (67.9 MB) - Vector/logging
- **supabase-auth** (30.4 MB) - Authentication
- **supabase-rest** (17.4 MB) - PostgREST API

### Servizi Disabilitati (6 servizi)

Per ottimizzare l'uso della RAM, i seguenti servizi sono disabilitati:

- **analytics** - Monitoraggio e analytics (non necessario)
- **realtime** - WebSocket real-time (non usato nei workflow n8n)
- **storage** - File storage (non usato)
- **functions** - Edge functions (non usato)
- **supavisor** - Connection pooler (non necessario per uso locale)
- **imgproxy** - Image optimization (non usato)

### Configurazione Override

I servizi sono gestiti tramite `/root/supabase/docker/docker-compose.override.yml`:

```yaml
services:
  analytics:
    deploy:
      replicas: 0
  realtime:
    deploy:
      replicas: 0
  storage:
    deploy:
      replicas: 0
  functions:
    deploy:
      replicas: 0
  supavisor:
    deploy:
      replicas: 0
  imgproxy:
    deploy:
      replicas: 0
```

Per riattivare un servizio (es. storage):
```bash
cd /root/supabase/docker
# Rimuovi la sezione storage dal docker-compose.override.yml
# Poi riavvia
docker compose up -d
```

### Uso RAM

- **RAM totale VPS**: 3.8 GB
- **RAM Supabase**: ~661 MB
- **RAM disponibile**: ~2.4 GB
- **RAM n8n + altri servizi**: ~800 MB

---

## 🔐 Cambiare nome utente e password

### 1. Cambiare la password del Dashboard

```bash
ssh root@31.97.122.39

cd /root/supabase/docker

# Genera una nuova password sicura
NEW_PASSWORD=$(openssl rand -hex 16)
echo "Nuova password Dashboard: $NEW_PASSWORD"

# Aggiorna il file .env
sed -i "s/DASHBOARD_PASSWORD=.*/DASHBOARD_PASSWORD=${NEW_PASSWORD}/" .env

# Riavvia i servizi
docker compose restart kong

# Salva la nuova password
echo "Dashboard Password: $NEW_PASSWORD" >> /root/supabase_new_credentials.txt
```

### 2. Cambiare la password del Database PostgreSQL

⚠️ **ATTENZIONE**: Questa operazione richiede il riavvio completo di Supabase.

```bash
cd /root/supabase/docker

# Ferma tutti i container
docker compose down

# Genera nuova password
NEW_DB_PASSWORD=$(openssl rand -hex 24)
echo "Nuova password DB: $NEW_DB_PASSWORD"

# Aggiorna .env
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${NEW_DB_PASSWORD}/" .env

# Rimuovi i volumi (ATTENZIONE: cancella tutti i dati!)
docker compose down -v

# Riavvia con nuove password
docker compose up -d

# Salva la nuova password
echo "Database Password: $NEW_DB_PASSWORD" >> /root/supabase_new_credentials.txt
```

### 3. Rigenerare le chiavi JWT (Anon Key e Service Role Key)

```bash
cd /root/supabase/docker

# Genera nuovo JWT Secret
NEW_JWT_SECRET=$(openssl rand -hex 32)

# Aggiorna .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=${NEW_JWT_SECRET}/" .env

# Le chiavi Anon e Service Role devono essere JWT validi
# Per generarle correttamente, usa: https://supabase.com/docs/guides/self-hosting#api-keys
# Oppure mantieni quelle di default finché non configuri chiavi custom

# Riavvia
docker compose restart auth kong
```

---

## 👥 Gestione Utenti

### Aggiungere utenti tramite Dashboard

1. Accedi a: https://supabase.srv913085.hstgr.cloud
2. Nel menu laterale, clicca su **Authentication** → **Users**
3. Clicca sul pulsante **Add user**
4. Compila:
   - **Email**: indirizzo email dell'utente
   - **Password**: password iniziale
   - **Auto Confirm User**: attiva se vuoi confermare subito l'utente
5. Clicca **Create user**

### Aggiungere utenti tramite API

```bash
# Con curl
curl -X POST 'http://31.97.122.39:8000/auth/v1/admin/users' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "email_confirm": true
  }'
```

### Aggiungere utenti al database PostgreSQL

```bash
# Connettiti al database
docker exec -it supabase-db psql -U postgres

# Crea un nuovo utente
CREATE USER nuovo_utente WITH PASSWORD 'password_sicura';

# Concedi permessi
GRANT ALL PRIVILEGES ON DATABASE postgres TO nuovo_utente;

# Esci
\q
```

---

## 📦 Gestione Progetti

Supabase in modalità self-hosted ha un **progetto di default** già configurato.

### Visualizzare il progetto corrente

1. Accedi a: https://supabase.srv913085.hstgr.cloud
2. Vedrai **Default Project** nella barra superiore

### Creare un nuovo database/schema (equivalente a nuovo progetto)

```bash
# Connettiti al database
docker exec -it supabase-db psql -U postgres

# Crea un nuovo schema
CREATE SCHEMA nuovo_progetto;

# Imposta permessi
GRANT ALL ON SCHEMA nuovo_progetto TO postgres;
GRANT ALL ON SCHEMA nuovo_progetto TO authenticator;

# Usa il nuovo schema
SET search_path TO nuovo_progetto;

# Esci
\q
```

### Configurare più progetti (avanzato)

Per avere progetti completamente separati, devi:

1. **Creare una nuova istanza Supabase completa** (consigliato per isolamento totale)
2. **Usare schemi PostgreSQL separati** (più semplice, stesso database)

---

## 🔗 Collegare Supabase a n8n

### Metodo 1: Usando il nodo nativo Supabase (CONSIGLIATO)

Il nodo nativo Supabase di n8n supporta installazioni self-hosted ed è il metodo più semplice e completo.

#### Configurazione credenziali

1. In n8n, aggiungi un nodo **Supabase**
2. Clicca su **Create New Credentials**
3. Configura le credenziali Supabase:
   - **Host**: `http://supabase-kong:8000` (interno) o `http://31.97.122.39:8000` (esterno)
   - **Service Role Secret**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q`

⚠️ **IMPORTANTE - Fix Kong per n8n**:
Questa installazione include un fix nel file `/root/supabase/docker/volumes/api/kong.yml` per far funzionare il nodo nativo Supabase in n8n. Il fix rimuove l'header `Authorization` duplicato che causava errori "Authorization failed". **Non rimuovere** il plugin `request-transformer` da `kong.yml`!

#### Come recuperare il Service Role Secret

Il Service Role Secret **non è visibile in Studio** (installazioni self-hosted). Recuperalo così:

**Metodo 1 - Dal file credenziali (CONSIGLIATO):**
```bash
ssh root@31.97.122.39 'grep "Service Role Key" /root/supabase_credentials.txt'
```

**Metodo 2 - Dal file .env:**
```bash
ssh root@31.97.122.39 'grep "SERVICE_ROLE_KEY" /root/supabase/docker/.env'
```

**Metodo 3 - Da Windows/WSL (se hai accesso locale):**
```bash
ssh root@31.97.122.39 'cat /root/supabase_credentials.txt'
```

La chiave inizia con `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ed è un JWT lungo ~200 caratteri.

#### Operazioni disponibili

Il nodo nativo Supabase supporta:
- **Row**: Insert, Update, Delete, Get, Get All ✅ **Disponibile**
- **Auth**: Create user, Get user, Update user, Delete user ✅ **Disponibile**
- **Storage**: Upload file, Download file, Delete file ❌ **Non disponibile** (servizio disabilitato)

⚠️ **Nota**: Le operazioni **Storage** non funzionano perché il servizio è stato disabilitato per ottimizzare la RAM. Per riattivarlo:
```bash
cd /root/supabase/docker
# Rimuovi la sezione "storage:" da docker-compose.override.yml
docker compose up -d
```

#### Esempio: Leggere tutti i record da una tabella

1. Aggiungi nodo **Supabase**
2. Seleziona credenziali configurate
3. Operazione: **Row** → **Get All**
4. **Table**: Nome della tua tabella (es. `users`)
5. (Opzionale) **Return All**: Attiva per ottenere tutti i record
6. (Opzionale) **Filter**: Aggiungi filtri (es. `status=eq.active`)

#### Esempio: Inserire un nuovo record

1. Aggiungi nodo **Supabase**
2. Operazione: **Row** → **Insert**
3. **Table**: Nome della tua tabella
4. **Data to Send**: Choose Between List/JSON
   - Inserisci i dati da salvare

#### Esempio: Filtrare dati con query avanzate

Nella sezione **Additional Fields** → **Filter**, puoi usare la sintassi PostgREST:

- `status=eq.active` (uguale a)
- `age=gt.18` (maggiore di)
- `name=like.*john*` (contiene)
- `created_at=gte.2024-01-01` (maggiore o uguale a data)

### Metodo 2: Usando PostgreSQL Node

1. In n8n, aggiungi un nodo **Postgres**
2. Crea nuove credenziali:
   - **Host**: `31.97.122.39`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: (vedi `/root/supabase_credentials.txt`)
   - **SSL**: Disabilitato (sono sulla stessa rete interna)

### Metodo 3: Usando HTTP Request Node (API Supabase)

#### Configurazione credenziali

1. In n8n, crea credenziali **Supabase API**:
   - **Host**: `http://31.97.122.39:8000`
   - **Service Role Key**: (vedi `/root/supabase_credentials.txt`)

#### Esempio: Leggere dati da una tabella

```json
{
  "method": "GET",
  "url": "http://31.97.122.39:8000/rest/v1/nome_tabella",
  "headers": {
    "apikey": "YOUR_ANON_KEY",
    "Authorization": "Bearer YOUR_ANON_KEY"
  }
}
```

#### Esempio: Inserire dati

```json
{
  "method": "POST",
  "url": "http://31.97.122.39:8000/rest/v1/nome_tabella",
  "headers": {
    "apikey": "YOUR_SERVICE_ROLE_KEY",
    "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY",
    "Content-Type": "application/json"
  },
  "body": {
    "colonna1": "valore1",
    "colonna2": "valore2"
  }
}
```

### Metodo 4: Webhook da Supabase a n8n

1. **In n8n**: Crea un workflow con trigger **Webhook**
2. Copia l'URL del webhook (es: `https://n8n.srv913085.hstgr.cloud/webhook/supabase`)
3. **In Supabase**:
   - Vai su **Database** → **Webhooks**
   - Crea nuovo webhook
   - **Events**: Seleziona gli eventi (INSERT, UPDATE, DELETE)
   - **Table**: Seleziona la tabella
   - **Webhook URL**: Incolla l'URL di n8n
   - **HTTP Method**: POST

### Esempio workflow n8n completo (con nodo nativo Supabase)

```
[Trigger: Schedule] → [Supabase: Get All] → [Filter] → [Supabase: Update]
```

**Nodi:**
1. **Schedule Trigger**: Ogni ora
2. **Supabase Node**:
   - Operation: Row → Get All
   - Table: `users`
   - Filter: `status=eq.pending`
3. **IF Node**: Filtra utenti con condizioni specifiche
4. **Supabase Node**:
   - Operation: Row → Update
   - Table: `users`
   - Update Key: `id`
   - Fields to Send: `status = 'active'`

### Esempio workflow alternativo con PostgreSQL Node

```
[Trigger: Schedule] → [Postgres: SELECT] → [Filter] → [Postgres: UPDATE]
```

**Nodi:**
1. **Schedule Trigger**: Ogni ora
2. **Postgres Node**: SELECT * FROM users WHERE status = 'pending'
3. **IF**: Filtra utenti con condizioni specifiche
4. **Postgres Node**: UPDATE users SET status = 'active' WHERE id = {{$json.id}}

---

## 🛠️ Comandi Utili

### Verificare stato container

```bash
cd /root/supabase/docker
docker compose ps
```

### Vedere i log

```bash
# Tutti i log
docker compose logs -f

# Log di un servizio specifico
docker compose logs -f studio
docker compose logs -f db
docker compose logs -f auth
```

### Riavviare i servizi

```bash
# Riavvia tutto
docker compose restart

# Riavvia un servizio specifico
docker compose restart studio
```

### Fermare Supabase

```bash
docker compose down
```

### Avviare Supabase

```bash
docker compose up -d
```

### Backup del database

```bash
# Backup completo
docker exec supabase-db pg_dump -U postgres postgres > backup_$(date +%Y%m%d).sql

# Backup compresso
docker exec supabase-db pg_dump -U postgres postgres | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Ripristino del database

```bash
# Ripristina da backup
cat backup_20251007.sql | docker exec -i supabase-db psql -U postgres postgres

# Da backup compresso
gunzip -c backup_20251007.sql.gz | docker exec -i supabase-db psql -U postgres postgres
```

---

## 📊 Monitoraggio

### Verifica porte aperte

```bash
netstat -tulpn | grep -E ":(3000|8000|5432|4000)"
```

### Verifica spazio disco

```bash
docker system df
docker volume ls
```

### Pulizia spazio disco

```bash
# Rimuovi immagini non utilizzate
docker image prune -a

# Rimuovi volumi non utilizzati (ATTENZIONE: può cancellare dati!)
docker volume prune
```

---

## 🔒 Sicurezza

### Best Practices

1. **Cambia TUTTE le password di default** (vedi sezione sopra)
2. **Limita accesso al database**: Considera di chiudere la porta 5432 esterna
3. **Usa sempre HTTPS**: Il dashboard è già configurato su HTTPS
4. **Backup regolari**: Automatizza i backup del database
5. **Aggiorna regolarmente**:
   ```bash
   cd /root/supabase/docker
   docker compose pull
   docker compose up -d
   ```

### Chiudere porta PostgreSQL esterna

Se non hai bisogno di accesso diretto al database dall'esterno:

```bash
cd /root/supabase/docker

# Modifica docker-compose.yml
# Cambia la sezione supavisor da:
#   ports:
#     - 5432:5432
# A:
#   ports:
#     - 127.0.0.1:5432:5432

# Riavvia
docker compose up -d supavisor
```

---

## 📞 Supporto e Risorse

- **Documentazione Supabase**: https://supabase.com/docs
- **Self-hosting Guide**: https://supabase.com/docs/guides/self-hosting
- **API Reference**: https://supabase.com/docs/reference
- **Discord Community**: https://discord.supabase.com

### File importanti sul VPS

- **Configurazione**: `/root/supabase/docker/docker-compose.yml`
- **Variabili ambiente**: `/root/supabase/docker/.env`
- **Credenziali**: `/root/supabase_credentials.txt`
- **Log**: `docker compose logs -f`

---

## 🚨 Troubleshooting

### Container in restart continuo

```bash
# Verifica log
docker compose logs nome_container

# Riavvia completamente
docker compose down
docker compose up -d
```

### Database non accessibile

```bash
# Verifica container db
docker compose ps db

# Verifica log database
docker compose logs db

# Test connessione
docker exec supabase-db psql -U postgres -c "SELECT 1"
```

### Studio non carica

```bash
# Verifica log studio
docker compose logs studio

# Riavvia studio
docker compose restart studio

# Verifica Traefik
docker logs root-traefik-1 | grep supabase
```

### Nodo Supabase n8n: "Authorization failed"

Se il nodo nativo Supabase in n8n restituisce "Authorization failed" anche con credenziali corrette:

**Causa**: n8n invia header `Authorization` e `apikey` contemporaneamente, creando conflitto.

**Soluzione**: Il fix è già applicato in questa installazione (`request-transformer` plugin in Kong). Se hai rimosso il file `kong.yml`, ripristinalo:

```bash
cd /root/supabase/docker

# Se hai il backup
cp volumes/api/kong.yml.backup volumes/api/kong.yml

# Altrimenti aggiungi manualmente a rest-v1 service:
# Dopo "- name: acl" aggiungi:
#   - name: request-transformer
#     config:
#       remove:
#         headers:
#           - Authorization

# Riavvia Kong
docker compose restart kong
```

### Spazio disco pieno

```bash
# Verifica spazio
df -h

# Pulisci Docker
docker system prune -a --volumes

# ATTENZIONE: questo comando elimina TUTTI i volumi non utilizzati!
```

---

## 📈 Ottimizzazione Risorse

### Monitorare uso RAM

```bash
# RAM totale sistema
free -h

# RAM per container Supabase
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" | grep supabase

# RAM totale Supabase
docker stats --no-stream --format "{{.MemUsage}}" | grep -oE '^[0-9.]+[A-Za-z]+' | awk '{s+=$1}END{print s "MB"}'
```

### Ottimizzare ulteriormente

Se hai bisogno di ancora meno RAM:

1. **Disabilita vector** (logging, ~68MB):
   ```bash
   # Aggiungi a docker-compose.override.yml
   vector:
     deploy:
       replicas: 0
   ```

2. **Usa PostgreSQL esterno**: Sposta il DB su servizio gestito per risparmiare ~136MB

3. **Limita memoria container**:
   ```yaml
   services:
     db:
       deploy:
         resources:
           limits:
             memory: 256M
   ```

---

**Ultimo aggiornamento**: Ottobre 2025
**Versione Supabase**: Self-hosted latest (ottimizzata)
**Server**: VPS Hostinger (31.97.122.39)
**Configurazione**: 7 container attivi, 6 disabilitati, ~661MB RAM
