/**
 * CLI Test Script for Nodemailer Mail Service
 *
 * Usage:
 *   node test-mail.js [optional_recipient@example.com]
 *   npm test
 */

const { verifyTransporter } = require('./src/config/transporter');
const { sendOtpEmail, sendWelcomeEmail } = require('./src/services/mailService');

async function runTest() {
  const recipient = (process.argv[2] || 'student@example.com').trim();
  const testOtp = Math.floor(100000 + Math.random() * 900000).toString();

  console.log('----------------------------------------------------');
  console.log('   EduBook Nodemailer Service — Diagnostic Test');
  console.log('----------------------------------------------------');
  console.log(`Target Recipient : ${recipient}`);
  console.log(`Generated OTP    : ${testOtp}`);
  console.log('Checking transport connection...');

  try {
    const health = await verifyTransporter();
    console.log(`Transport Status : CONNECTED (${health.host}:${health.port})`);
    console.log(`Account Mode     : ${health.isEthereal ? 'Ethereal Test Inbox (Simulated)' : 'Real SMTP Server'}`);

    console.log('\nSending test OTP verification email...');
    const otpResult = await sendOtpEmail({
      to: recipient,
      otp: testOtp,
      expiryMinutes: 10
    });

    console.log('  -> OTP Email Sent successfully!');
    console.log(`  -> Message ID: ${otpResult.messageId}`);
    if (otpResult.previewUrl) {
      console.log(`  -> ONE-CLICK PREVIEW URL: \x1b[36m${otpResult.previewUrl}\x1b[0m`);
    }

    console.log('\nSending test Welcome onboarding email...');
    const welcomeResult = await sendWelcomeEmail({
      to: recipient,
      username: 'Alex Student'
    });

    console.log('  -> Welcome Email Sent successfully!');
    console.log(`  -> Message ID: ${welcomeResult.messageId}`);
    if (welcomeResult.previewUrl) {
      console.log(`  -> ONE-CLICK PREVIEW URL: \x1b[36m${welcomeResult.previewUrl}\x1b[0m`);
    }

    console.log('\n====================================================');
    console.log(' ALL NODEMAILER TESTS PASSED SUCCESSFULLY! ');
    console.log('====================================================');
    if (health.isEthereal) {
      console.log('\nTip: Copy & paste the preview URLs above into your browser to see the formatted HTML email templates.');
      console.log('To send real emails to live inboxes, edit mail-service/.env with your Gmail/SMTP credentials.');
    }
  } catch (err) {
    console.error('\n[ERROR] Nodemailer test encountered a failure:');
    console.error(err.message || err);
    process.exit(1);
  }
}

runTest();
