import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Copy, CheckCircle, Ban, Share2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { issueCredential, verifyCredential, getMyCredentials, revokeCredential } from "@/server/identity.functions";

export const Route = createFileRoute("/credentials")({
  head: () => ({
    meta: [
      { title: "Credentials — Hiero" },
      { name: "description", content: "Manage your verifiable credentials." },
    ],
  }),
  component: CredentialsPage,
});

function CredentialsPage() {
  const { loading, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [showIssue, setShowIssue] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [issueForm, setIssueForm] = useState({ name: "", github_username: "", email: "" });
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isLoggedIn) navigate({ to: "/login" });
  }, [loading, isLoggedIn, navigate]);

  const loadCredentials = () => {
    if (isLoggedIn) getMyCredentials().then(setCredentials).catch(console.error);
  };

  useEffect(() => { loadCredentials(); }, [isLoggedIn]);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueLoading(true);
    try {
      await issueCredential({
        data: {
          credential_type: "contributor_identity",
          subject: issueForm,
        },
      });
      setShowIssue(false);
      setIssueForm({ name: "", github_username: "", email: "" });
      loadCredentials();
    } catch (err: any) {
      alert(err.message);
    }
    setIssueLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const result = await verifyCredential({ data: { credential_hash: verifyHash } });
      setVerifyResult(result);
    } catch (err: any) {
      setVerifyResult({ valid: false, reason: err.message });
    }
    setVerifyLoading(false);
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(hash);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this credential? This cannot be undone.")) return;
    try {
      await revokeCredential({ data: { credential_id: id } });
      loadCredentials();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const shareLink = (hash: string) => {
    const url = `${window.location.origin}/verify/${hash}`;
    navigator.clipboard.writeText(url);
    setCopiedId("share-" + hash);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading || !isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar isLoggedIn={true} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Credentials</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowVerify(!showVerify); setShowIssue(false); }}>
              <Search className="w-4 h-4 mr-1" /> Verify
            </Button>
            <Button size="sm" onClick={() => { setShowIssue(!showIssue); setShowVerify(false); }}>
              <Plus className="w-4 h-4 mr-1" /> Issue
            </Button>
          </div>
        </div>

        {showIssue && (
          <div className="rounded-xl border border-primary/30 bg-card p-6 mb-6">
            <h2 className="font-semibold mb-4">Issue New Credential</h2>
            <form onSubmit={handleIssue} className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={issueForm.name} onChange={(e) => setIssueForm({ ...issueForm, name: e.target.value })} required placeholder="Jane Doe" />
              </div>
              <div className="space-y-2">
                <Label>GitHub Username</Label>
                <Input value={issueForm.github_username} onChange={(e) => setIssueForm({ ...issueForm, github_username: e.target.value })} required placeholder="janedoe" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={issueForm.email} onChange={(e) => setIssueForm({ ...issueForm, email: e.target.value })} required placeholder="jane@example.com" />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" disabled={issueLoading}>
                  {issueLoading ? "Issuing..." : "Issue Credential"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {showVerify && (
          <div className="rounded-xl border border-primary/30 bg-card p-6 mb-6">
            <h2 className="font-semibold mb-4">Verify a Credential</h2>
            <form onSubmit={handleVerify} className="flex gap-3">
              <Input value={verifyHash} onChange={(e) => setVerifyHash(e.target.value)} required placeholder="Enter credential hash" className="font-mono text-sm" />
              <Button type="submit" disabled={verifyLoading}>
                {verifyLoading ? "Verifying..." : "Verify"}
              </Button>
            </form>
            {verifyResult && (
              <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${verifyResult.valid ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                <strong>{verifyResult.valid ? "✓ Valid" : "✗ Invalid"}</strong> — {verifyResult.reason}
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card">
          {credentials.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No credentials yet. Issue your first credential to get started.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {credentials.map((cred) => (
                <div key={cred.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          cred.status === "verified" ? "bg-primary/10 text-primary" :
                          cred.status === "pending" ? "bg-chart-4/10 text-chart-4" :
                          "bg-destructive/10 text-destructive"
                        }`}>
                          {cred.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{cred.credential_type}</span>
                      </div>
                      <div className="text-sm font-medium">
                        {(cred.subject as any)?.name || "Unknown"} — {(cred.subject as any)?.github_username || ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {cred.issued_at ? new Date(cred.issued_at).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  {cred.credential_hash && (
                    <div className="mt-2 flex items-center gap-2">
                      <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded truncate max-w-md">
                        {cred.credential_hash}
                      </code>
                      <button onClick={() => copyHash(cred.credential_hash)} className="text-muted-foreground hover:text-foreground transition-colors">
                        {copiedId === cred.credential_hash ? <CheckCircle className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => shareLink(cred.credential_hash)} title="Copy public verify link" className="text-muted-foreground hover:text-foreground transition-colors">
                        {copiedId === "share-" + cred.credential_hash ? <CheckCircle className="w-3.5 h-3.5 text-primary" /> : <Share2 className="w-3.5 h-3.5" />}
                      </button>
                      {cred.status !== "revoked" && (
                        <button onClick={() => handleRevoke(cred.id)} title="Revoke credential" className="text-muted-foreground hover:text-destructive transition-colors ml-auto">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}