import * as OTPAuth from 'otpauth';

export const DEFAULT_2FA_SECRET = 'CLOUDPROSECRET23';
export const EMERGENCY_RESCUE_CODE = '992211';

/**
 * Creates an RFC 6238 TOTP instance for CloudPRO
 */
export const createTotpInstance = (
  secret: string = DEFAULT_2FA_SECRET,
  userEmail: string = 'admin@denbaguse.my.id'
): OTPAuth.TOTP => {
  const cleanSecret =
    secret && !/[^A-Z2-7]/i.test(secret) ? secret.toUpperCase() : DEFAULT_2FA_SECRET;

  return new OTPAuth.TOTP({
    issuer: 'CloudPRO Enterprise',
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

  try {
    const totp = createTotpInstance(secret, userEmail);
    const delta = totp.validate({ token: cleanToken, window: 1 });
    return delta !== null;
  } catch (err) {
    console.error('TOTP verification error:', err);
    return false;
  }
};
