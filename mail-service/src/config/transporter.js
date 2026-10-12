/**
 * Transporter configuration for Nodemailer
 * Supports production SMTP (e.g. Gmail, Outlook, custom SMTP)
 * and automatic Ethereal test accounts for zero-friction local testing.
 */

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Ensure .env is loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });

let activeTransporter = null;
let isEtherealAccount = false;
let etherealUser = null;

/**
 * Initializes and returns the active Nodemailer transporter.
 * Caches the transporter after first initialization.
 */
async function getTransporter() {
  if (activeTransporter) {
    return { transporter: activeTransporter, isEthereal: isEtherealAccount };
  }

  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  // If real SMTP credentials are provided, use them
  if (smtpUser && smtpPass) {
    activeTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    isEtherealAccount = false;
    console.log(`[MailService] Configured SMTP with host: ${smtpHost}:${smtpPort} (User: ${smtpUser})`);
    return { transporter: activeTransporter, isEthereal: false };
  }

  // Fallback to Ethereal if credentials are not provided
  if (process.env.USE_ETHEREAL_IF_NO_AUTH !== 'false') {
    console.log('[MailService] No SMTP credentials in .env. Creating temporary Ethereal test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      etherealUser = testAccount.user;
      activeTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      isEtherealAccount = true;
      console.log(`[MailService] Ethereal test account ready: ${testAccount.user}`);
      console.log('[MailService] Sent emails will produce a web preview URL in your terminal.');
      return { transporter: activeTransporter, isEthereal: true };
    } catch (err) {
      console.error('[MailService] Failed to create Ethereal test account:', err.message);
      throw err;
    }
  }

  throw new Error('SMTP credentials are missing and USE_ETHEREAL_IF_NO_AUTH is disabled.');
}

/**
 * Resolves the default sender header "Name <email@example.com>"
 */
function getSenderAddress() {
  const fromName = process.env.FROM_NAME || 'EduBook';
  const fromEmail = (process.env.FROM_EMAIL || process.env.SMTP_USER || etherealUser || 'no-reply@edubook.local').trim();
  return `"${fromName}" <${fromEmail}>`;
}

/**
 * Verifies SMTP connection health.
 */
async function verifyTransporter() {
  const { transporter, isEthereal } = await getTransporter();
  const verified = await transporter.verify();
  return {
    verified: Boolean(verified),
    isEthereal,
    host: transporter.options.host,
    port: transporter.options.port
  };
}

module.exports = {
  getTransporter,
  getSenderAddress,
  verifyTransporter
};
