"use client";

import { useEffect, useState } from "react";
import { read, utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  addWine,
  deleteWine,
  fetchWines,
  hasSupabaseConfig,
  replaceAllWines,
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
const PAGE_SIZE = 10;

export function WineCellarApp() {
  const [wines, setWines] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState("Chargement...");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updated_at_desc");
  const [currentPage, setCurrentPage] = useState(1);

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

  async function handleImportExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("Import Excel...");
    setError("");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("Fichier Excel vide");

      const sheet = workbook.Sheets[sheetName];
      const rows = utils.sheet_to_json(sheet, { header: 1, raw: false });
      if (!Array.isArray(rows) || rows.length === 0) throw new Error("Fichier Excel invalide");

      const dataRows = rows
        .slice(1)
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || "").trim() !== ""))
        .map((row) => ({
          name: String(row[0] || ""),
          year: String(row[1] || ""),
          region: String(row[2] || ""),
          grape: String(row[3] || ""),
          quantity: String(row[4] || "0"),
          notes: String(row[5] || ""),
        }));

      await replaceAllWines(dataRows);
      setCurrentPage(1);
      await refreshWines();
    } catch (nextError) {
      setStatus("Erreur");
      setError(nextError.message || "Import impossible");
    } finally {
      event.target.value = "";
    }
  }

  function toggleSort(field) {
    const mapping = {
      name: ["name_asc", "name_desc"],
      year: ["year_desc", "year_asc"],
      quantity: ["quantity_desc", "quantity_asc"],
      updated: ["updated_at_desc", "updated_at_asc"],
    };

    const [primary, alternate] = mapping[field];
    setSortBy((prev) => (prev === primary ? alternate : primary));
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredWines = wines.filter((wine) => {
    if (!normalizedSearch) return true;
    const content = [
      wine.name,
      wine.year,
      wine.region,
      wine.grape,
      wine.notes,
      String(wine.quantity ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    return content.includes(normalizedSearch);
  });

  const sortedWines = [...filteredWines].sort((a, b) => {
    if (sortBy === "name_asc") return String(a.name || "").localeCompare(String(b.name || ""), "fr");
    if (sortBy === "name_desc") return String(b.name || "").localeCompare(String(a.name || ""), "fr");
    if (sortBy === "year_desc") return Number(b.year || 0) - Number(a.year || 0);
    if (sortBy === "year_asc") return Number(a.year || 0) - Number(b.year || 0);
    if (sortBy === "quantity_desc") return Number(b.quantity || 0) - Number(a.quantity || 0);
    if (sortBy === "quantity_asc") return Number(a.quantity || 0) - Number(b.quantity || 0);
    if (sortBy === "updated_at_asc") return String(a.updated_at || "").localeCompare(String(b.updated_at || ""));
    return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
  });

  const totalPages = Math.max(1, Math.ceil(sortedWines.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedWines = sortedWines.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy]);

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
          <p>Total cuvees</p>
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
          <label className="import-label">
            Import Excel
            <input type="file" accept=".xlsx" onChange={handleImportExcel} />
          </label>
        </section>
      </section>

      <section className="filters-row">
        <input
          className="filter-input"
          type="text"
          placeholder="Rechercher un vin, une region, une note..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="filter-select"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="updated_at_desc">Tri: dernieres modifications</option>
          <option value="name_asc">Nom A-Z</option>
          <option value="name_desc">Nom Z-A</option>
          <option value="year_desc">Annee recente - ancienne</option>
          <option value="year_asc">Annee ancienne - recente</option>
          <option value="quantity_desc">Quantite decroissante</option>
          <option value="quantity_asc">Quantite croissante</option>
        </select>
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
                <th>
                  <button type="button" className="th-sort" onClick={() => toggleSort("name")}>
                    Nom
                  </button>
                </th>
                <th>
                  <button type="button" className="th-sort" onClick={() => toggleSort("year")}>
                    Annee
                  </button>
                </th>
                <th>Region</th>
                <th>Cepage</th>
                <th>
                  <button type="button" className="th-sort" onClick={() => toggleSort("quantity")}>
                    Quantite
                  </button>
                </th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedWines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    Aucun vin ne correspond a ta recherche.
                  </td>
                </tr>
              ) : (
                paginatedWines.map((wine) => (
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

        <div className="pagination">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Precedent
          </button>
          <span>
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Suivant
          </button>
        </div>
      </section>
    </main>
  );
}
