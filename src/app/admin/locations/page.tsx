"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Upload } from "lucide-react";

interface Subdivision {
  id: string;
  name: string;
  sortOrder: number;
  countryId: string;
}

interface Country {
  id: string;
  name: string;
  sortOrder: number;
  subdivisions: Subdivision[];
}

export default function LocationsPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [showAddCountry, setShowAddCountry] = useState(false);
  const [countryName, setCountryName] = useState("");

  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editCountryName, setEditCountryName] = useState("");

  const [addingSubdiv, setAddingSubdiv] = useState<string | null>(null);
  const [subdivName, setSubdivName] = useState("");

  const [editingSubdiv, setEditingSubdiv] = useState<Subdivision | null>(null);
  const [editSubdivName, setEditSubdivName] = useState("");

  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);

  const fetchCountries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/locations/countries");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCountries(data.countries);
    } catch {
      setError("Failed to load countries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCountries(); }, [fetchCountries]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddCountry = async () => {
    if (!countryName.trim()) return;
    const res = await fetch("/api/locations/countries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: countryName.trim() }),
    });
    if (res.ok) {
      setCountryName("");
      setShowAddCountry(false);
      fetchCountries();
    }
  };

  const handleEditCountry = async () => {
    if (!editingCountry || !editCountryName.trim()) return;
    const res = await fetch(`/api/locations/countries/${editingCountry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCountryName.trim() }),
    });
    if (res.ok) {
      setEditingCountry(null);
      setEditCountryName("");
      fetchCountries();
    }
  };

  const handleDeleteCountry = async (id: string) => {
    if (!confirm("Delete this country and all its subdivisions?")) return;
    const res = await fetch(`/api/locations/countries/${id}`, { method: "DELETE" });
    if (res.ok) fetchCountries();
  };

  const handleAddSubdivision = async () => {
    if (!addingSubdiv || !subdivName.trim()) return;
    const res = await fetch("/api/locations/subdivisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryId: addingSubdiv, name: subdivName.trim() }),
    });
    if (res.ok) {
      setSubdivName("");
      setAddingSubdiv(null);
      fetchCountries();
    }
  };

  const handleEditSubdivision = async () => {
    if (!editingSubdiv || !editSubdivName.trim()) return;
    const res = await fetch(`/api/locations/subdivisions/${editingSubdiv.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editSubdivName.trim() }),
    });
    if (res.ok) {
      setEditingSubdiv(null);
      setEditSubdivName("");
      fetchCountries();
    }
  };

  const handleDeleteSubdivision = async (id: string) => {
    if (!confirm("Delete this subdivision?")) return;
    const res = await fetch(`/api/locations/subdivisions/${id}`, { method: "DELETE" });
    if (res.ok) fetchCountries();
  };

  const handleImport = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/locations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      const data = await res.json();
      setImportResult(data);
      if (res.ok) fetchCountries();
    } catch {
      setImportResult({ imported: 0, errors: ["Failed to import"] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar role="ADMIN" />
      <PageContent>
        <h1 className="mb-8 text-2xl font-bold">Locations Management</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>CSV Import</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Paste CSV with columns: country,subdivision (one per row). Header row optional.
            </p>
          </CardHeader>
          <div className="space-y-3">
            <Textarea
              label="CSV Content"
              placeholder={`country,subdivision\nKenya,Nairobi\nKenya,Mombasa\nUganda,Central Region`}
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <Button onClick={handleImport} disabled={importing || !csvText.trim()}>
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importing..." : "Import CSV"}
            </Button>
            {importResult && (
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-sm font-medium text-green-600">
                  Imported: {importResult.imported}
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mt-1">
                    <p className="text-sm font-medium text-red-600">Errors:</p>
                    <ul className="list-inside list-disc text-sm text-red-500">
                      {importResult.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Countries</h2>
          <Button size="sm" onClick={() => setShowAddCountry(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add Country
          </Button>
        </div>

        {showAddCountry && (
          <Card className="mb-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Country Name"
                  value={countryName}
                  onChange={(e) => setCountryName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCountry()}
                  placeholder="Enter country name"
                />
              </div>
              <Button size="sm" onClick={handleAddCountry} disabled={!countryName.trim()}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddCountry(false); setCountryName(""); }}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {loading && <p className="text-gray-500 dark:text-gray-400">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && countries.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">No countries found.</p>
        )}

        <div className="space-y-3">
          {countries.map((country) => (
            <Card key={country.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpand(country.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {expanded.has(country.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <span className="font-medium">{country.name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    ({country.subdivisions.length} subdivisions)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setAddingSubdiv(country.id); setSubdivName(""); }}
                  >
                    <Plus className="h-3 w-3" /> Subdivision
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditingCountry(country); setEditCountryName(country.name); }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteCountry(country.id)}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>

              {editingCountry?.id === country.id && (
                <div className="mt-3 flex items-end gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <div className="flex-1">
                    <Input
                      label="Edit Country Name"
                      value={editCountryName}
                      onChange={(e) => setEditCountryName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEditCountry()}
                    />
                  </div>
                  <Button size="sm" onClick={handleEditCountry} disabled={!editCountryName.trim()}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingCountry(null)}>
                    Cancel
                  </Button>
                </div>
              )}

              {addingSubdiv === country.id && (
                <div className="mt-3 flex items-end gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <div className="flex-1">
                    <Input
                      label="Subdivision Name"
                      value={subdivName}
                      onChange={(e) => setSubdivName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubdivision()}
                      placeholder="Enter subdivision name"
                    />
                  </div>
                  <Button size="sm" onClick={handleAddSubdivision} disabled={!subdivName.trim()}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingSubdiv(null)}>
                    Cancel
                  </Button>
                </div>
              )}

              {expanded.has(country.id) && country.subdivisions.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 dark:border-gray-800">
                  {country.subdivisions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800"
                    >
                      <span>{sub.name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingSubdiv(sub); setEditSubdivName(sub.name); }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSubdivision(sub.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {editingSubdiv && editingSubdiv.countryId === country.id && expanded.has(country.id) && (
                <div className="mt-3 flex items-end gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <div className="flex-1">
                    <Input
                      label="Edit Subdivision Name"
                      value={editSubdivName}
                      onChange={(e) => setEditSubdivName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEditSubdivision()}
                    />
                  </div>
                  <Button size="sm" onClick={handleEditSubdivision} disabled={!editSubdivName.trim()}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingSubdiv(null)}>
                    Cancel
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </PageContent>
    </div>
  );
}
