# Test_cursor - Frontend / Backend

## Structure

- `frontend/` : application Next.js (UI cave a vin)
- `backend/` : ressources backend (SQL Supabase)
- `frontend/legacy-tableur/` : ancienne version statique "Tableur en ligne"

## Lancer le frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Variables d'environnement (frontend/.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_WINES_TABLE=wines
```

## Initialiser la base (backend)

Executer `backend/supabase/schema.sql` dans SQL Editor Supabase.

## Fonctionnalites principales

- CRUD cave a vin en ligne (Supabase)
- Recherche et tri
- Pagination
- Export Excel / PDF
- Import Excel (remplacement du contenu)
