<?php
/**
 * mailer.php — Unified email delivery for EduBook.
 * Supports:
 *   1. Modern Nodemailer microservice (MAIL_DRIVER === 'nodemailer')
 *   2. Legacy bundled PHPMailer (MAIL_DRIVER === 'phpmailer')
 */

declare(strict_types=1);
require_once __DIR__ . '/config.php';

// Conditionally require PHPMailer only when PHPMailer driver or fallback is used
if (file_exists(__DIR__ . '/vendor/phpmailer/src/PHPMailer.php')) {
    require_once __DIR__ . '/vendor/phpmailer/src/Exception.php';
    require_once __DIR__ . '/vendor/phpmailer/src/PHPMailer.php';
    require_once __DIR__ . '/vendor/phpmailer/src/SMTP.php';
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

/**
 * Dispatches an HTTP POST request to the local Nodemailer mail service.
 */
function edubook_post_nodemailer(string $endpoint, array $payload, ?string &$errorOut = null): bool {
    $serviceUrl = defined('NODEMAILER_SERVICE_URL') ? NODEMAILER_SERVICE_URL : 'http://127.0.0.1:5000/api/mail';
    $url = rtrim($serviceUrl, '/') . '/' . ltrim($endpoint, '/');
    $jsonData = json_encode($payload);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json',
            'Content-Length: ' . strlen((string) $jsonData),
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            $errorOut = "Could not connect to Nodemailer service at {$url}: {$curlErr}. Start the mail service with: cd mail-service && npm start";
            error_log('[EduBook mail] ' . $errorOut);
            return false;
        }

        $resData = json_decode((string)$response, true) ?? [];
        if ($httpCode >= 200 && $httpCode < 300 && !empty($resData['success'])) {
            return true;
        }

        $errorOut = $resData['message'] ?? "Nodemailer service returned HTTP {$httpCode}";
        error_log('[EduBook mail] ' . $errorOut);
        return false;
    }

    // Stream context fallback if curl is not available
    $context = stream_context_create([
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\nAccept: application/json\r\n",
            'content' => $jsonData,
            'timeout' => 6,
            'ignore_errors' => true,
        ],
    ]);

    $result = @file_get_contents($url, false, $context);
    if ($result === false) {
        $errorOut = "Could not connect to Nodemailer service at {$url}. Start the service with: cd mail-service && npm start";
        error_log('[EduBook mail] ' . $errorOut);
        return false;
    }

    $resData = json_decode($result, true) ?? [];
    if (!empty($resData['success'])) {
        return true;
    }

    $errorOut = $resData['message'] ?? 'Nodemailer service request failed';
    error_log('[EduBook mail] ' . $errorOut);
    return false;
}

/**
 * Sends OTP verification email via Nodemailer service
 */
function edubook_send_otp_nodemailer(string $toEmail, string $otp, int $expiryMinutes, ?string &$errorOut = null): bool {
    return edubook_post_nodemailer('send-otp', [
        'to' => $toEmail,
        'otp' => $otp,
        'expiryMinutes' => $expiryMinutes,
    ], $errorOut);
}

/**
 * Sends Welcome onboarding email via Nodemailer service
 */
function edubook_send_welcome_nodemailer(string $toEmail, string $username, ?string &$errorOut = null): bool {
    return edubook_post_nodemailer('send-welcome', [
        'to' => $toEmail,
        'username' => $username,
    ], $errorOut);
}

/**
 * Sends generic or plain-text email via PHPMailer
 */
function edubook_send_mail_phpmailer(string $toEmail, string $toName, string $subject, string $bodyText, ?string &$errorOut = null): bool {
    if (!defined('SMTP_ENABLED') || !SMTP_ENABLED) {
        $errorOut = 'SMTP_ENABLED is false in php/config.php — nothing was sent. Set it to true and fill in SMTP_USERNAME/SMTP_PASSWORD.';
        error_log('[EduBook mail] Not sent to ' . $toEmail . ' — ' . $errorOut);
        return false;
    }
    if (SMTP_USERNAME === '' || SMTP_PASSWORD === '') {
        $errorOut = 'SMTP_ENABLED is true but SMTP_USERNAME and/or SMTP_PASSWORD is still blank in php/config.php.';
        error_log('[EduBook mail] Not sent to ' . $toEmail . ' — ' . $errorOut);
        return false;
    }

    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        $errorOut = 'PHPMailer class not available.';
        return false;
    }

    $mail = new PHPMailer(true);
    try {
        if (defined('SMTP_DEBUG') && SMTP_DEBUG) {
            $mail->SMTPDebug = 2;
            $mail->Debugoutput = function (string $str, int $level): void {
                error_log('[EduBook mail][SMTP] ' . trim($str));
            };
        }
        $mail->isSMTP();
        $mail->Host = SMTP_HOST;
        $mail->Port = SMTP_PORT;
        $mail->Timeout = 10;
        $mail->SMTPAuth = true;
        $mail->Username = SMTP_USERNAME;
        $mail->Password = SMTP_PASSWORD;
        $mail->SMTPSecure = (defined('SMTP_ENCRYPTION') && SMTP_ENCRYPTION === 'ssl') ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->CharSet = 'UTF-8';

        $fromEmail = (defined('SMTP_FROM_EMAIL') && SMTP_FROM_EMAIL !== '') ? SMTP_FROM_EMAIL : SMTP_USERNAME;
        $fromName = defined('SMTP_FROM_NAME') ? SMTP_FROM_NAME : 'EduBook';
        $mail->setFrom($fromEmail, $fromName);
        $mail->addAddress($toEmail, $toName);
        $mail->Subject = $subject;
        $mail->isHTML(false);
        $mail->Body = $bodyText;

        $mail->send();
        return true;
    } catch (PHPMailerException $e) {
        $errorOut = $mail->ErrorInfo;
        error_log('[EduBook mail] Failed to send to ' . $toEmail . ': ' . $errorOut);
        return false;
    }
}

/**
 * Universal mail sending function.
 * Routes to Nodemailer service by default, or PHPMailer depending on MAIL_DRIVER.
 */
function edubook_send_mail(string $toEmail, string $toName, string $subject, string $bodyText, ?string &$errorOut = null): bool {
    $driver = defined('MAIL_DRIVER') ? MAIL_DRIVER : 'nodemailer';

    if ($driver === 'nodemailer') {
        // If this body contains a 6-digit OTP, send with dedicated styled OTP template
        if (preg_match('/(?:verification code is:\s*|code:\s*)(\d{6})/i', $bodyText, $matches)) {
            $otp = $matches[1];
            $expiry = defined('OTP_EXPIRY_MINUTES') ? OTP_EXPIRY_MINUTES : 10;
            return edubook_send_otp_nodemailer($toEmail, $otp, $expiry, $errorOut);
        }

        // Generic email via Nodemailer
        return edubook_post_nodemailer('send', [
            'to' => $toEmail,
            'subject' => $subject,
            'text' => $bodyText,
        ], $errorOut);
    }

    // Default to PHPMailer
    return edubook_send_mail_phpmailer($toEmail, $toName, $subject, $bodyText, $errorOut);
}
