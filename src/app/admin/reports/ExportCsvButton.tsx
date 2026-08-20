"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Column {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

export function ExportCsvButton({
  endpoint,
  filename,
  columns,
  baseParams,
}: {
  endpoint: string;
  filename: string;
  columns: Column[];
  baseParams?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const sep = endpoint.includes("?") ? "&" : "?";
      const res = await fetch(`${endpoint}${sep}pageSize=500${baseParams ? `&${baseParams}` : ""}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Export request failed");
      const data = await res.json();
      const rows: Array<Record<string, unknown>> = data.rows ?? [];

      const header = columns.map((c) => `"${c.label}"`).join(",");
      const lines = rows.map((row) =>
        columns
          .map((c) => {
            const raw = row[c.key];
            const v = c.format ? c.format(raw) : raw;
            if (v === null || v === undefined) return '""';
            return `"${String(v).replace(/"/g, '""')}"`;
          })
          .join(",")
      );

      const csv = [header, ...lines].join("\r\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export CSV. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={download} disabled={loading}>
      <Download className="mr-1 h-4 w-4" />
      {loading ? "Exporting..." : "Export CSV"}
    </Button>
  );
}