/**
 * Express router for mail service endpoints
 */

const express = require('express');
const router = express.Router();
const { verifyTransporter } = require('../config/transporter');
const {
  dispatchMail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetSuccessEmail,
  sendGenericNotification
} = require('../services/mailService');

/**
 * Basic email validator
 */
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * GET /api/mail/verify
 * Tests SMTP credentials and transport connectivity
 */
router.get('/verify', async (req, res) => {
  try {
    const result = await verifyTransporter();
    res.json({
      success: true,
      message: 'SMTP connection successfully verified.',
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `SMTP verification failed: ${err.message}`
    });
  }
});

/**
 * POST /api/mail/send-otp
 * Body: { to: string, otp: string, expiryMinutes?: number }
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { to, otp, expiryMinutes } = req.body;

    if (!isValidEmail(to)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing "to" email address.' });
    }
    if (!otp || String(otp).trim() === '') {
      return res.status(400).json({ success: false, message: 'Missing "otp" code.' });
    }

    const result = await sendOtpEmail({
      to: to.trim(),
      otp: String(otp).trim(),
      expiryMinutes: expiryMinutes ? parseInt(expiryMinutes, 10) : 10
    });

    res.json({
      success: true,
      message: 'Verification OTP sent successfully.',
      data: result
    });
  } catch (err) {
    console.error('[MailService Error][send-otp]', err);
    res.status(500).json({
      success: false,
      message: `Failed to send OTP: ${err.message}`
    });
  }
});

/**
 * POST /api/mail/send-welcome
 * Body: { to: string, username?: string }
 */
router.post('/send-welcome', async (req, res) => {
  try {
    const { to, username } = req.body;

    if (!isValidEmail(to)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing "to" email address.' });
    }

    const result = await sendWelcomeEmail({
      to: to.trim(),
      username: username ? String(username).trim() : 'Student'
    });

    res.json({
      success: true,
      message: 'Welcome email sent successfully.',
      data: result
    });
  } catch (err) {
    console.error('[MailService Error][send-welcome]', err);
    res.status(500).json({
      success: false,
      message: `Failed to send welcome email: ${err.message}`
    });
  }
});

/**
 * POST /api/mail/send-reset-success
 * Body: { to: string, username?: string }
 */
router.post('/send-reset-success', async (req, res) => {
  try {
    const { to, username } = req.body;

    if (!isValidEmail(to)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing "to" email address.' });
    }

    const result = await sendPasswordResetSuccessEmail({
      to: to.trim(),
      username: username ? String(username).trim() : 'Student'
    });

    res.json({
      success: true,
      message: 'Password reset confirmation sent successfully.',
      data: result
    });
  } catch (err) {
    console.error('[MailService Error][send-reset-success]', err);
    res.status(500).json({
      success: false,
      message: `Failed to send reset success email: ${err.message}`
    });
  }
});

/**
 * POST /api/mail/send
 * Body: { to: string, subject?: string, html?: string, text?: string, title?: string, message?: string }
 */
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, text, title, message, buttonText, buttonUrl } = req.body;

    if (!isValidEmail(to)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing "to" email address.' });
    }

    let result;
    if (html || (subject && text)) {
      result = await dispatchMail({
        to: to.trim(),
        subject: subject || 'EduBook Notification',
        html: html || `<p>${text}</p>`,
        text: text || ''
      });
    } else if (message) {
      result = await sendGenericNotification({
        to: to.trim(),
        title: title || 'EduBook Notification',
        message: message,
        buttonText,
        buttonUrl
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Must provide either { subject, html/text } or { message }.'
      });
    }

    res.json({
      success: true,
      message: 'Email delivered successfully.',
      data: result
    });
  } catch (err) {
    console.error('[MailService Error][send]', err);
    res.status(500).json({
      success: false,
      message: `Failed to send email: ${err.message}`
    });
  }
});

module.exports = router;
