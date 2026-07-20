import { validateSlug } from "@/lib/installation/slug";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PasswordChecks = {
  minLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  percent: number;
  checks: PasswordChecks;
};

export function validateSetupEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return "ایمیل الزامی است.";
  if (!EMAIL_PATTERN.test(value)) return "فرمت ایمیل معتبر نیست.";
  return undefined;
}

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password),
  };
}

export function getPasswordStrength(password: string): PasswordStrength {
  const checks = getPasswordChecks(password);
  if (!password) {
    return { score: 0, label: "—", percent: 0, checks };
  }

  let points = 0;
  if (checks.minLength) points += 1;
  if (checks.hasLower && checks.hasUpper) points += 1;
  if (checks.hasNumber) points += 1;
  if (checks.hasSpecial) points += 1;

  const score = Math.min(4, points) as PasswordStrength["score"];
  const labels: Record<PasswordStrength["score"], string> = {
    0: "خیلی ضعیف",
    1: "ضعیف",
    2: "متوسط",
    3: "خوب",
    4: "قوی",
  };

  return {
    score,
    label: labels[score],
    percent: (score / 4) * 100,
    checks,
  };
}

export function validateSetupPassword(password: string): string | undefined {
  if (!password) return "رمز عبور الزامی است.";
  if (password.length < 8) return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  return undefined;
}

export function validateSetupPasswordConfirm(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) return "تکرار رمز عبور الزامی است.";
  if (password !== confirmPassword) return "رمز عبور و تکرار آن یکسان نیست.";
  return undefined;
}

export function validateBusinessName(name: string): string | undefined {
  const value = name.trim();
  if (!value) return "نام کسب‌وکار الزامی است.";
  if (value.length < 2) return "نام کسب‌وکار باید حداقل ۲ کاراکتر باشد.";
  return undefined;
}

export function validateBusinessSlug(slug: string): string | undefined {
  const value = slug.trim();
  if (!value) return "آدرس اختصاصی الزامی است.";
  const result = validateSlug(value);
  if (!result.ok) return result.error;
  return undefined;
}

export function validateTeamEmail(
  email: string,
  options?: { adminEmail?: string; otherEmails?: string[] },
): string | undefined {
  const value = email.trim();
  if (!value) return undefined;

  if (!EMAIL_PATTERN.test(value)) return "فرمت ایمیل معتبر نیست.";

  const normalized = value.toLowerCase();
  if (options?.adminEmail && normalized === options.adminEmail.trim().toLowerCase()) {
    return "ایمیل هم‌تیمی نمی‌تواند با ایمیل مدیر یکسان باشد.";
  }

  const duplicates = (options?.otherEmails ?? []).filter(
    (other, i) => other.trim().toLowerCase() === normalized,
  );
  if (duplicates.length > 0) return "این ایمیل تکراری است.";

  return undefined;
}

export type AccountFieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export type BusinessFieldErrors = {
  businessName?: string;
  slug?: string;
};

export function validateAccountFields(values: {
  email: string;
  password: string;
  confirmPassword: string;
}): AccountFieldErrors {
  return {
    email: validateSetupEmail(values.email),
    password: validateSetupPassword(values.password),
    confirmPassword: validateSetupPasswordConfirm(values.password, values.confirmPassword),
  };
}

export function validateBusinessFields(values: {
  businessName: string;
  slug: string;
  slugAvailable?: boolean | null;
}): BusinessFieldErrors {
  const errors: BusinessFieldErrors = {
    businessName: validateBusinessName(values.businessName),
    slug: validateBusinessSlug(values.slug),
  };

  if (!errors.slug && values.slugAvailable === false) {
    errors.slug = "این آدرس قبلاً رزرو شده یا نامعتبر است.";
  }
  if (!errors.slug && values.slugAvailable === null && values.slug.trim()) {
    errors.slug = "لطفاً در دسترس بودن آدرس را بررسی کنید.";
  }

  return errors;
}

export function validateTeamFields(
  teamEmails: string[],
  adminEmail: string,
): (string | undefined)[] {
  return teamEmails.map((email, index) => {
    const otherEmails = teamEmails.filter((_, i) => i !== index);
    return validateTeamEmail(email, { adminEmail, otherEmails });
  });
}

export function hasFieldErrors(errors: Record<string, unknown> | (unknown | undefined)[]): boolean {
  if (Array.isArray(errors)) return errors.some(Boolean);
  return Object.values(errors).some(Boolean);
}
