// hCaptcha site key (public). When unset (e.g. local dev without a key) the
// widget is skipped and no token is required -- only use that while CAPTCHA
// protection is switched off in Supabase.
export const HCAPTCHA_SITE_KEY: string | undefined = import.meta.env
  .VITE_HCAPTCHA_SITEKEY;

export const captchaEnabled = Boolean(HCAPTCHA_SITE_KEY);
