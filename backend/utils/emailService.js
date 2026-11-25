const nodemailer = require("nodemailer");
const fetch = require("node-fetch");
const SystemConfig = require("../models/SystemConfig");

const EMAIL_CONFIG_KEY = "email_gateway";
let memoryEmailConfig = {};

function buildOtpEmailHtml({ otp, purposeLabel }) {
  return `
  <div style="font-family: Arial, sans-serif; background:#070b14; color:#f8fafc; padding:32px; border-radius:12px; max-width:520px; margin:0 auto; border:1px solid #1e293b;">
    <h2 style="margin:0 0 8px; color:#38bdf8;">FlowSense Security Verification</h2>
    <p style="margin:0 0 20px; color:#94a3b8; font-size:14px;">Purpose: <strong style="color:#f8fafc;">${purposeLabel}</strong></p>
    <div style="background:#0f172a; border:1px solid #06b6d4; border-radius:10px; padding:20px; text-align:center; margin-bottom:20px;">
      <span style="display:block; font-size:12px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Your 6-Digit Verification Code</span>
      <strong style="font-size:34px; letter-spacing:8px; color:#34d399; font-family:monospace;">${otp}</strong>
    </div>
    <p style="margin:0 0 10px; font-size:13px; color:#cbd5e1; line-height:1.6;">
      This verification code expires in <strong>5 minutes</strong>. Enter it in the verification screen to complete your request.
    </p>
    <p style="margin:0; font-size:12px; color:#64748b; line-height:1.5;">
      Confidentiality Notice: Never share this code with anyone. If you did not request this code, please ignore this email or change your password immediately.
    </p>
  </div>`;
}

