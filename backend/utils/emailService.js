const nodemailer = require("nodemailer");
const fetch = require("node-fetch");

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
    default:
      return "Identity Verification";
  }
}

/**
 * Sends a real OTP verification email via Resend API, Brevo API, Custom SMTP, or Gmail SMTP.
 * Never returns the OTP code to API callers or client UI.
 */
async function sendOtpEmail({ to, otp, purpose = "REGISTER" }) {
  const purposeLabel = getPurposeLabel(purpose);
  const subject = `FlowSense Verification Code — ${purposeLabel}`;
  const html = buildOtpEmailHtml({ otp, purposeLabel });
  const text = `Your FlowSense 6-digit verification code for ${purposeLabel} is: ${otp}. It expires in 5 minutes. Never share this code.`;

  // 1. Resend HTTPS API (Free tier works smoothly over HTTPS on cloud hosts)
  if (process.env.RESEND_API_KEY) {
    try {
      const fromAddr = process.env.EMAIL_FROM || "FlowSense Security <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ from: fromAddr, to: [to], subject, html, text })
      });
      if (res.ok) {
        return { sent: true, configured: true, provider: "RESEND" };
      }
      const errTxt = await res.text().catch(() => "");
      console.warn("Resend email warning:", errTxt);
    } catch (e) {
      console.warn("Resend dispatch failed:", e.message);
    }
  }

  // 2. Brevo HTTPS API
  if (process.env.BREVO_API_KEY) {
    try {
      const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@flowsense.in";
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sender: { name: "FlowSense Security", email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text
        })
      });
      if (res.ok) {
        return { sent: true, configured: true, provider: "BREVO" };
      }
    } catch (e) {
      console.warn("Brevo dispatch failed:", e.message);
    }
  }

  // 3. Nodemailer Custom SMTP or Gmail SMTP
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

  if (smtpUser && smtpPass) {
    try {
      const transportConfig = smtpHost
        ? {
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: { user: smtpUser, pass: smtpPass }
          }
        : {
            service: "gmail",
            auth: { user: smtpUser, pass: smtpPass }
          };

      const transporter = nodemailer.createTransport(transportConfig);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"FlowSense Security" <${smtpUser}>`,
        to,
        subject,
        text,
        html
      });
      return { sent: true, configured: true, provider: smtpHost ? "SMTP" : "GMAIL" };
    } catch (err) {
      console.error("SMTP email delivery error:", err.message);
      return {
        sent: false,
        configured: true,
        reason: "Unable to send verification email right now. Please try again later."
      };
    }
  }

  return {
    sent: false,
    configured: false,
    reason:
      "Email OTP delivery requires server email configuration (EMAIL_USER & EMAIL_PASS, SMTP credentials, or RESEND_API_KEY)."
  };
}

module.exports = { sendOtpEmail };
