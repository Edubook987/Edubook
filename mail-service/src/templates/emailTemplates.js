/**
 * Responsive, branded HTML email templates for EduBook
 * Styled with modern typography, gradients, and accessible plain-text fallbacks.
 */

/**
 * Common layout wrapper for EduBook emails
 */
function wrapLayout({ title, preheader, contentHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 16px;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 36px 32px;
      text-align: center;
      color: #ffffff;
    }
    .logo-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      border-radius: 50px;
      padding: 6px 18px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .header-title {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .body {
      padding: 36px 32px;
    }
    .body-p {
      margin: 0 0 18px;
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
    }
    .otp-box {
      margin: 28px 0;
      padding: 24px;
      background: #f1f5f9;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      text-align: center;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #4338ca;
      margin: 0;
      padding-left: 10px;
    }
    .otp-subtext {
      margin: 8px 0 0;
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin: 12px 0 20px;
      text-align: center;
    }
    .callout {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 14px 16px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
      font-size: 14px;
      color: #92400e;
      line-height: 1.5;
    }
    .footer {
      padding: 24px 32px 32px;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      background-color: #fafafa;
    }
    .footer-text {
      margin: 0 0 8px;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .preheader {
      display: none !important;
      visibility: hidden;
      mso-hide: all;
      font-size: 1px;
      line-height: 1px;
      max-height: 0;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <span class="preheader">${preheader}</span>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo-badge">EduBook</div>
        <h1 class="header-title">${title}</h1>
      </div>
      <div class="body">
        ${contentHtml}
      </div>
      <div class="footer">
        <p class="footer-text">EduBook — Student Book Resale & Exchange Platform.</p>
        <p class="footer-text">This is an automated system message. Please do not reply directly to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates OTP verification email
 */
function renderOtpEmail({ otp, expiryMinutes = 10 }) {
  const subject = `Your EduBook verification code is ${otp}`;
  const preheader = `Use verification code ${otp} to reset your EduBook password. Expires in ${expiryMinutes} minutes.`;

  const contentHtml = `
    <p class="body-p">Hello,</p>
    <p class="body-p">You requested a verification code to access or reset your EduBook account password.</p>
    
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-subtext">Valid for the next ${expiryMinutes} minutes</div>
    </div>

    <div class="callout">
      <strong>Security notice:</strong> Never share this code with anyone. EduBook staff will never ask for your verification code.
    </div>

    <p class="body-p" style="color: #64748b; font-size: 14px;">
      If you did not request this verification code, someone may have entered your email address by mistake. You can safely ignore this email — your account remains secure.
    </p>
  `;

  const html = wrapLayout({
    title: 'Verification Code',
    preheader,
    contentHtml
  });

  const text = `EduBook Verification Code: ${otp}\n\n` +
    `Use this 6-digit code to complete your password reset. It expires in ${expiryMinutes} minutes.\n\n` +
    `If you did not request this, you can safely ignore this email.\n\n` +
    `— EduBook Team`;

  return { subject, html, text };
}

/**
 * Generates Welcome email for new signups
 */
function renderWelcomeEmail({ username }) {
  const subject = `Welcome to EduBook, ${username}!`;
  const preheader = `Your EduBook account is ready. Explore books, list textbooks, and save on study materials.`;

  const contentHtml = `
    <p class="body-p">Hi <strong>${username}</strong>,</p>
    <p class="body-p">Welcome to <strong>EduBook</strong>! We are thrilled to have you in our student community. EduBook helps you save money and exchange textbooks effortlessly.</p>
    
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px; font-size: 16px; color: #1e293b;">Here is what you can do right away:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
        <li><strong>Browse & Buy:</strong> Find textbooks for your courses at student-friendly prices.</li>
        <li><strong>Sell Your Old Books:</strong> List your used semester books in minutes and earn cash.</li>
        <li><strong>AI Book Assistant:</strong> Use our AI widget to quickly find course materials and recommendations.</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 28px 0 16px;">
      <a href="http://localhost:8000/pages/home.html" class="btn">Explore Book Listings</a>
    </div>

    <p class="body-p" style="color: #64748b; font-size: 14px;">Happy reading and learning!<br>The EduBook Team</p>
  `;

  const html = wrapLayout({
    title: 'Welcome to EduBook!',
    preheader,
    contentHtml
  });

  const text = `Welcome to EduBook, ${username}!\n\n` +
    `Your account is ready. Browse used textbooks at great prices, or list your books to exchange with fellow students.\n\n` +
    `Get started: http://localhost:8000/pages/home.html\n\n` +
    `— EduBook Team`;

  return { subject, html, text };
}

/**
 * Generates Password Reset Success notification
 */
function renderPasswordResetSuccessEmail({ username = 'there' }) {
  const subject = 'Your EduBook password was successfully updated';
  const preheader = 'Confirmation: The password for your EduBook account has been changed.';

  const contentHtml = `
    <p class="body-p">Hello <strong>${username}</strong>,</p>
    <p class="body-p">This email confirms that the password for your EduBook account was just changed.</p>
    
    <div class="callout" style="background-color: #f0fdf4; border-color: #22c55e; color: #15803d;">
      <strong>Security update:</strong> Your new password is now active. You can log into EduBook using your updated credentials.
    </div>

    <p class="body-p" style="color: #64748b; font-size: 14px;">
      If you did <strong>not</strong> make this change, please reset your password immediately or reach out to support right away to protect your account.
    </p>
  `;

  const html = wrapLayout({
    title: 'Password Updated',
    preheader,
    contentHtml
  });

  const text = `Your EduBook password was successfully changed.\n\n` +
    `If you did not perform this action, please reset your password immediately.\n\n` +
    `— EduBook Team`;

  return { subject, html, text };
}

/**
 * Generic notification template
 */
function renderGenericEmail({ title = 'EduBook Notification', message, buttonText, buttonUrl }) {
  const subject = title;
  const preheader = message.substring(0, 100);

  const buttonHtml = buttonText && buttonUrl ? `
    <div style="text-align: center; margin: 24px 0 12px;">
      <a href="${buttonUrl}" class="btn">${buttonText}</a>
    </div>
  ` : '';

  const contentHtml = `
    <p class="body-p">${message.replace(/\n/g, '<br>')}</p>
    ${buttonHtml}
  `;

  const html = wrapLayout({
    title,
    preheader,
    contentHtml
  });

  const text = `${title}\n\n${message}\n\n${buttonUrl ? buttonUrl : ''}\n\n— EduBook Team`;

  return { subject, html, text };
}

module.exports = {
  renderOtpEmail,
  renderWelcomeEmail,
  renderPasswordResetSuccessEmail,
  renderGenericEmail
};
