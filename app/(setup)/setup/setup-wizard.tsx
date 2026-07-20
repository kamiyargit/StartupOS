"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthPopover } from "@/components/setup/password-strength";
import { SetupShell } from "@/components/setup/setup-shell";
import { SETUP_STEPS } from "@/components/setup/setup-stepper";
import {
  SetupField,
  SetupPrimaryButton,
  SetupSecondaryButton,
  setupInputClasses,
  setupSelectClassName,
} from "@/components/setup/setup-field";
import {
  SetupTeamInviteList,
  createTeamInvite,
  teamInvitesFromEmails,
  touchAllTeamFields,
  type TeamInviteItem,
} from "@/components/setup/setup-team-invite";
import {
  hasFieldErrors,
  validateAccountFields,
  validateBusinessFields,
  validateBusinessName,
  validateBusinessSlug,
  validateSetupEmail,
  validateSetupPassword,
  validateSetupPasswordConfirm,
  validateTeamFields,
} from "@/lib/setup/form-validation";
import { getBaseDomain } from "@/lib/deployment-client";

type StepId = (typeof SETUP_STEPS)[number]["id"];

const BUSINESS_TYPES = ["استارتاپ", "فروشگاه", "خدمات", "تولیدی", "آژانس", "سایر"];

type SetupState = {
  organizationId: string;
  setupStep: StepId;
  status: string;
  organization: {
    name: string;
    businessType: string | null;
  };
  members: { fullName: string; email: string | null }[];
  adminDraft: { email: string; fullName: string } | null;
  slug: string | null;
};

type AccountErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

type BusinessErrors = {
  businessName?: string;
  slug?: string;
};

function stepIndex(step: StepId): number {
  return SETUP_STEPS.findIndex((s) => s.id === step);
}

