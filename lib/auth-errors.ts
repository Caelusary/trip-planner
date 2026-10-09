/**
 * Fixed allowlist of auth error messages. Never render Supabase's raw error
 * text (or any other free-form string) in the login/signup banner — a
 * `?error=` query param with attacker-controlled text is a phishing vector.
 * Only codes from this table (or "unknown") are ever displayed.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  email_not_confirmed: "Please confirm your email before logging in.",
  user_already_exists: "An account with that email already exists.",
  weak_password: "Password is too weak. Use at least 6 characters.",
  over_email_send_rate_limit: "Too many attempts. Please wait a moment and try again.",
  email_address_invalid: "That email address doesn't look valid.",
  invalid_input: "Please enter a valid email and password (at least 6 characters).",
  rate_limited: "Too many attempts. Please wait a minute and try again.",
};

const DEFAULT_CODE = "unknown";
const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

export function authErrorCode(error: { code?: string } | null | undefined): string {
  return error?.code && error.code in AUTH_ERROR_MESSAGES ? error.code : DEFAULT_CODE;
}

export function authErrorMessage(code: string | undefined): string {
  if (!code) return DEFAULT_MESSAGE;
  return AUTH_ERROR_MESSAGES[code] ?? DEFAULT_MESSAGE;
}

// Same allowlist principle as AUTH_ERROR_MESSAGES above, for non-error banners.
const NOTICE_MESSAGES: Record<string, string> = {
  confirmation_resent: "Confirmation email resent. Check your inbox (and spam folder).",
};

export function authNoticeMessage(code: string | undefined): string | null {
  if (!code) return null;
  return NOTICE_MESSAGES[code] ?? null;
}
