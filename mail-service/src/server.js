/**
 * EduBook Nodemailer Mail Service
 * Express server entry point
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const mailRoutes = require('./routes/mailRoutes');
const { verifyTransporter } = require('./config/transporter');

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EduBook Nodemailer Mail Service',
    time: new Date().toISOString()
  });
});

// Mail Endpoints
app.use('/api/mail', mailRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found.`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[MailService Error]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
const server = app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(`  EduBook Nodemailer Mail Service running on port ${PORT}`);
  console.log(`  Healthcheck: http://localhost:${PORT}/health`);
  console.log(`  API Routes:  http://localhost:${PORT}/api/mail/send-otp`);
  console.log(`               http://localhost:${PORT}/api/mail/send-welcome`);
  console.log(`               http://localhost:${PORT}/api/mail/send`);
  console.log(`               http://localhost:${PORT}/api/mail/verify`);
  console.log('====================================================');

  try {
    const health = await verifyTransporter();
    console.log(`[MailService] Initial SMTP transport check: SUCCESS (${health.host}:${health.port})`);
    if (health.isEthereal) {
      console.log('[MailService] Running in ETHEREAL test mode. Emails will output preview URLs in this console.');
    }
  } catch (err) {
    console.warn(`[MailService] Initial SMTP check failed: ${err.message}`);
    console.warn('[MailService] Check your .env SMTP credentials if you intend to send real emails.');
  }
});

module.exports = { app, server };
