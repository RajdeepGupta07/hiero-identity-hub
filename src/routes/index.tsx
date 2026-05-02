import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Shield, CheckCircle, Globe, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <Shield className="w-5 h-5" />
            Hiero
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link to="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
          <Lock className="w-3 h-3" />
          Decentralized Identity Verification
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          Verify contributor
          <br />
          <span className="text-primary">identity with trust</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Issue and verify cryptographic credentials for open-source contributors. 
          SSRF-safe webhooks notify your systems in real-time when identities change.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="gap-2">
              Start verifying <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-24 grid md:grid-cols-3 gap-6">
        {[
          {
            icon: CheckCircle,
            title: "Verifiable Credentials",
            desc: "Issue tamper-proof credentials with SHA-256 hashing. Each credential is uniquely signed and verifiable.",
          },
          {
            icon: Lock,
            title: "SSRF-Safe Webhooks",
            desc: "Webhook delivery with IP validation, HTTPS enforcement, HMAC signatures, and redirect blocking.",
          },
          {
            icon: Globe,
            title: "Open & Decentralized",
            desc: "Built for the open-source ecosystem. Verify any contributor's identity with a simple hash lookup.",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
          >
            <feature.icon className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Hiero. Contributor Identity Verification.
      </footer>
    </div>
  );
}
