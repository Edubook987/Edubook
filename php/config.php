<?php
/**
 * config.php — DB connection + shared helpers.
 *
 * Ships configured for SQLite by default, which is why signup/login should
 * now work immediately with zero setup: there's no separate database
 * server to install, start, or authenticate against. The database file is
 * created automatically at php/data/edubook.sqlite the first time any
 * endpoint runs, and the `users` / `password_resets` tables are created
 * automatically too if they don't already exist — so there's no schema.sql
 * import step either.
 *
 * If you'd rather use a real MySQL server (e.g. in production), set
 * DB_DRIVER to 'mysql' below, fill in the DB_* constants to match your
 * server, and import sql/schema.sql into that database first.
 */

declare(strict_types=1);

// ---- Choose the database driver: 'sqlite' (default, zero setup) or 'mysql' ----
define('DB_DRIVER', 'sqlite');

// ---- Only used when DB_DRIVER is 'mysql' — edit to match your MySQL server ----
define('DB_HOST', 'localhost');
define('DB_NAME', 'edubook');
define('DB_USER', 'root');
define('DB_PASS', '');

// ---- Only used when DB_DRIVER is 'sqlite' ----
define('DB_SQLITE_PATH', __DIR__ . '/data/edubook.sqlite');

// ---- OTP settings ----
define('OTP_EXPIRY_MINUTES', 10);
define('OTP_MAX_ATTEMPTS', 5);

// ---- Outgoing email configuration ----
// Choose the mail driver:
//   'nodemailer' (default) -> Dispatches to the Node.js mail service (mail-service/, port 5000).
//   'phpmailer'            -> Uses legacy bundled PHPMailer via PHP directly.
define('MAIL_DRIVER', 'nodemailer');
define('NODEMAILER_SERVICE_URL', 'http://127.0.0.1:5000/api/mail');

// To enable it:
//   1. Set SMTP_ENABLED to true.
//   2. Fill in SMTP_USERNAME / SMTP_PASSWORD with a real account's SMTP
//      login — for Gmail, create a 16-character "App Password" at
//      https://myaccount.google.com/apppasswords (your normal Gmail
//      password won't work here) and use your Gmail address as both
//      SMTP_USERNAME and SMTP_FROM_EMAIL. Any other SMTP provider (college
//      email, Outlook, SendGrid, Mailgun, etc.) works the same way — just
//      swap in that provider's host/port/credentials.
// Until SMTP_ENABLED is true, send_otp.php logs a clear reminder to the
// PHP server's console instead of emailing anything (see php/mailer.php) —
// it does NOT show the OTP on the webpage either way.
define('SMTP_ENABLED', false);
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_ENCRYPTION', 'tls'); // 'tls' (port 587) or 'ssl' (port 465)
define('SMTP_USERNAME', '');
define('SMTP_PASSWORD', '');
define('SMTP_FROM_EMAIL', '');     // defaults to SMTP_USERNAME if left blank
define('SMTP_FROM_NAME', 'EduBook');
// While you're getting SMTP working, set this to true to see the *exact*
// failure reason (wrong password, blocked port, etc.) in php/test_mail.php
// and in send_otp.php's response. Turn it back off afterwards — it's not
// something you want a real user to see.
define('SMTP_DEBUG', false);

// ---- Session (every endpoint that needs the signed-in user relies on this) ----
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/** Creates the users/password_resets tables if they don't exist yet (SQLite only — a MySQL database is expected to already have sql/schema.sql imported). */
function edubook_ensure_schema(PDO $pdo): void {
    if (DB_DRIVER !== 'sqlite') {
        return;
    }
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))
        )'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            otp_hash TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))
        )'
    );
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id)');
}

/** True once we've successfully connected, so endpoints can tell a DB-setup problem apart from bad input. */
$GLOBALS['edubook_db_ready'] = false;

try {
    if (DB_DRIVER === 'sqlite') {
        $dir = dirname(DB_SQLITE_PATH);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Could not create ' . $dir . ' — check folder permissions.');
        }
        $pdo = new PDO(
            'sqlite:' . DB_SQLITE_PATH,
            null,
            null,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    } else {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    }
    edubook_ensure_schema($pdo);
    $GLOBALS['edubook_db_ready'] = true;
} catch (Throwable $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => DB_DRIVER === 'sqlite'
            ? 'Database setup failed: ' . $e->getMessage() . ' (check that php/data/ is writable and the pdo_sqlite PHP extension is enabled).'
            : 'Database connection failed. Check the DB_* settings in php/config.php and that MySQL is running.',
    ]);
    exit;
}

/** Send a JSON response and stop. */
function json_response(int $status, array $body): void {
    header('Content-Type: application/json');
    http_response_code($status);
    echo json_encode($body);
    exit;
}

/** Basic email format check. */
function is_valid_email(string $email): bool {
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

/** Password strength check: 8+ chars, at least one letter and one number. */
function is_valid_password(string $password): bool {
    return strlen($password) >= 8 && preg_match('/[A-Za-z]/', $password) && preg_match('/[0-9]/', $password);
}
