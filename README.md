# Cave a vin en ligne (simple)

## 1) Installation

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## 2) Table Supabase

Executer `supabase/schema.sql` dans l'editeur SQL Supabase.

```sql
create table if not exists wines (
  id uuid primary key,
  name text not null,
  year text,
  region text,
  grape text,
  quantity int default 0,
  notes text,
  updated_at timestamptz not null default now()
);
```

Le plus simple: execute directement `supabase/schema.sql` dans SQL Editor.

## 3) Variables d'environnement

```
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_WINES_TABLE=wines
```

## 4) Fonctionnement

- Ouvre le site.
- Ajoute une bouteille.
- Modifie/supprime une bouteille.
- Tout est enregistre directement dans Supabase.
- Le meme tableau apparait sur tous tes appareils.
- Exporte la cave en `Excel (.xlsx)` ou `PDF` depuis les boutons en haut.

## 5) Fichiers utiles

- `components/WineCellarApp.js` : ecran principal
- `lib/supabase.js` : connexion Supabase et CRUD
- `supabase/schema.sql` : structure SQL
