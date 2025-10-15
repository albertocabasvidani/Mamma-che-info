# Setup VPS Hostinger - n8n + Supabase

Configurazione ottimizzata di n8n e Supabase su VPS Hostinger con Traefik per HTTPS automatico.

## 🚀 Servizi Installati

### n8n (Workflow Automation)
- **URL**: https://n8n.srv913085.hstgr.cloud
- **Versione**: Latest
- **RAM**: ~200-300MB

### Supabase (Backend as a Service)
- **Studio URL**: https://supabase.srv913085.hstgr.cloud
- **API URL**: http://31.97.122.39:8000
- **Versione**: Self-hosted latest (ottimizzata)
- **RAM**: ~661MB (7 container attivi)

### Traefik (Reverse Proxy)
- HTTPS automatico con Let's Encrypt
- Routing per tutti i servizi
- RAM: ~100MB

## 📊 Risorse VPS

- **RAM totale**: 3.8GB
- **RAM utilizzata**: ~1.4GB
- **RAM disponibile**: ~2.4GB
- **CPU**: Shared vCPU
- **Storage**: SSD

## 🔗 Integrazione n8n ↔ Supabase

I due servizi sono collegati tramite:
- **Docker network**: `supabase_default` e `root_default`
- **Nodo nativo Supabase** in n8n per operazioni database
- **PostgreSQL node** per query SQL dirette
- **HTTP Request** per chiamate API REST

## 📁 Struttura File

```
/root/
├── supabase/
│   └── docker/
│       ├── docker-compose.yml (configurazione base)
│       ├── docker-compose.override.yml (ottimizzazioni)
│       └── .env (credenziali e configurazione)
├── supabase_credentials.txt (credenziali accesso)
└── GUIDA_SUPABASE.md (backup guida)

/mnt/c/claude-code/Mamma che info/
├── README.md (questo file)
├── GUIDA_SUPABASE.md (guida completa)
└── docker-compose.override.yml (configurazione ottimizzata)
```

## 🔐 Credenziali

Tutte le credenziali sono salvate in:
- **VPS**: `/root/supabase_credentials.txt`
- Accesso via: `ssh root@31.97.122.39 'cat /root/supabase_credentials.txt'`

## 📚 Documentazione

Per la guida completa all'uso di Supabase (password, utenti, progetti, n8n), vedi:
- **[GUIDA_SUPABASE.md](GUIDA_SUPABASE.md)**

Include:
- ✅ Architettura e servizi attivi
- ✅ Come cambiare password
- ✅ Gestione utenti e progetti
- ✅ Integrazione con n8n (4 metodi)
- ✅ Comandi utili e troubleshooting
- ✅ Ottimizzazione risorse

## ⚙️ Architettura Supabase (Ottimizzata)

### Container Attivi (7)
- supabase-studio (Dashboard)
- supabase-db (PostgreSQL)
- supabase-kong (API Gateway)
- supabase-meta (Metadata)
- supabase-auth (Authentication)
- supabase-rest (PostgREST)
- supabase-vector (Logging)

### Servizi Disabilitati (6)
- ❌ analytics (monitoraggio)
- ❌ realtime (websocket)
- ❌ storage (file storage)
- ❌ functions (edge functions)
- ❌ supavisor (connection pooler)
- ❌ imgproxy (image optimization)

## 🛠️ Comandi Rapidi

### Verificare stato servizi
```bash
ssh root@31.97.122.39 'cd /root/supabase/docker && docker compose ps'
```

### Verificare uso RAM
```bash
ssh root@31.97.122.39 'free -h'
ssh root@31.97.122.39 'docker stats --no-stream | grep supabase'
```

### Riavviare Supabase
```bash
ssh root@31.97.122.39 'cd /root/supabase/docker && docker compose restart'
```

### Vedere log
```bash
ssh root@31.97.122.39 'cd /root/supabase/docker && docker compose logs -f studio'
```

## 🔄 Backup

### Database Supabase
```bash
ssh root@31.97.122.39 'docker exec supabase-db pg_dump -U postgres postgres | gzip' > backup_supabase_$(date +%Y%m%d).sql.gz
```

### n8n Workflows
I workflow sono salvati nel database interno di n8n. Esportali manualmente dal dashboard.

## 📞 Supporto

- **Documentazione Supabase**: https://supabase.com/docs
- **Documentazione n8n**: https://docs.n8n.io
- **Guide locali**: Vedi GUIDA_SUPABASE.md

---

**Ultimo aggiornamento**: Ottobre 2025
**VPS**: Hostinger (31.97.122.39)
**Configurazione**: Ottimizzata per risorse limitate (~4GB RAM)
