import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const issueCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      credential_type: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
      subject: z.object({
        name: z.string().min(1).max(255),
        github_username: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
        email: z.string().email().max(255),
      }),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Generate a simple credential hash
    const encoder = new TextEncoder();
    const hashData = encoder.encode(JSON.stringify({ ...data, userId, ts: Date.now() }));
    const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const credentialHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const { data: credential, error } = await supabase
      .from("credentials")
      .insert({
        user_id: userId,
        credential_type: data.credential_type,
        subject: data.subject,
        status: "verified",
        credential_hash: credentialHash,
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Trigger webhook
    await triggerWebhook({ data: { credential_id: credential.id }, context });

    return credential;
  });

export const verifyCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      credential_hash: z.string().min(1).max(128).regex(/^[a-f0-9]+$/),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: credential, error } = await supabase
      .from("credentials")
      .select("*")
      .eq("credential_hash", data.credential_hash)
      .single();

    if (error || !credential) {
      const { error: logError } = await supabase.from("verification_logs").insert({
        credential_id: "00000000-0000-0000-0000-000000000000",
        verifier_id: userId,
        result: "invalid",
        details: { reason: "Credential not found" },
      });
      if (logError) console.error("Failed to log verification:", logError);
      return { valid: false, reason: "Credential not found" };
    }

    let result: "valid" | "invalid" | "expired" | "revoked" = "valid";
    let reason = "Credential is valid";

    if (credential.status === "revoked") {
      result = "revoked";
      reason = "Credential has been revoked";
    } else if (credential.expires_at && new Date(credential.expires_at) < new Date()) {
      result = "expired";
      reason = "Credential has expired";
    } else if (credential.status !== "verified") {
      result = "invalid";
      reason = "Credential is not verified";
    }

    await supabase.from("verification_logs").insert({
      credential_id: credential.id,
      verifier_id: userId,
      result,
      details: { reason },
    });

    return { valid: result === "valid", result, reason, credential };
  });

export const getMyCredentials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("credentials")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getVerificationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("verification_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data;
  });

export const revokeCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ credential_id: z.string().uuid() }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cred, error } = await supabase
      .from("credentials")
      .update({ status: "revoked" })
      .eq("id", data.credential_id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return cred;
  });


// SSRF-safe webhook trigger
async function triggerWebhook({ data, context }: { data: { credential_id: string }; context: { supabase: any; userId: string } }) {
  const { supabase, userId } = context;

  const { data: profile } = await supabase
    .from("profiles")
    .select("webhook_url, webhook_secret")
    .eq("id", userId)
    .single();

  if (!profile?.webhook_url) return;

  const url = profile.webhook_url;

  // SSRF Protection: validate URL
  if (!isUrlSafe(url)) {
    await supabase.from("webhook_logs").insert({
      user_id: userId,
      event_type: "credential_issued",
      payload: data,
      error: "SSRF protection: URL blocked (private/internal IP or non-HTTPS)",
    });
    return;
  }

  const payload = JSON.stringify({
    event: "credential_issued",
    credential_id: data.credential_id,
    timestamp: new Date().toISOString(),
  });

  // Generate HMAC signature
  let signature = "";
  if (profile.webhook_secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(profile.webhook_secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    signature = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hiero-Signature": signature,
        "X-Hiero-Event": "credential_issued",
      },
      body: payload,
      signal: controller.signal,
      redirect: "error", // Disable redirects for SSRF protection
    });

    clearTimeout(timeout);

    const responseBody = await response.text().catch(() => "");

    await supabase.from("webhook_logs").insert({
      user_id: userId,
      event_type: "credential_issued",
      payload: JSON.parse(payload),
      status_code: response.status,
      response_body: responseBody.slice(0, 1000),
    });
  } catch (err: any) {
    await supabase.from("webhook_logs").insert({
      user_id: userId,
      event_type: "credential_issued",
      payload: JSON.parse(payload),
      error: err.message?.slice(0, 500) || "Unknown error",
    });
  }
}

function isUrlSafe(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);

    // Must be HTTPS (allow HTTP only for localhost in dev)
    if (url.protocol !== "https:") {
      return false;
    }

    const hostname = url.hostname;

    // Block private/internal IPs
    const blockedPatterns = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^169\.254\./,
      /^fc00:/i,
      /^fe80:/i,
      /^::1$/,
      /^localhost$/i,
      /^.*\.local$/i,
      /^.*\.internal$/i,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) return false;
    }

    return true;
  } catch {
    return false;
  }
}