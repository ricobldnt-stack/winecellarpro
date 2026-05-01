"use client";

import { useEffect, useState } from "react";
import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  addWine,
  deleteWine,
  fetchWines,
  hasSupabaseConfig,
  updateWine,
} from "../lib/supabase";

const emptyForm = {
  name: "",
  year: "",
  region: "",
  grape: "",
  quantity: 1,
  notes: "",
};

const EXPORT_HEADERS = ["Nom", "Annee", "Region", "Cepage", "Quantite", "Notes"];

export function WineCellarApp() {
  const [wines, setWines] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState("Chargement...");
  const [error, setError] = useState("");

  async function refreshWines() {
    if (!hasSupabaseConfig) {
      setStatus("Supabase non configure");
      return;
    }
    setError("");
    try {
      const data = await fetchWines();
      setWines(data);
      setStatus("Synchronise");
    } catch (nextError) {
      setError(nextError.message || "Erreur de chargement");
      setStatus("Erreur");
    }
  }

  useEffect(() => {
    refreshWines();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setStatus("Enregistrement...");
    try {
      if (editingId) {
        await updateWine(editingId, form);
      } else {
        await addWine(form);
      }
      setForm(emptyForm);
      setEditingId(null);
      await refreshWines();
    } catch (nextError) {
      setStatus("Erreur");
      setError(nextError.message || "Impossible d'enregistrer");
    }
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
    try {
      setStatus("Suppression...");
      await deleteWine(id);
      await refreshWines();
    } catch (nextError) {
      setStatus("Erreur");
      setError(nextError.message || "Impossible de supprimer");
    }
  }

  function getExportRows() {
    return wines.map((wine) => [
      wine.name || "",
      wine.year || "",
      wine.region || "",
      wine.grape || "",
      String(wine.quantity ?? ""),
      wine.notes || "",
    ]);
  }

  function handleExportExcel() {
    const rows = getExportRows();
    const worksheet = utils.aoa_to_sheet([EXPORT_HEADERS, ...rows]);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Cave");
    writeFile(workbook, "cave-a-vin.xlsx");
  }

  function handleExportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Cave a vin", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [EXPORT_HEADERS],
      body: getExportRows(),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [22, 101, 52] },
    });
    doc.save("cave-a-vin.pdf");
  }

  return (
    <main className="container">
      <section className="hero">
        <div>
          <p className="kicker">Cave en ligne</p>
          <h1>Tableau de cave a vin</h1>
          <p className="hero-subtitle">
            Saisie rapide, affichage moderne et export en Excel/PDF pour suivre toute ta cave.
          </p>
        </div>
        <span className="badge online">{status}</span>
      </section>

      {error ? <p className="auth-error">{error}</p> : null}

      <section className="top-panels">
        <article className="stat-card">
          <p>Total references</p>
          <strong>{wines.length}</strong>
        </article>
        <article className="stat-card">
          <p>Total bouteilles</p>
          <strong>{wines.reduce((sum, wine) => sum + Number(wine.quantity || 0), 0)}</strong>
        </article>
        <section className="export-actions">
          <button type="button" onClick={handleExportExcel}>
            Export Excel
          </button>
          <button type="button" onClick={handleExportPdf}>
            Export PDF
          </button>
        </section>
      </section>

      <section className="form-card">
        <h2>{editingId ? "Modifier un vin" : "Ajouter un vin"}</h2>
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
      </section>

      <section className="table-card">
        <h2>Tableau de cave</h2>
        <div className="table-wrap">
          <table className="wine-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Annee</th>
                <th>Region</th>
                <th>Cepage</th>
                <th>Quantite</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {wines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    Aucun vin pour le moment.
                  </td>
                </tr>
              ) : (
                wines.map((wine) => (
                  <tr key={wine.id}>
                    <td>{wine.name || "-"}</td>
                    <td>{wine.year || "-"}</td>
                    <td>{wine.region || "-"}</td>
                    <td>{wine.grape || "-"}</td>
                    <td>{wine.quantity ?? 0}</td>
                    <td>{wine.notes || "-"}</td>
                    <td>
                      <div className="actions">
                        <button type="button" onClick={() => startEdit(wine)}>
                          Modifier
                        </button>
                        <button type="button" onClick={() => handleDelete(wine.id)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
