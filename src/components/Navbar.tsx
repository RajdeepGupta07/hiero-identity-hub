import { Link, useLocation } from "@tanstack/react-router";
import { Shield, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function Navbar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <nav className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg">
          <Shield className="w-5 h-5" />
          Hiero
        </Link>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className={`text-sm transition-colors ${location.pathname === "/dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                Dashboard
              </Link>
              <Link to="/credentials" className={`text-sm transition-colors ${location.pathname === "/credentials" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                Credentials
              </Link>
              <Link to="/settings" className={`text-sm transition-colors ${location.pathname === "/settings" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                Settings
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign in
              </Link>
              <Link to="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}