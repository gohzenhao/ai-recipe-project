import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '@/lib/api-client'
import { signup } from '@/lib/auth'

type FieldErrors = {
  email?: string
  password?: string
  display_name?: string
  general?: string
}

type DetailEntry = { loc?: unknown; msg?: unknown }

function fieldErrorsFromApiError(err: ApiError): FieldErrors {
  const body = err.body as { detail?: unknown } | null
  const detail = body?.detail
  if (!Array.isArray(detail)) {
    return { general: 'Something went wrong. Please try again.' }
  }
  const errors: FieldErrors = {}
  for (const entry of detail as DetailEntry[]) {
    const loc = Array.isArray(entry.loc) ? entry.loc : []
    const msg = typeof entry.msg === 'string' ? entry.msg : 'Invalid value'
    const field = loc[loc.length - 1]
    if (field === 'email' && !errors.email) {
      errors.email = msg
    } else if (field === 'password' && !errors.password) {
      errors.password = msg
    } else if (field === 'display_name' && !errors.display_name) {
      errors.display_name = msg
    } else if (!errors.general) {
      errors.general = msg
    }
  }
  return errors
}

export function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      await signup({ email, password, display_name: displayName })
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setErrors(fieldErrorsFromApiError(err))
      } else {
        setErrors({ general: 'Something went wrong. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-3xl font-semibold">Create an account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-72">
        <label className="flex flex-col gap-1">
          <span className="text-sm">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="px-3 py-2 rounded-md border border-input bg-background"
          />
          {errors.email && (
            <span role="alert" className="text-xs text-destructive">
              {errors.email}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            className="px-3 py-2 rounded-md border border-input bg-background"
          />
          {errors.password && (
            <span role="alert" className="text-xs text-destructive">
              {errors.password}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Display name</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="nickname"
            required
            className="px-3 py-2 rounded-md border border-input bg-background"
          />
          {errors.display_name && (
            <span role="alert" className="text-xs text-destructive">
              {errors.display_name}
            </span>
          )}
        </label>
        {errors.general && (
          <p role="alert" className="text-sm text-destructive">
            {errors.general}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{' '}
          <Link to="/login" className="underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  )
}