export function SetupWizard() {
  const [step, setStep] = useState<StepId>("ACCOUNT");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [slug, setSlug] = useState("");
  const [slugPreview, setSlugPreview] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  const [teamInvites, setTeamInvites] = useState<TeamInviteItem[]>(() => [createTeamInvite()]);

  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [businessErrors, setBusinessErrors] = useState<BusinessErrors>({});
  const [teamErrors, setTeamErrors] = useState<(string | undefined)[]>([]);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [passwordHintOpen, setPasswordHintOpen] = useState(false);

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const showError = (field: string, error?: string) => (touched[field] ? error : undefined);

  const accountValid = useMemo(() => {
    const errors = validateAccountFields({ email, password, confirmPassword });
    return !hasFieldErrors(errors);
  }, [email, password, confirmPassword]);

  const businessValid = useMemo(() => {
    const errors = validateBusinessFields({ businessName, slug, slugAvailable });
    return !hasFieldErrors(errors);
  }, [businessName, slug, slugAvailable]);

  const teamValid = useMemo(() => {
    const errors = validateTeamFields(
      teamInvites.map((item) => item.email),
      email,
    );
    return !hasFieldErrors(errors);
  }, [teamInvites, email]);

  const checkSlug = useCallback(async (value: string) => {
    const formatError = validateBusinessSlug(value);
    if (formatError) {
      setSlugAvailable(false);
      setBusinessErrors((prev) => ({ ...prev, slug: formatError }));
      return false;
    }

    const res = await fetch(`/api/setup/domain?slug=${encodeURIComponent(value)}`);
    const data = await res.json();
    setSlugAvailable(data.available ?? false);
    setSlugPreview(data.preview ?? "");
    if (data.slug) setSlug(data.slug);

    if (!data.available) {
      setBusinessErrors((prev) => ({
        ...prev,
        slug: data.error ?? "این آدرس قبلاً رزرو شده یا نامعتبر است.",
      }));
      return false;
    }

    setBusinessErrors((prev) => ({ ...prev, slug: undefined }));
    return true;
  }, []);

  const loadState = useCallback(async () => {
    const res = await fetch("/api/setup/state");
    const data = await res.json();
    if (!data.session) {
      await fetch("/api/setup/session", { method: "POST" });
      setLoading(false);
      return;
    }
    const s = data.session as SetupState;
    const resolvedStep = SETUP_STEPS.some((x) => x.id === s.setupStep) ? s.setupStep : "ACCOUNT";
    setStep(resolvedStep);
    if (s.adminDraft) setEmail(s.adminDraft.email ?? "");
    setBusinessName(s.organization.name ?? "");
    if (s.organization.businessType) setBusinessType(s.organization.businessType);
    if (s.slug) {
      setSlug(s.slug);
      setSlugPreview(`${s.slug}.${getBaseDomain()}`);
      void checkSlug(s.slug);
    }
    if (s.members?.length) {
      const emails = s.members.map((m) => m.email ?? "").filter(Boolean);
      setTeamInvites(teamInvitesFromEmails(emails));
    }
    setLoading(false);
  }, [checkSlug]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const validateAccountStep = (touchAll = false) => {
    const errors = validateAccountFields({ email, password, confirmPassword });
    setAccountErrors(errors);
    if (touchAll) {
      setTouched((prev) => ({
        ...prev,
        email: true,
        password: true,
        confirmPassword: true,
      }));
    }
    return !hasFieldErrors(errors);
  };

  const validateBusinessStep = (touchAll = false) => {
    const errors = validateBusinessFields({ businessName, slug, slugAvailable });
    setBusinessErrors(errors);
    if (touchAll) {
      setTouched((prev) => ({
        ...prev,
        businessName: true,
        slug: true,
      }));
    }
    return !hasFieldErrors(errors);
  };

  const validateTeamStep = (touchAll = false) => {
    const errors = validateTeamFields(
      teamInvites.map((item) => item.email),
      email,
    );
    setTeamErrors(errors);
    if (touchAll) {
      setTouched((prev) => ({
        ...prev,
        ...touchAllTeamFields(teamInvites),
      }));
    }
    return !hasFieldErrors(errors);
  };

  const saveAccount = async () => {
    if (!validateAccountStep(true)) return;

    setBusy(true);
    try {
      const res = await fetch("/api/setup/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAccountErrors({});
      setStep("BUSINESS");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const saveBusiness = async () => {
    if (!validateBusinessStep(true)) return;

    if (slugAvailable !== true) {
      const ok = await checkSlug(slug);
      if (!ok) {
        validateBusinessStep(true);
        return;
      }
    }

    setBusy(true);
    try {
      const res = await fetch("/api/setup/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: businessName.trim(),
          businessType,
          slug: slug.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlugPreview(data.preview);
      setBusinessErrors({});
      setStep("TEAM");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const saveTeam = async (skip = false) => {
    if (!skip && !validateTeamStep(true)) return;

    setBusy(true);
    try {
      if (!skip) {
        const members = teamInvites
          .map((item) => item.email)
          .filter((e) => e.trim())
          .map((e) => ({ fullName: e.split("@")[0] || "عضو", email: e.trim() }));
        const res = await fetch("/api/setup/members", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ members }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        await fetch("/api/setup/members", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ members: [] }),
        });
      }
      setTeamErrors([]);
      setStep("REVIEW");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const provision = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/setup/provision", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("کسب‌وکار شما آماده است!");
      window.location.href = data.dashboardUrl ?? data.loginUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در راه‌اندازی");
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    const idx = stepIndex(step);
    if (idx > 0) setStep(SETUP_STEPS[idx - 1].id);
  };

  const renderFooter = () => {
    if (step === "ACCOUNT") {
      return (
        <SetupPrimaryButton onClick={saveAccount} disabled={busy || !accountValid}>
          {busy ? "در حال ذخیره..." : "ادامه"}
        </SetupPrimaryButton>
      );
    }
    if (step === "BUSINESS") {
      return (
        <SetupPrimaryButton onClick={saveBusiness} disabled={busy || !businessValid}>
          {busy ? "در حال ذخیره..." : "ادامه"}
        </SetupPrimaryButton>
      );
    }
    if (step === "TEAM") {
      return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SetupSecondaryButton
            className="w-full sm:w-auto sm:min-w-[7rem]"
            onClick={() => saveTeam(true)}
            disabled={busy}
          >
            رد کردن
          </SetupSecondaryButton>
          <SetupPrimaryButton
            className="sm:flex-1"
            onClick={() => saveTeam(false)}
            disabled={busy || !teamValid}
          >
            {busy ? "در حال ذخیره..." : "ادامه"}
          </SetupPrimaryButton>
        </div>
      );
    }
    return (
      <SetupPrimaryButton onClick={provision} disabled={busy}>
        {busy ? "در حال راه‌اندازی..." : "شروع کنید"}
      </SetupPrimaryButton>
    );
  };

  const accountEmailError = showError("email", accountErrors.email);
  const accountPasswordError = showError("password", accountErrors.password);
  const accountConfirmError = showError("confirmPassword", accountErrors.confirmPassword);
  const invitedTeamEmails = teamInvites.map((item) => item.email.trim()).filter(Boolean);

  return (
    <SetupShell currentStepId={step} onBack={goBack} loading={loading} footer={renderFooter()}>
      <div className="mx-auto max-w-md space-y-5 sm:space-y-6">
        {step === "ACCOUNT" && (
          <>
            <SetupField label="ایمیل" error={accountEmailError}>
              <Input
                dir="ltr"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) {
                    setAccountErrors((prev) => ({
                      ...prev,
                      email: validateSetupEmail(e.target.value),
                    }));
                  }
                }}
                onBlur={() => {
                  markTouched("email");
                  setAccountErrors((prev) => ({
                    ...prev,
                    email: validateSetupEmail(email),
                  }));
                }}
                aria-invalid={!!accountEmailError}
                className={setupInputClasses(!!accountEmailError)}
                placeholder="you@company.com"
              />
            </SetupField>

            <SetupField label="رمز عبور" error={accountPasswordError}>
              <PasswordStrengthPopover
                password={password}
                open={passwordHintOpen}
                onOpenChange={setPasswordHintOpen}
              >
                <PasswordInput
                  dir="ltr"
                  autoComplete="new-password"
                  data-password-field
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) {
                      setAccountErrors((prev) => ({
                        ...prev,
                        password: validateSetupPassword(e.target.value),
                        confirmPassword: touched.confirmPassword
                          ? validateSetupPasswordConfirm(e.target.value, confirmPassword)
                          : prev.confirmPassword,
                      }));
                    }
                  }}
                  onFocus={() => setPasswordHintOpen(true)}
                  onBlur={() => {
                    markTouched("password");
                    setAccountErrors((prev) => ({
                      ...prev,
                      password: validateSetupPassword(password),
                    }));
                    window.setTimeout(() => setPasswordHintOpen(false), 120);
                  }}
                  aria-invalid={!!accountPasswordError}
                  className={setupInputClasses(!!accountPasswordError)}
                />
              </PasswordStrengthPopover>
            </SetupField>

            <SetupField label="تکرار رمز عبور" error={accountConfirmError}>
              <PasswordInput
                dir="ltr"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (touched.confirmPassword) {
                    setAccountErrors((prev) => ({
                      ...prev,
                      confirmPassword: validateSetupPasswordConfirm(password, e.target.value),
                    }));
                  }
                }}
                onBlur={() => {
                  markTouched("confirmPassword");
                  setAccountErrors((prev) => ({
                    ...prev,
                    confirmPassword: validateSetupPasswordConfirm(password, confirmPassword),
                  }));
                }}
                aria-invalid={!!accountConfirmError}
                className={setupInputClasses(!!accountConfirmError)}
              />
            </SetupField>

            <p className="text-center text-xs leading-relaxed text-slate-500 dark:text-gh-fg-muted">
              اطلاعات شما محرمانه می‌ماند — فقط برای ورود به پنل مدیریت استفاده می‌شود.
            </p>
          </>
        )}

        {step === "BUSINESS" && (
          <>
            <SetupField
              label="نام کسب‌وکار"
              error={touched.businessName ? businessErrors.businessName : undefined}
            >
              <Input
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  if (touched.businessName) {
                    setBusinessErrors((prev) => ({
                      ...prev,
                      businessName: validateBusinessName(e.target.value),
                    }));
                  }
                }}
                onBlur={() => {
                  markTouched("businessName");
                  setBusinessErrors((prev) => ({
                    ...prev,
                    businessName: validateBusinessName(businessName),
                  }));
                }}
                aria-invalid={!!businessErrors.businessName && touched.businessName}
                className={setupInputClasses(!!businessErrors.businessName && touched.businessName)}
                placeholder="مثلاً کارتین"
              />
            </SetupField>

            <SetupField label="نوع فعالیت">
              <select
                className={setupSelectClassName}
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </SetupField>

            <SetupField
              label="آدرس اختصاصی"
              hint={
                !businessErrors.slug && slugAvailable !== true
                  ? "فقط حروف انگلیسی کوچک، عدد و خط تیره — حداقل ۳ کاراکتر"
                  : undefined
              }
              success={slugAvailable === true && !businessErrors.slug ? "این آدرس در دسترس است" : undefined}
              error={touched.slug ? businessErrors.slug : undefined}
            >
              <Input
                dir="ltr"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugAvailable(null);
                  if (touched.slug) {
                    setBusinessErrors((prev) => ({
                      ...prev,
                      slug: validateBusinessSlug(e.target.value),
                    }));
                  }
                }}
                onBlur={async () => {
                  markTouched("slug");
                  const formatError = validateBusinessSlug(slug);
                  if (formatError) {
                    setBusinessErrors((prev) => ({ ...prev, slug: formatError }));
                    setSlugAvailable(null);
                    return;
                  }
                  await checkSlug(slug);
                }}
                aria-invalid={!!businessErrors.slug && touched.slug}
                className={setupInputClasses(!!businessErrors.slug && touched.slug)}
                placeholder="your-name"
              />
              {slugPreview && !businessErrors.slug && (
                <p
                  className="mt-2 rounded-lg bg-primary-50 px-3 py-2 text-center text-sm font-medium text-primary-800 dark:bg-primary-950 dark:text-primary-100"
                  dir="ltr"
                >
                  {slugPreview}
                </p>
              )}
            </SetupField>
          </>
        )}

        {step === "TEAM" && (
          <SetupTeamInviteList
            items={teamInvites}
            onItemsChange={setTeamInvites}
            adminEmail={email}
            errors={teamErrors}
            onErrorsChange={setTeamErrors}
            touched={touched}
            onTouch={markTouched}
          />
        )}

        {step === "REVIEW" && (
          <dl className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-gh-border dark:border-gh-border">
            <div className="flex flex-col gap-1 bg-slate-50/80 px-4 py-4 dark:bg-gh-canvas-inset/50 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gh-fg-muted">
                ایمیل
              </dt>
              <dd dir="ltr" className="text-sm font-semibold text-slate-900 dark:text-gh-fg">
                {email}
              </dd>
            </div>
            <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gh-fg-muted">
                کسب‌وکار
              </dt>
              <dd className="text-sm font-semibold text-slate-900 dark:text-gh-fg">
                {businessName} · {businessType}
              </dd>
            </div>
            <div className="flex flex-col gap-1 bg-slate-50/80 px-4 py-4 dark:bg-gh-canvas-inset/50 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gh-fg-muted">
                آدرس
              </dt>
              <dd dir="ltr" className="text-sm font-semibold text-primary-700 dark:text-primary-400">
                {slugPreview || `${slug}.${getBaseDomain()}`}
              </dd>
            </div>
            {invitedTeamEmails.length > 0 ? (
              <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gh-fg-muted">
                  تیم ({invitedTeamEmails.length})
                </dt>
                <dd className="space-y-1 sm:text-end">
                  {invitedTeamEmails.map((memberEmail, index) => (
                    <p
                      key={`${memberEmail}-${index}`}
                      dir="ltr"
                      className="text-sm font-medium text-slate-900 dark:text-gh-fg"
                    >
                      {memberEmail}
                    </p>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        )}
      </div>
    </SetupShell>
  );
}
