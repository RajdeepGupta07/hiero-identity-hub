import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getProfile, updateProfile, getWebhookLogs } from "@/server/profile.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Hiero" },
      { name: "description", content: "Manage your profile and webhook settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { loading, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    github_username: "",
    webhook_url: "",
    webhook_secret: "",
  });

  useEffect(() => {
    if (!loading && !isLoggedIn) navigate({ to: "/login" });
  }, [loading, isLoggedIn, navigate]);

  useEffect(() => {
    if (isLoggedIn) {
      getProfile().then((p) => {
        setProfile(p);
        setForm({
          display_name: p.display_name || "",
          bio: p.bio || "",
          github_username: p.github_username || "",
          webhook_url: p.webhook_url || "",
          webhook_secret: p.webhook_secret || "",
        });
      }).catch(console.error);
      getWebhookLogs().then(setWebhookLogs).catch(console.error);
    }
  }, [isLoggedIn]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({ data: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  if (loading || !isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar isLoggedIn={true} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Profile</h2>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>GitHub Username</Label>
              <Input value={form.github_username} onChange={(e) => setForm({ ...form, github_username: e.target.value })} placeholder="janedoe" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Webhook Configuration</h2>
            <p className="text-xs text-muted-foreground">
              Receive real-time notifications when credential status changes. URL must be HTTPS. Private IPs are blocked for SSRF protection.
            </p>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input type="url" value={form.webhook_url} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })} placeholder="https://your-server.com/webhook" />
            </div>
            <div className="space-y-2">
              <Label>Webhook Secret</Label>
              <Input value={form.webhook_secret} onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })} placeholder="whsec_..." />
              <p className="text-xs text-muted-foreground">Used to sign webhook payloads with HMAC-SHA256.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
            {saved && <span className="text-sm text-primary">✓ Saved</span>}
          </div>
        </form>

        <div className="mt-8 rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Webhook Delivery Logs</h2>
          </div>
          {webhookLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No webhook deliveries yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {webhookLogs.map((log) => (
                <div key={log.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{log.event_type}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.delivered_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.status_code ? (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${log.status_code < 300 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {log.status_code}
                      </span>
                    ) : null}
                    {log.error && (
                      <span className="text-xs text-destructive">{log.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}