import * as OTPAuth from 'otpauth';

export const DEFAULT_2FA_SECRET = 'KARSACLOUDSECRET23';
export const LEGACY_2FA_SECRETS = ['CLOUDPROSECRET23', 'GRIDMASTERSECRET23'];
export const EMERGENCY_RESCUE_CODE = '992211';

/**
 * Creates an RFC 6238 TOTP instance for Karsa Cloud
 */
export const createTotpInstance = (
  secret: string = DEFAULT_2FA_SECRET,
  userEmail: string = 'admin@denbaguse.my.id'
): OTPAuth.TOTP => {
  const cleanSecret =
    secret && !/[^A-Z2-7]/i.test(secret) ? secret.toUpperCase() : DEFAULT_2FA_SECRET;

  return new OTPAuth.TOTP({
    issuer: 'Karsa Cloud',
    label: userEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: cleanSecret,
  });
};

/**
 * Verifies a 6-digit TOTP token against the Base32 secret.
 * Supports +/- 1 step window (90s tolerance) to accommodate device clock drift.
 * Also verifies legacy secrets (CLOUDPROSECRET23) so user phone with old CloudPRO profile still works smoothly.
 * Also supports the emergency rescue code for administrator recovery.
 */
export const verifyTotpCode = (
  token: string,
  secret: string = DEFAULT_2FA_SECRET,
  userEmail: string = 'admin@denbaguse.my.id'
): boolean => {
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  // Emergency rescue code for disaster recovery
  if (cleanToken === EMERGENCY_RESCUE_CODE) {
    return true;
  }

  // 1. Primary check with active secret
  try {
    const totp = createTotpInstance(secret, userEmail);
    const delta = totp.validate({ token: cleanToken, window: 1 });
    if (delta !== null) {
      return true;
    }
  } catch (err) {
    console.error('TOTP primary verification error:', err);
  }

  // 2. Compatibility check with legacy secrets (e.g. if user phone still has CloudPRO in Google Authenticator)
  const candidateSecrets = [DEFAULT_2FA_SECRET, ...LEGACY_2FA_SECRETS].filter(
    s => s !== secret
  );
  for (const fallbackSecret of candidateSecrets) {
    try {
      const fbTotp = createTotpInstance(fallbackSecret, userEmail);
      const fbDelta = fbTotp.validate({ token: cleanToken, window: 1 });
      if (fbDelta !== null) {
        return true;
      }
    } catch {}
  }

  return false;
};
