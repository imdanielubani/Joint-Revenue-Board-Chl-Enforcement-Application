import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { isApiError } from '@/shared/api/api-error'
import { useToast } from '@/shared/ui/toast/toast-context'
import { AUTH_ERROR_CODES, signInSchema } from '../auth.schemas'
import { AuthHelp } from '../components/AuthHelp'
import { AuthLayout } from '../components/AuthLayout'
import styles from '../components/form.module.css'
import { useSession } from '../session-context'

type FieldErrors = Partial<Record<'email' | 'password', string>>

/** The sign-in notifications, keyed so a new attempt can clear the last one's. */
const SIGN_IN_TOASTS = {
  error: 'sign-in-error',
  deactivated: AUTH_ERROR_CODES.accountDeactivated,
  expired: 'session-expired',
} as const

const SIGNED_IN_TOAST = 'signed-in'
/** The "Logged out successfully" notification (use-sign-out), cleared once signed back in. */
const SIGNED_OUT_TOAST = 'signed-out'

export function SignInPage() {
  const { signIn, endReason, clearEndReason } = useSession()
  const { showToast, dismissToast } = useToast()
  const id = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // A session that ran out (24 hours, a renewal the backend refused, or inactivity) is
  // announced once, with the design's "Session expired" notification; signing out yourself is not.
  useEffect(() => {
    if (endReason !== 'expired' && endReason !== 'inactive') return
    showToast({
      key: SIGN_IN_TOASTS.expired,
      variant: 'warning',
      title: 'Session expired',
      lines: [
        endReason === 'inactive'
          ? 'You were signed out after a period of inactivity. Please sign in again to continue.'
          : 'Your session has ended. Please sign in again to continue.',
      ],
      // Already on the sign-in page: put the cursor where the user should type next.
      // Not a link, so the page they were on is kept for after they sign in.
      action: {
        label: 'Sign in again',
        onSelect: () => (emailRef.current?.value ? passwordRef.current : emailRef.current)?.focus(),
      },
    })
    clearEndReason()
  }, [endReason, clearEndReason, showToast])

  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const parsed = signInSchema.safeParse({
      email: data.get('email'),
      password: data.get('password'),
    })
    if (!parsed.success) {
      const errors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors
        errors[field] ??= issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    // A new attempt replaces any notification left from the last one.
    dismissToast(...Object.values(SIGN_IN_TOASTS))
    setSubmitting(true)
    try {
      // Once signed in, <RedirectIfSignedIn> moves on to the right page; the design's
      // "Login successful" notification comes along and shows over the dashboard.
      await signIn({ ...parsed.data, remember: data.get('remember') === 'on' })
      dismissToast(SIGNED_OUT_TOAST)
      showToast({
        key: SIGNED_IN_TOAST,
        title: 'Login successful',
        lines: ['Welcome back. Your monitoring workspace is ready.'],
      })
    } catch (error) {
      setSubmitting(false)
      const clearPassword = () => {
        const password = form.elements.namedItem('password')
        if (password instanceof HTMLInputElement) password.value = ''
      }

      if (isApiError(error) && error.code === AUTH_ERROR_CODES.accountDeactivated) {
        // The design shows this with a way to CHL support, and the password cleared;
        // the email stays so the user can see which account it was.
        clearPassword()
        showToast({
          key: SIGN_IN_TOASTS.deactivated,
          variant: 'error',
          icon: 'account',
          title: 'Account deactivated',
          lines: [
            'Your account is deactivated. Your CHL administrator can help you restore access.',
          ],
          action: { label: 'Contact CHL support', to: paths.support },
        })
        return
      }

      // Wrong details get the design's wording and a cleared password. Any other failure
      // (no connection, too many attempts, a server fault) says what actually happened,
      // and keeps the password, since the details may well be right.
      const wrongDetails = isApiError(error) && error.code === AUTH_ERROR_CODES.invalidCredentials
      if (wrongDetails) clearPassword()
      showToast({
        key: SIGN_IN_TOASTS.error,
        variant: 'error',
        title: 'Sign-in error',
        lines: [
          isApiError(error) && !wrongDetails
            ? error.message
            : 'We couldn’t sign you in. Check your details and try again.',
        ],
        action: { label: 'Get sign-in help', to: paths.forgotPassword },
      })
    }
  }

  return (
    <AuthLayout
      eyebrow="Secure access"
      title="Welcome back"
      description="Sign in with your existing CHL credentials to continue."
      raised
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${id}-email`}>
            Email Address
          </label>
          <input
            ref={emailRef}
            id={`${id}-email`}
            className={styles.input}
            name="email"
            type="email"
            autoComplete="username"
            placeholder="Enter Your Email Address"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? `${id}-email-error` : undefined}
            required
          />
          {fieldErrors.email && (
            <span id={`${id}-email-error`} className={styles.fieldError}>
              {fieldErrors.email}
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${id}-password`}>
            Password
          </label>
          <div className={styles.passwordRow}>
            <input
              ref={passwordRef}
              id={`${id}-password`}
              className={styles.input}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter Your Password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? `${id}-password-error` : undefined}
              required
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-controls={`${id}-password`}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {fieldErrors.password && (
            <span id={`${id}-password-error`} className={styles.fieldError}>
              {fieldErrors.password}
            </span>
          )}
        </div>

        <div className={styles.options}>
          <label className={styles.checkboxLabel}>
            <input className={styles.checkbox} type="checkbox" name="remember" />
            Keep me signed in
          </label>
          <Link className={styles.textLink} to={paths.forgotPassword}>
            Forgotten Password?
          </Link>
        </div>

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Signing In…' : 'Sign In'}
        </button>
      </form>

      <AuthHelp helpTo={paths.forgotPassword} />
    </AuthLayout>
  )
}