function getPurposeLabel(purpose) {
  switch (purpose) {
    case "REGISTER":
      return "New Account Email Verification";
    case "PASSWORD_CHANGE":
      return "Password Change Confirmation";
    case "PASSWORD_RESET":
      return "Account Password Reset";
    case "TEST":
      return "Admin Gateway Connectivity Test";
    default:
      return "Identity Verification";
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 9500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveEffectiveEmailConfig() {
  let dbDoc = null;
  if (global.isMongoConnected) {
    try {
      dbDoc = await SystemConfig.findOne({ key: EMAIL_CONFIG_KEY }).lean();
    } catch {
      dbDoc = null;
    }
  }
  const stored = dbDoc || memoryEmailConfig || {};

  const resendApiKey = String(stored.resendApiKey || process.env.RESEND_API_KEY || "").trim();
  const brevoApiKey = String(stored.brevoApiKey || process.env.BREVO_API_KEY || "").trim();
  const emailWebhookUrl = String(stored.emailWebhookUrl || process.env.EMAIL_WEBHOOK_URL || "").trim();
  const emailWebhookSecret = String(stored.emailWebhookSecret || process.env.EMAIL_WEBHOOK_SECRET || "").trim();
  const emailFrom = String(stored.emailFrom || process.env.EMAIL_FROM || "").trim();
  const smtpHost = String(stored.smtpHost || process.env.SMTP_HOST || "").trim();
  const smtpPort = Number(stored.smtpPort || process.env.SMTP_PORT) || 465;
  const smtpUser = String(
    stored.smtpUser || process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER || ""
  ).trim();
  const rawPass = String(
    stored.smtpPass || process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || ""
  ).trim();
  const isGmail = !smtpHost || smtpHost.toLowerCase().includes("gmail");
  const smtpPass = isGmail ? rawPass.replace(/\s+/g, "") : rawPass;

  const hasDbValues = Boolean(
    dbDoc &&
      (dbDoc.resendApiKey ||
        dbDoc.brevoApiKey ||
        dbDoc.emailWebhookUrl ||
        (dbDoc.smtpUser && dbDoc.smtpPass))
  );
  const hasEnvValues = Boolean(
    process.env.RESEND_API_KEY ||
      process.env.BREVO_API_KEY ||
      process.env.EMAIL_WEBHOOK_URL ||
      ((process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER) &&
        (process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD))
  );

  let activeProvider = "NONE";
  if (brevoApiKey) activeProvider = "BREVO";
  else if (emailWebhookUrl) activeProvider = "WEBHOOK";
  else if (resendApiKey) activeProvider = "RESEND";
  else if (smtpUser && smtpPass) activeProvider = smtpHost ? "SMTP" : "GMAIL";

  return {
    resendApiKey,
    brevoApiKey,
    emailWebhookUrl,
    emailWebhookSecret,
    emailFrom,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    configured: activeProvider !== "NONE",
    activeProvider,
    source: hasDbValues ? "ADMIN_DB" : hasEnvValues ? "ENV" : "NONE",
    updatedAt: dbDoc?.updatedAt || null,
    updatedBy: dbDoc?.updatedBy || ""
  };
}

function maskEmailAddress(value) {
  const str = String(value || "").trim();
  if (!str) return "";
  const parts = str.split("@");
  if (parts.length !== 2) return `${str.slice(0, 2)}***`;
  const [local, domain] = parts;
  const prefix = local.slice(0, 2);
  return `${prefix}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
}

async function getEmailConfigStatus() {
  const cfg = await resolveEffectiveEmailConfig();
  return {
    configured: cfg.configured,
    activeProvider: cfg.activeProvider,
    source: cfg.source,
    emailFrom: cfg.emailFrom,
    smtpHost: cfg.smtpHost,
    smtpPort: cfg.smtpPort,
    maskedUser: maskEmailAddress(cfg.smtpUser),
    hasSmtpPass: Boolean(cfg.smtpPass),
    hasResendKey: Boolean(cfg.resendApiKey),
    hasBrevoKey: Boolean(cfg.brevoApiKey),
    hasWebhookUrl: Boolean(cfg.emailWebhookUrl),
    updatedAt: cfg.updatedAt,
    updatedBy: cfg.updatedBy
  };
}

async function saveEmailGatewayConfig(payload = {}, updatedBy = "Admin") {
  let existing = {};
  if (global.isMongoConnected) {
    existing = (await SystemConfig.findOne({ key: EMAIL_CONFIG_KEY }).lean()) || {};
  } else {
    existing = memoryEmailConfig || {};
  }

  const next = {
    key: EMAIL_CONFIG_KEY,
    resendApiKey:
      payload.clearResendKey
        ? ""
        : typeof payload.resendApiKey === "string" && payload.resendApiKey.trim()
          ? payload.resendApiKey.trim()
          : existing.resendApiKey || "",
    brevoApiKey:
      payload.clearBrevoKey
        ? ""
        : typeof payload.brevoApiKey === "string" && payload.brevoApiKey.trim()
          ? payload.brevoApiKey.trim()
          : existing.brevoApiKey || "",
    emailWebhookUrl:
      payload.clearWebhookUrl
        ? ""
        : typeof payload.emailWebhookUrl === "string" && payload.emailWebhookUrl.trim()
          ? payload.emailWebhookUrl.trim()
          : existing.emailWebhookUrl || "",
    emailWebhookSecret:
      typeof payload.emailWebhookSecret === "string" && payload.emailWebhookSecret.trim()
        ? payload.emailWebhookSecret.trim()
        : existing.emailWebhookSecret || "",
    emailFrom:
      typeof payload.emailFrom === "string"
        ? payload.emailFrom.trim()
        : existing.emailFrom || "",
    smtpHost:
      typeof payload.smtpHost === "string"
        ? payload.smtpHost.trim()
        : existing.smtpHost || "",
    smtpPort: Number(payload.smtpPort) || existing.smtpPort || 465,
    smtpUser:
      payload.clearSmtp
        ? ""
        : typeof payload.smtpUser === "string" && payload.smtpUser.trim()
          ? payload.smtpUser.trim()
          : existing.smtpUser || "",
    smtpPass:
      payload.clearSmtp
        ? ""
        : typeof payload.smtpPass === "string" && payload.smtpPass.trim()
          ? payload.smtpPass.trim()
          : existing.smtpPass || "",
    updatedBy
  };

  if (global.isMongoConnected) {
    await SystemConfig.findOneAndUpdate(
      { key: EMAIL_CONFIG_KEY },
      { $set: next },
      { upsert: true, new: true }
    );
  }
  memoryEmailConfig = next;
  return getEmailConfigStatus();
}

async function trySmtpSend({ cfg, to, subject, text, html }) {
  const attempts = [];
  if (cfg.smtpHost) {
    attempts.push({
      host: cfg.smtpHost,
      port: cfg.smtpPort || 587,
      secure: (cfg.smtpPort || 587) === 465,
      auth: { user: cfg.smtpUser, pass: cfg.smtpPass }
    });
  } else {
    attempts.push(
      {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: cfg.smtpUser, pass: cfg.smtpPass }
      },
      {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: cfg.smtpUser, pass: cfg.smtpPass }
      }
    );
  }

  let lastErr = null;
  for (const baseConfig of attempts) {
    try {
      const transporter = nodemailer.createTransport({
        ...baseConfig,
        connectionTimeout: 9000,
        greetingTimeout: 9000,
        socketTimeout: 10000
      });
      await transporter.sendMail({
        from: cfg.emailFrom || `"FlowSense Security" <${cfg.smtpUser}>`,
        to,
        subject,
        text,
        html
      });
      return { ok: true, provider: cfg.smtpHost ? "SMTP" : "GMAIL" };
    } catch (err) {
      lastErr = err;
      // Only retry alternate port on connection/socket failure, not auth error
      if (err && (err.code === "EAUTH" || /invalid login|username and password not accepted/i.test(err.message))) {
        break;
      }
    }
  }

  const rawMsg = String(lastErr?.message || "");
  if (lastErr?.code === "EAUTH" || /invalid login|username and password not accepted/i.test(rawMsg)) {
    return {
      ok: false,
      reason:
        "Gmail/SMTP authentication failed. Ensure 2-Step Verification is active and EMAIL_PASS is a 16-character App Password."
    };
  }
  if (/timeout|etimedout|econnrefused|enetunreach|ehostunreach/i.test(rawMsg) || ["ETIMEDOUT", "ECONNREFUSED", "ENETUNREACH"].includes(lastErr?.code)) {
    return {
      ok: false,
      reason:
        "SMTP port connection timed out or is blocked by the server host firewall. Use Brevo API Key, Resend API Key, or a Google Apps Script Webhook (HTTPS 443) for cloud deployments."
    };
  }
  return {
    ok: false,
    reason: rawMsg || "SMTP email dispatch failed."
  };
}

/**
 * Sends an OTP email via Brevo API, HTTPS Webhook, Resend API, or Custom/Gmail SMTP.
 * Never returns the OTP code to API callers or client UI.
 */
function parseSenderAddress(rawFrom, fallbackEmail = "no-reply@flowsense.in") {
  const str = String(rawFrom || "").trim();
  if (!str) return { name: "FlowSense Security", email: fallbackEmail };
  const match = str.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].replace(/["']/g, "").trim() || "FlowSense Security",
      email: match[2].trim()
    };
  }
  return { name: "FlowSense Security", email: str };
}

async function sendOtpEmail({ to, otp, purpose = "REGISTER" }) {
  const cfg = await resolveEffectiveEmailConfig();
  const purposeLabel = getPurposeLabel(purpose);
  const subject = `FlowSense Verification Code — ${purposeLabel}`;
  const html = buildOtpEmailHtml({ otp, purposeLabel });
  const text = `Your FlowSense 6-digit verification code for ${purposeLabel} is: ${otp}. It expires in 5 minutes. Never share this code.`;

  if (!cfg.configured) {
    return {
      sent: false,
      configured: false,
      reason:
        "Email OTP delivery is not configured on this server yet. Set BREVO_API_KEY, RESEND_API_KEY, EMAIL_WEBHOOK_URL, or EMAIL_USER & EMAIL_PASS (or configure them in Admin Console -> Email OTP Gateway)."
    };
  }

  const providerErrors = [];

  // 1. Brevo HTTPS API (Free 300/day to any recipient over HTTPS 443)
  if (cfg.brevoApiKey) {
    try {
      const sender = parseSenderAddress(cfg.emailFrom || cfg.smtpUser, "no-reply@flowsense.in");
      const res = await fetchWithTimeout("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": cfg.brevoApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sender,
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text
        })
      });
      if (res.ok) {
        return { sent: true, configured: true, provider: "BREVO" };
      }
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody.message || `Brevo rejected request (HTTP ${res.status}).`;
      console.warn("Brevo email error:", msg);
      providerErrors.push(`Brevo: ${msg}`);
    } catch (e) {
      const msg = e.name === "AbortError" ? "Brevo API timed out." : e.message;
      console.warn("Brevo dispatch failed:", msg);
      providerErrors.push(`Brevo: ${msg}`);
    }
  }

  // 2. HTTPS Webhook (e.g. Google Apps Script Web App sending via Gmail over HTTPS 443)
  if (cfg.emailWebhookUrl) {
    try {
      const res = await fetchWithTimeout(cfg.emailWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: cfg.emailWebhookSecret || undefined,
          to,
          subject,
          text,
          html
        })
      });
      const rawBody = await res.text().catch(() => "");
      if (res.ok) {
        if (/^\s*<!doctype|^\s*<html/i.test(rawBody) || res.url?.includes("accounts.google.com")) {
          providerErrors.push(
            "Webhook returned an HTML sign-in page instead of JSON. Deploy your Google Apps Script Web App with 'Who has access: Anyone'."
          );
        } else {
          let parsed = null;
          try {
            parsed = rawBody ? JSON.parse(rawBody) : { ok: true };
          } catch {
            parsed = { ok: true };
          }
          if (parsed && (parsed.success === false || parsed.ok === false)) {
            providerErrors.push(`Webhook: ${parsed.message || parsed.error || "Rejected by email webhook."}`);
          } else {
            return { sent: true, configured: true, provider: "WEBHOOK" };
          }
        }
      } else {
        providerErrors.push(`Webhook returned HTTP ${res.status}.`);
      }
    } catch (e) {
      const msg = e.name === "AbortError" ? "Email webhook timed out." : e.message;
      providerErrors.push(`Webhook: ${msg}`);
    }
  }

  // 3. Resend HTTPS API
  if (cfg.resendApiKey) {
    try {
      const fromAddr = cfg.emailFrom || "FlowSense Security <onboarding@resend.dev>";
      const res = await fetchWithTimeout("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ from: fromAddr, to: [to], subject, html, text })
      });
      if (res.ok) {
        return { sent: true, configured: true, provider: "RESEND" };
      }
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.message || `Resend rejected request (HTTP ${res.status}).`;
      console.warn("Resend email error:", msg);
      providerErrors.push(`Resend: ${msg}`);
    } catch (e) {
      const msg = e.name === "AbortError" ? "Resend API timed out." : e.message;
      console.warn("Resend dispatch failed:", msg);
      providerErrors.push(`Resend: ${msg}`);
    }
  }

  // 4. Nodemailer Custom SMTP or Gmail SMTP
  if (cfg.smtpUser && cfg.smtpPass) {
    const smtpRes = await trySmtpSend({ cfg, to, subject, text, html });
    if (smtpRes.ok) {
      return { sent: true, configured: true, provider: smtpRes.provider };
    }
    providerErrors.push(smtpRes.reason);
  }

  return {
    sent: false,
    configured: true,
    reason:
      providerErrors[0] ||
      "Configured email provider failed to deliver verification email. Check sender credentials in Admin Console."
  };
}

async function sendTestEmail({ to }) {
  const testCode = "TEST-OK";
  return sendOtpEmail({ to, otp: testCode, purpose: "TEST" });
}

module.exports = {
  sendOtpEmail,
  sendTestEmail,
  getEmailConfigStatus,
  saveEmailGatewayConfig
};
