"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface SyncLog {
  id: string;
  action: string;
  entityType: string;
  status: string;
  createdAt: string;
}

export default function LocalSyncPage() {
  const [config, setConfig] = useState({
    isEnabled: false,
    localDbUrl: "",
    syncInterval: 300,
    apiKey: "",
  });
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/local-sync")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) setConfig(data.config);
        setLogs(data.logs || []);
      });
  }, []);

  const saveConfig = async () => {
    await fetch("/api/local-sync", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setMessage("Configuration saved");
  };

  const runSync = async (action: string) => {
    setSyncing(true);
    setMessage("");
    try {
      const res = await fetch("/api/local-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setMessage(`Sync completed: ${JSON.stringify(data).slice(0, 100)}...`);
      setLogs((prev) => [data.log, ...prev]);
    } catch {
      setMessage("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <h1 className="mb-2 text-2xl font-bold">Local System Integration</h1>
        <p className="mb-8 text-gray-500">
          Connect your local business system for offline inventory and booking sync.
        </p>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardTitle className="mb-4">Sync Configuration</CardTitle>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                />
                <span className="text-sm">Enable local sync</span>
              </label>
              <Input
                label="Local Database URL"
                value={config.localDbUrl || ""}
                onChange={(e) => setConfig({ ...config, localDbUrl: e.target.value })}
                placeholder="sqlite://./local.db or postgresql://..."
              />
              <Input
                label="Sync Interval (seconds)"
                type="number"
                value={config.syncInterval}
                onChange={(e) => setConfig({ ...config, syncInterval: Number(e.target.value) })}
              />
              <Input
                label="API Key"
                type="password"
                value={config.apiKey || ""}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              />
              <Button onClick={saveConfig}>Save Configuration</Button>
            </div>
          </Card>

          <Card>
            <CardTitle className="mb-4">Manual Sync Actions</CardTitle>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => runSync("sync_bookings")}
                disabled={syncing}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Bookings to Local
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => runSync("sync_inventory")}
                disabled={syncing}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Inventory from Local
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => runSync("push_booking")}
                disabled={syncing}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Push Booking to Local
              </Button>
            </div>
            {message && (
              <p className="mt-4 text-sm text-gray-600">{message}</p>
            )}
          </Card>
        </div>

        <Card className="mt-8">
          <CardTitle className="mb-4">Sync History</CardTitle>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500">No sync logs yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  {log.status === "SYNCED" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">{log.action}</span>
                  <span className="text-gray-500">{log.entityType}</span>
                  <span className="ml-auto text-gray-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </PageContent>
    </div>
  );
}
