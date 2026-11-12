import { forwardRef, useImperativeHandle, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { HCAPTCHA_SITE_KEY } from "../../lib/captcha";

export type CaptchaHandle = { reset: () => void };

type Props = {
  onToken: (token: string | null) => void;
};

// Tokens are single-use: call ref.reset() after every Supabase auth attempt.
const CaptchaField = forwardRef<CaptchaHandle, Props>(function CaptchaField(
  { onToken },
  ref,
) {
  const widget = useRef<HCaptcha>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      widget.current?.resetCaptcha();
      onToken(null);
    },
  }));

  if (!HCAPTCHA_SITE_KEY) return null;

  return (
    <div className="flex justify-center">
      <HCaptcha
        ref={widget}
        sitekey={HCAPTCHA_SITE_KEY}
        onVerify={(token) => onToken(token)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
      />
    </div>
  );
});

export default CaptchaField;
