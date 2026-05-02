import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, FileCheck, Activity, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { getMyCredentials, getVerificationLogs } from "@/server/identity.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Hiero" },
      { name: "description", content: "Your Hiero contributor identity dashboard." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate({ to: "/login" });
    }
  }, [loading, isLoggedIn, navigate]);

  useEffect(() => {
    if (isLoggedIn) {
      getMyCredentials().then(setCredentials).catch(console.error);
      getVerificationLogs().then(setLogs).catch(console.error);
    }
  }, [isLoggedIn]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) return null;

  const verified = credentials.filter((c) => c.status === "verified").length;
  const pending = credentials.filter((c) => c.status === "pending").length;
  const revoked = credentials.filter((c) => c.status === "revoked").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar isLoggedIn={true} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Credentials", value: credentials.length, icon: FileCheck, color: "text-primary" },
            { label: "Verified", value: verified, icon: Shield, color: "text-primary" },
            { label: "Pending", value: pending, icon: Activity, color: "text-chart-4" },
            { label: "Revoked", value: revoked, icon: AlertTriangle, color: "text-destructive" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Recent Verification Logs</h2>
          </div>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No verification logs yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.slice(0, 10).map((log) => (
                <div key={log.id} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      log.result === "valid" ? "bg-primary/10 text-primary" :
                      log.result === "expired" ? "bg-chart-4/10 text-chart-4" :
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {log.result}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {log.credential_id?.slice(0, 8)}...
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}