import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, ShieldAlert, ShieldX, Loader2 } from "lucide-react";
import { publicVerifyCredential } from "@/lib/public-verify.functions";

export const Route = createFileRoute("/verify/$hash")({
  head: ({ params }) => ({
    meta: [
      { title: `Verify Credential — Hiero` },
      { name: "description", content: `Public verification page for credential ${params.hash.slice(0, 12)}...` },
      { property: "og:title", content: "Hiero — Credential Verification" },
      { property: "og:description", content: "Verify the authenticity of an open-source contributor credential." },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { hash } = Route.useParams();
  const [state, setState] = useState<"loading" | "done">("loading");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    publicVerifyCredential({ data: { credential_hash: hash } })
      .then((r) => setResult(r))
      .catch((e) => setResult({ valid: false, result: "invalid", reason: e.message }))
      .finally(() => setState("done"));
  }, [hash]);

  const Icon =
    result?.result === "valid" ? Shield :
    result?.result === "expired" || result?.result === "revoked" ? ShieldAlert :
    ShieldX;

  const color =
    result?.result === "valid" ? "text-primary" :
    result?.result === "expired" || result?.result === "revoked" ? "text-chart-4" :
    "text-destructive";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          {state === "loading" ? (
            <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
          ) : (
            <Icon className={`w-12 h-12 ${color}`} />
          )}
          <h1 className="mt-4 text-xl font-semibold">
            {state === "loading" ? "Verifying credential..." :
              result?.valid ? "Credential Verified" : "Verification Failed"}
          </h1>
          {state === "done" && (
            <p className="mt-2 text-sm text-muted-foreground">{result?.reason}</p>
          )}
        </div>

        {state === "done" && result?.credential && (
          <div className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
            <Row label="Name" value={result.credential.subject?.name || "—"} />
            <Row label="GitHub" value={result.credential.subject?.github_username ? `@${result.credential.subject.github_username}` : "—"} />
            <Row label="Type" value={result.credential.credential_type} />
            <Row label="Status" value={
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                result.credential.status === "verified" ? "bg-primary/10 text-primary" :
                result.credential.status === "revoked" ? "bg-destructive/10 text-destructive" :
                "bg-chart-4/10 text-chart-4"
              }`}>{result.credential.status}</span>
            } />
            <Row label="Issued" value={result.credential.issued_at ? new Date(result.credential.issued_at).toLocaleDateString() : "—"} />
            <Row label="Expires" value={result.credential.expires_at ? new Date(result.credential.expires_at).toLocaleDateString() : "—"} />
            <div className="pt-2">
              <div className="text-xs text-muted-foreground mb-1">Credential hash</div>
              <code className="block text-xs font-mono bg-muted px-2 py-1.5 rounded break-all">
                {result.credential.credential_hash}
              </code>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-muted-foreground">
          Powered by Hiero — Decentralized Contributor Identity
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}