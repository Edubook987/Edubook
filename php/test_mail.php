<?php
/**
 * test_mail.php — a standalone SMTP test, separate from the OTP flow, so
 * you can check your email settings in one request instead of going
 * through signup → forgot password → check inbox every time you tweak
 * php/config.php.
 *
 * Usage:
 *   Browser:  http://localhost:8000/php/test_mail.php?to=you@example.com
 *   CLI:      php php/test_mail.php you@example.com
 *
 * Prints exactly what happened — sent OK, or the precise SMTP error
 * (wrong password, blocked port, unknown host, etc.) — regardless of
 * SMTP_DEBUG, since this script is only ever something *you* run.
 *
 * Delete this file (or at least don't deploy it) once email is working —
 * it's a developer tool, not part of the app's normal request flow.
 */

declare(strict_types=1);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/mailer.php';

$to = PHP_SAPI === 'cli' ? ($argv[1] ?? '') : (string) ($_GET['to'] ?? '');
$to = trim($to);

header('Content-Type: text/plain; charset=utf-8');

echo "EduBook Mail Diagnostics\n";
echo "========================\n";
echo "MAIL_DRIVER    : " . (defined('MAIL_DRIVER') ? MAIL_DRIVER : 'nodemailer') . "\n";
if (defined('MAIL_DRIVER') && MAIL_DRIVER === 'nodemailer') {
    echo "SERVICE_URL    : " . (defined('NODEMAILER_SERVICE_URL') ? NODEMAILER_SERVICE_URL : 'http://127.0.0.1:5000/api/mail') . "\n";
} else {
    echo "SMTP_ENABLED   : " . (SMTP_ENABLED ? 'true' : 'false') . "\n";
    echo "SMTP_HOST:PORT : " . SMTP_HOST . ':' . SMTP_PORT . " (" . SMTP_ENCRYPTION . ")\n";
    echo "SMTP_USERNAME  : " . (SMTP_USERNAME !== '' ? SMTP_USERNAME : '(blank)') . "\n";
}
echo "Sending to     : " . ($to !== '' ? $to : '(none given)') . "\n\n";

if (!is_valid_email($to)) {
    echo "Give a real address to send a test email to, e.g.:\n";
    echo "  http://localhost:8000/php/test_mail.php?to=you@example.com\n";
    echo "  php php/test_mail.php you@example.com\n";
    exit;
}

$error = null;
$start = microtime(true);
$ok = edubook_send_mail($to, '', 'EduBook SMTP test', "This is a test email from EduBook's php/test_mail.php.\nIf you received this, SMTP is working correctly.", $error);
$elapsed = round(microtime(true) - $start, 2);

if ($ok) {
    echo "RESULT: sent successfully in {$elapsed}s. Check the inbox (and spam folder) for $to.\n";
} else {
    echo "RESULT: failed after {$elapsed}s.\n";
    echo "REASON: " . ($error ?? 'unknown') . "\n\n";
    echo "Common fixes:\n";
    echo "  - 'SMTP_ENABLED is false'       -> set it to true in php/config.php\n";
    echo "  - 'username/password blank'     -> fill in SMTP_USERNAME / SMTP_PASSWORD\n";
    echo "  - 'Could not authenticate'      -> for Gmail, you need a 16-char App Password,\n";
    echo "                                      not your normal Gmail password:\n";
    echo "                                      https://myaccount.google.com/apppasswords\n";
    echo "                                      (requires 2-Step Verification to be on)\n";
    echo "  - 'Could not connect'/'timed out' -> port " . SMTP_PORT . " is blocked on this network\n";
    echo "                                      (common on campus/office Wi-Fi) — try a\n";
    echo "                                      different network, or a provider that offers\n";
    echo "                                      an HTTPS API instead of SMTP (SendGrid, etc.)\n";
}
