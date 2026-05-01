"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createWine,
  editWine,
  getPendingActionsCount,
  getSyncHistory,
  hasPendingActions,
  loadLocalWines,
  removeWine,
  synchronize,
} from "../lib/wineRepository";
import {
  getCurrentSession,
  hasSupabaseConfig,
  onAuthStateChange,
  signIn,
  signOut,
  signUp,
} from "../lib/supabase";

const emptyForm = {
  name: "",
  year: "",
  region: "",
  grape: "",
  quantity: 1,
  notes: "",
};

export function WineCellarApp() {
  const [wines, setWines] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [syncState, setSyncState] = useState("synchronise");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [syncLogs, setSyncLogs] = useState([]);

  const statusLabel = useMemo(() => {
    if (!isOnline) return "offline mode";
    if (syncState === "syncing") return "synchronisation...";
    if (syncState === "pending") return "actions en attente";
    if (syncState === "not_authenticated") return "connecte-toi pour synchroniser";
    if (syncState === "sync_failed") return "sync en echec";
    if (syncState === "queue_retry_exhausted") return "retry sync epuise";
    if (!hasSupabaseConfig) return "supabase non configure";
    return "synchronise";
  }, [isOnline, syncState]);

  async function refreshLocalData() {
    const local = await loadLocalWines();
    setWines(local.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    const pending = await hasPendingActions();
    const count = await getPendingActionsCount();
    const history = await getSyncHistory();
    setPendingCount(count);
    setSyncLogs(history);
    setSyncState(pending ? "pending" : "synchronise");
  }

  async function syncNow() {
    if (!navigator.onLine) return;
    setSyncState("syncing");
    const result = await synchronize();
    if (!result.success) {
      setSyncState(result.reason || "sync_failed");
      await refreshLocalData();
      return;
    }
    await refreshLocalData();
  }

  useEffect(() => {
    async function initialize() {
      setIsOnline(navigator.onLine);
      await refreshLocalData();
      if (hasSupabaseConfig) {
        const session = await getCurrentSession();
        setUserEmail(session?.user?.email || "");
      }
    }

    initialize();

    const onOnline = async () => {
      setIsOnline(true);
      await syncNow();
    };

    const onOffline = () => {
      setIsOnline(false);
      setSyncState("pending");
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    let unsubscribe = null;
    if (hasSupabaseConfig) {
      unsubscribe = onAuthStateChange((session) => {
        setUserEmail(session?.user?.email || "");
        setAuthError("");
        if (session?.user) {
          syncNow();
        } else {
          setSyncState("not_authenticated");
        }
      });
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Keep app functional even if SW registration fails.
    });
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (editingId) {
      await editWine(editingId, form);
    } else {
      await createWine(form);
    }

    setForm(emptyForm);
    setEditingId(null);
    await refreshLocalData();
    if (navigator.onLine) await syncNow();
  }

  function startEdit(wine) {
    setEditingId(wine.id);
    setForm({
      name: wine.name,
      year: wine.year,
      region: wine.region,
      grape: wine.grape,
      quantity: wine.quantity,
      notes: wine.notes,
    });
  }

  async function handleDelete(id) {
    await removeWine(id);
    await refreshLocalData();
    if (navigator.onLine) await syncNow();
  }

  async function handleSignIn() {
    setAuthError("");
    try {
      await signIn(authEmail, authPassword);
      setAuthPassword("");
      await syncNow();
    } catch (error) {
      setAuthError(error.message || "Connexion impossible");
    }
  }

  async function handleSignUp() {
    setAuthError("");
    try {
      await signUp(authEmail, authPassword);
      setAuthPassword("");
      await syncNow();
    } catch (error) {
      setAuthError(error.message || "Inscription impossible");
    }
  }

  async function handleSignOut() {
    await signOut();
    setSyncState("not_authenticated");
    setUserEmail("");
  }

  return (
    <main className="container">
      <header className="header">
        <h1>Gestion de cave a vin</h1>
        <div className="header-right">
          <span className={isOnline ? "badge online" : "badge offline"}>{statusLabel}</span>
          <span className="queue-badge">queue: {pendingCount}</span>
        </div>
      </header>

      {hasSupabaseConfig && (
        <section className="auth-box">
          {userEmail ? (
            <>
              <span>Connecte: {userEmail}</span>
              <button type="button" onClick={handleSignOut}>
                Deconnexion
              </button>
            </>
          ) : (
            <>
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="Email"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Mot de passe"
              />
              <button type="button" onClick={handleSignIn}>
                Connexion
              </button>
              <button type="button" onClick={handleSignUp}>
                Inscription
              </button>
            </>
          )}
          {authError ? <p className="auth-error">{authError}</p> : null}
        </section>
      )}

      <form className="wine-form" onSubmit={handleSubmit}>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Nom" required />
        <input name="year" value={form.year} onChange={handleChange} placeholder="Annee" />
        <input name="region" value={form.region} onChange={handleChange} placeholder="Region" />
        <input name="grape" value={form.grape} onChange={handleChange} placeholder="Cepage" />
        <input
          name="quantity"
          value={form.quantity}
          type="number"
          min="0"
          onChange={handleChange}
          placeholder="Quantite"
        />
        <input name="notes" value={form.notes} onChange={handleChange} placeholder="Notes" />
        <button type="submit">{editingId ? "Mettre a jour" : "Ajouter"}</button>
      </form>

      <ul className="wine-list">
        {wines.map((wine) => (
          <li key={wine.id} className="wine-item">
            <div>
              <strong>{wine.name}</strong> ({wine.year || "n/a"}) - {wine.region || "n/a"} - qte:{" "}
              {wine.quantity}
            </div>
            <div className="actions">
              <button type="button" onClick={() => startEdit(wine)}>
                Modifier
              </button>
              <button type="button" onClick={() => handleDelete(wine.id)}>
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>

      <section className="sync-history">
        <h2>Historique sync</h2>
        {syncLogs.length === 0 ? (
          <p>Aucun evenement de sync pour le moment.</p>
        ) : (
          <ul>
            {syncLogs.map((log) => (
              <li key={log.logId}>
                [{new Date(log.createdAt).toLocaleString()}] {log.status} - {log.reason} - {log.detail}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
