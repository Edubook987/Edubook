/**
 * Mail service operations using Nodemailer and templates
 */

const nodemailer = require('nodemailer');
const { getTransporter, getSenderAddress } = require('../config/transporter');
const {
  renderOtpEmail,
  renderWelcomeEmail,
  renderPasswordResetSuccessEmail,
  renderGenericEmail
} = require('../templates/emailTemplates');

/**
 * Core dispatch function to deliver an email
 */
async function dispatchMail({ to, subject, html, text }) {
  if (!to) {
    throw new Error('Recipient "to" email address is required.');
  }

  const { transporter, isEthereal } = await getTransporter();
  const from = getSenderAddress();

  const mailOptions = {
    from,
    to,
    subject,
    html,
    text
  };

  const info = await transporter.sendMail(mailOptions);

  let previewUrl = null;
  if (isEthereal) {
    previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[MailService] Email delivered to Ethereal! Preview URL: ${previewUrl}`);
  } else {
    console.log(`[MailService] Email delivered to ${to} (Message ID: ${info.messageId})`);
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl,
    isEthereal,
    accepted: info.accepted,
    rejected: info.rejected
  };
}

/**
 * Sends OTP verification code email
 */
async function sendOtpEmail({ to, otp, expiryMinutes = 10 }) {
  if (!otp) {
    throw new Error('OTP code is required.');
  }
  const { subject, html, text } = renderOtpEmail({ otp, expiryMinutes });
  return await dispatchMail({ to, subject, html, text });
}

/**
 * Sends welcome email to new users
 */
async function sendWelcomeEmail({ to, username }) {
  const { subject, html, text } = renderWelcomeEmail({ username: username || 'Student' });
  return await dispatchMail({ to, subject, html, text });
}

/**
 * Sends password reset confirmation email
 */
async function sendPasswordResetSuccessEmail({ to, username }) {
  const { subject, html, text } = renderPasswordResetSuccessEmail({ username });
  return await dispatchMail({ to, subject, html, text });
}

/**
 * Sends generic formatted notification email
 */
async function sendGenericNotification({ to, title, message, buttonText, buttonUrl }) {
  const { subject, html, text } = renderGenericEmail({ title, message, buttonText, buttonUrl });
  return await dispatchMail({ to, subject, html, text });
}

module.exports = {
  dispatchMail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetSuccessEmail,
  sendGenericNotification
};
