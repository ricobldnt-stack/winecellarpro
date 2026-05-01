# Cave a vin offline-first (Next.js + IndexedDB + Supabase)

## 1) Installation

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## 2) Table Supabase + RLS

Executer `supabase/schema.sql` dans l'editeur SQL Supabase.

```sql
create table if not exists wines (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  year text,
  region text,
  grape text,
  quantity int default 0,
  notes text,
  updated_at timestamptz not null default now()
);
```

Puis activer l'auth Email/Password dans Supabase (Authentication > Providers).

## 3) Fonctionnement offline-first

- Les vins et la queue de sync sont dans IndexedDB.
- Les suppressions offline sont protegees par des tombstones.
- Les operations `add`, `update`, `delete` passent toujours en local d'abord.
- Si offline, les actions restent en queue et l'UI reste utilisable.
- Au retour du reseau (`online`), la sync pousse la queue vers Supabase puis fusionne local/remote en `last write wins` via `updatedAt`.
- La file de sync a un retry exponentiel (3 tentatives) avant report de l'action.
- La file est compressee automatiquement (dedup `add/update/delete`) pour limiter les requetes.
- Les donnees cloud sont scopees par utilisateur (`user_id`) avec policies RLS.
- Un historique local des synchronisations est conserve pour diagnostic (succes/erreurs/skips).

## 4) Fichiers importants

- `lib/db.js` : couche IndexedDB (`wines`, `sync_queue`, `tombstones`)
- `lib/supabase.js` : client Supabase + auth + `fetchWines`, `addWine`, `updateWine`, `deleteWine`
- `lib/wineRepository.js` : logique metier offline-first + synchronisation
- `components/WineCellarApp.js` : UI + detection online/offline + SW registration
- `public/sw.js` : cache offline (PWA de base)
- `supabase/schema.sql` : schema SQL + RLS pret a l'emploi

## 5) Renforcement production

- Gestion d'auth plus robuste (session/token invalide detectes).
- Synchronisation resiliente : retries + backoff exponentiel.
- Tableau d'historique de sync et compteur de queue dans l'interface.
