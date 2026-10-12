<?php
/**
 * send_otp.php — POST { email } → generate and email a 6-digit OTP.
 *
 * Always returns a generic success-shaped response whether or not the email
 * is registered (per README: "can't be used to enumerate accounts").
 */

declare(strict_types=1);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['success' => false, 'message' => 'Method not allowed.']);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$email = trim((string)($input['email'] ?? ''));

if (!is_valid_email($email)) {
    json_response(400, ['success' => false, 'message' => 'Enter a valid email address.']);
}

$generic = ['success' => true, 'message' => 'If that email is registered, a verification code has been sent.'];

try {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user) {
        // Same response either way — don't reveal whether the email exists.
        json_response(200, $generic);
    }

    $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $otpHash = password_hash($otp, PASSWORD_BCRYPT);
    $expiresAt = date('Y-m-d H:i:s', time() + OTP_EXPIRY_MINUTES * 60);

    $insert = $pdo->prepare(
        'INSERT INTO password_resets (user_id, otp_hash, attempts, expires_at) VALUES (:user_id, :otp_hash, 0, :expires_at)'
    );
    $insert->execute(['user_id' => $user['id'], 'otp_hash' => $otpHash, 'expires_at' => $expiresAt]);

    $subject = 'Your EduBook verification code';
    $body = "Your EduBook verification code is: $otp\nIt expires in " . OTP_EXPIRY_MINUTES . " minutes.\n\nIf you didn't request this, you can ignore this email.";
    $mailError = null;
    $sent = edubook_send_mail($email, '', $subject, $body, $mailError);

    $mailActive = (defined('MAIL_DRIVER') && MAIL_DRIVER === 'nodemailer') || SMTP_ENABLED;
    if (!$sent && $mailActive) {
        // SMTP *is* configured but the send still failed (bad credentials,
        // provider blocked it, etc.) — that's a setup problem, not the
        // user's fault, so tell them plainly rather than pretending it
        // worked. The real reason is always in the server log, and also
        // right here in the response while SMTP_DEBUG is on (turn it off
        // once email is working — a real user shouldn't see this detail).
        json_response(200, [
            'success' => false,
            'message' => 'We could not send the verification email right now. Please try again in a moment.'
                . (SMTP_DEBUG && $mailError ? ' [debug: ' . $mailError . ']' : ''),
        ]);
    }
    // Either delivered, or SMTP isn't configured yet (logged server-side by
    // mailer.php) — same generic response either way so this can't be used
    // to find out which emails are registered.
    json_response(200, $generic);
} catch (Throwable $e) {
    json_response(200, $generic);
}
