import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const publicVerifyCredential = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      credential_hash: z.string().min(8).max(128).regex(/^[a-f0-9]+$/),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { data: cred, error } = await supabaseAdmin
      .from("credentials")
      .select("id, credential_type, subject, status, issued_at, expires_at, credential_hash")
      .eq("credential_hash", data.credential_hash)
      .maybeSingle();

    if (error || !cred) {
      return { valid: false, result: "invalid" as const, reason: "Credential not found", credential: null };
    }

    let result: "valid" | "invalid" | "expired" | "revoked" = "valid";
    let reason = "Credential is valid";
    if (cred.status === "revoked") { result = "revoked"; reason = "Credential has been revoked"; }
    else if (cred.expires_at && new Date(cred.expires_at) < new Date()) { result = "expired"; reason = "Credential has expired"; }
    else if (cred.status !== "verified") { result = "invalid"; reason = "Credential is not verified"; }

    await supabaseAdmin.from("verification_logs").insert({
      credential_id: cred.id,
      verifier_id: null,
      result,
      details: { reason, source: "public" },
    });

    const subject = cred.subject as any;
    const safeSubject = subject ? {
      name: subject.name,
      github_username: subject.github_username,
    } : null;

    return {
      valid: result === "valid",
      result,
      reason,
      credential: { ...cred, subject: safeSubject },
    };
  });