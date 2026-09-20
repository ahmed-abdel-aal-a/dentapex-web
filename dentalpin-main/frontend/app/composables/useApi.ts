import type { ApiResponse, PaginatedResponse } from '~/types'
import { useDemoStore } from '~/stores/useDemoStore'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface UseApiOptions {
  method?: HttpMethod
  body?: object | null
  headers?: Record<string, string>
  skipAuth?: boolean
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
}

function _withQuery(path: string, query?: UseApiOptions['query']): string {
  if (!query) return path
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) qs.set(k, String(v))
  }
  const s = qs.toString()
  if (!s) return path
  return path.includes('?') ? `${path}&${s}` : `${path}?${s}`
}

export function useApi() {
  const config = useRuntimeConfig()
  const auth = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const offlineDb = useOfflineDb()
  const outbox = useOutbox()

  let demoStore: ReturnType<typeof useDemoStore> | null = null
  if (import.meta.client) {
    try {
      demoStore = useDemoStore()
    } catch {
      // Pinia context not yet ready
    }
  }

  // Detect whether running in Web Simulator (Zero-DB Cloudflare Demo Mode)
  const isSimulator = computed(() => {
    if (!import.meta.client) return false
    if (config.public.demoMode) return true
    const host = window.location.hostname
    if (
      host.includes('pages.dev') ||
      host.includes('cloudflare') ||
      host.includes('netlify') ||
      host.includes('vercel') ||
      window.location.search.includes('demo=true') ||
      localStorage.getItem('dentapex_demo_mode') === 'true'
    ) {
      return true
    }
    // If no API URL is set and we're not running local backend
    if (!config.public.apiBaseUrl && window.location.port !== '7070') {
      return true
    }
    return false
  })

  // Mock Request Handler for Web Demo Mode
  async function handleDemoRequest<T>(
    path: string,
    method: HttpMethod = 'GET',
    body?: any,
    query?: Record<string, any>
  ): Promise<T | null> {
    if (!demoStore) return null

    if (!demoStore.initialized) {
      await demoStore.initDemoData()
    }

    const cleanPath = path.split('?')[0]

    // 1. Patients Endpoints
    if (cleanPath.startsWith('/api/v1/patients')) {
      const parts = cleanPath.split('/')
      // Single patient: /api/v1/patients/:id or /api/v1/patients/:id/extended
      if (parts.length >= 5 && parts[4]) {
        const patientId = parts[4]
        if (method === 'GET') {
          const p = demoStore.getPatient(patientId) || demoStore.patients[0]
          if (p) {
            const extended = {
              ...p,
              full_name: p.full_name || `${p.first_name} ${p.last_name}`.trim(),
              active_alerts: p.allergies || [],
              emergency_contact: null,
              legal_guardian: null,
            }
            return { data: extended } as unknown as T
          }
          return { data: null } as unknown as T
        } else if (method === 'PUT' || method === 'PATCH') {
          const updated = await demoStore.updatePatient(patientId, body || {})
          return { data: updated } as unknown as T
        } else if (method === 'DELETE') {
          await demoStore.deletePatient(patientId)
          return { data: { success: true } } as unknown as T
        }
      }

      // Patient list: /api/v1/patients
      if (method === 'GET') {
        let list = [...demoStore.patients]
        const search = (query?.search || query?.q || '') as string
        if (search) {
          const s = search.toLowerCase()
          list = list.filter(p =>
            p.first_name.toLowerCase().includes(s) ||
            p.last_name.toLowerCase().includes(s) ||
            (p.phone && p.phone.includes(s)) ||
            (p.national_id && p.national_id.includes(s))
          )
        }
        return {
          data: list,
          total: list.length,
          page: Number(query?.page) || 1,
          page_size: Number(query?.page_size) || 50,
        } as unknown as T
      } else if (method === 'POST') {
        const created = await demoStore.addPatient(body || {})
        return { data: created } as unknown as T
      }
    }

    // 2. Agenda / Appointments Endpoints
    if (cleanPath.includes('/agenda/appointments') || cleanPath.startsWith('/api/v1/appointments')) {
      const parts = cleanPath.split('/')
      const lastPart = parts[parts.length - 1]
      const hasId = lastPart && lastPart !== 'appointments' && lastPart !== 'agenda'

      if (hasId) {
        if (method === 'GET') {
          const appt = demoStore.getAppointment(lastPart)
          return { data: appt } as unknown as T
        } else if (method === 'PUT' || method === 'PATCH') {
          const updated = await demoStore.updateAppointment(lastPart, body || {})
          return { data: updated } as unknown as T
        } else if (method === 'DELETE') {
          await demoStore.deleteAppointment(lastPart)
          return { data: { success: true } } as unknown as T
        }
      }

      if (method === 'GET') {
        return {
          data: demoStore.appointments,
          total: demoStore.appointments.length,
        } as unknown as T
      } else if (method === 'POST') {
        const created = await demoStore.addAppointment(body || {})
        return { data: created } as unknown as T
      }
    }

    // 3. Odontogram Endpoints
    if (cleanPath.includes('/odontogram')) {
      if (cleanPath.includes('/odontogram')) {
        const m = cleanPath.match(/patients\/([^/]+)\/odontogram/)
        if (m && m[1]) {
          const patientId = m[1]
          const odonto = demoStore.getOdontogramData(patientId)
          return { data: odonto } as unknown as T
        }
      }

      if (cleanPath.includes('/teeth/')) {
        const m = cleanPath.match(/patients\/([^/]+)\/teeth\/([^/]+)/)
        if (m && m[1] && m[2]) {
          const patientId = m[1]
          const toothNumber = m[2]
          await demoStore.updateToothRecord(patientId, toothNumber, body || {})
          return { data: body } as unknown as T
        }
      }

      if (cleanPath.includes('/bulk-teeth')) {
        return { data: body } as unknown as T
      }

      if (cleanPath.includes('/history')) {
        return { data: [], total: 0 } as unknown as T
      }
    }

    // 4. Clinical Settings & Resources
    if (cleanPath.includes('/cabinets')) {
      return { data: demoStore.cabinets } as unknown as T
    }

    if (cleanPath.includes('/professionals')) {
      return { data: demoStore.professionals } as unknown as T
    }

    if (cleanPath.includes('/users')) {
      return { data: [demoStore.currentUser] } as unknown as T
    }

    if (cleanPath.includes('/clinics')) {
      return { data: demoStore.clinic } as unknown as T
    }

    if (cleanPath.includes('/catalog') || cleanPath.includes('/treatments')) {
      return {
        data: demoStore.treatmentsCatalog,
        total: demoStore.treatmentsCatalog.length,
      } as unknown as T
    }

    // 5. Licensing Mock Status (Always valid in demo)
    if (cleanPath.includes('/license/status')) {
      return {
        status: 'licensed',
        clinic_name: demoStore.clinic.name,
        days_left: 365,
        hw_fingerprint: 'DEMO-SIMULATOR-2026',
      } as unknown as T
    }

    if (cleanPath.includes('/license/activate')) {
      return {
        success: true,
        message: 'تم تفعيل الرخصة بنجاح في وضع المحاكاة',
      } as unknown as T
    }

    // 6. Copilot Sessions
    if (cleanPath.includes('/copilot/sessions')) {
      return { data: { id: 'demo-copilot-session-001' } } as unknown as T
    }

    // 7. Payments Filters & Summaries
    if (cleanPath.includes('/payments/summary')) {
      return { data: { summaries: {} } } as unknown as T
    }

    if (cleanPath.includes('/payments/filters')) {
      return { data: { patient_ids: [], truncated: false } } as unknown as T
    }

    // 8. Modules
    if (cleanPath.includes('/modules')) {
      return {
        data: [
          { name: 'patients', installed: true },
          { name: 'agenda', installed: true },
          { name: 'odontogram', installed: true },
          { name: 'copilot', installed: true },
          { name: 'billing', installed: true },
          { name: 'catalog', installed: true },
        ],
      } as unknown as T
    }

    // Generic Fallback for unhandled endpoints in demo mode
    if (method === 'GET') {
      return { data: [] } as unknown as T
    } else {
      return { data: { ...(body || {}), id: crypto.randomUUID ? crypto.randomUUID() : `mock-${Date.now()}` } } as unknown as T
    }
  }

  // Use different API URL for server (Docker internal) vs client (browser)
  const apiBaseUrl = computed(() =>
    import.meta.server ? config.apiBaseUrlServer : config.public.apiBaseUrl
  )

  async function $api<T>(
    path: string,
    options: UseApiOptions = {}
  ): Promise<T> {
    const { skipAuth, method = 'GET', body, headers: optionHeaders, signal, query } = options

    // Check if we should directly serve from the client-side Demo Store
    if (isSimulator.value) {
      const demoResult = await handleDemoRequest<T>(path, method, body, query)
      if (demoResult !== null) {
        return demoResult
      }
    }

    const headers: Record<string, string> = {
      ...(optionHeaders || {})
    }

    // Add auth header if authenticated and not skipping auth
    if (!skipAuth && auth.accessToken.value) {
      headers.Authorization = `Bearer ${auth.accessToken.value}`
    }

    const url = _withQuery(path, query)

    try {
      const result = await $fetch<T>(url, {
        baseURL: apiBaseUrl.value,
        timeout: 10000, // 10 seconds
        method,
        body,
        headers,
        signal
      })

      if (import.meta.client && (!method || method === 'GET')) {
        outbox.isOfflineMode.value = false
        const payloadData = (result as any)?.data
        if (Array.isArray(payloadData)) {
          if (path.includes('/agenda/appointments')) {
            offlineDb.putMany('appointments', payloadData).catch(() => {})
          } else if (path.includes('/patients')) {
            offlineDb.putMany('patients', payloadData).catch(() => {})
          }
        }
      }

      return result
    } catch (error: unknown) {
      const fetchError = error as { name?: string, statusCode?: number, data?: { message?: string } }

      // If network fails (e.g. static Cloudflare Pages build without backend), fallback to Demo Store!
      if (import.meta.client) {
        const demoFallback = await handleDemoRequest<T>(path, method, body, query)
        if (demoFallback !== null) {
          return demoFallback
        }
      }

      // Offline fallback for GET/POST requests when server is unreachable (502 / network timeout)
      const isUnreachable = !fetchError.statusCode || fetchError.statusCode === 502 || fetchError.statusCode === 503 || fetchError.statusCode === 504
      if (import.meta.client && isUnreachable) {
        outbox.isOfflineMode.value = true

        if (!method || method === 'GET') {
          if (path.includes('/agenda/appointments')) {
            const cached = await offlineDb.getAll('appointments')
            if (cached && cached.length > 0) {
              return { data: cached } as unknown as T
            }
          } else if (path.includes('/patients')) {
            const cached = await offlineDb.getAll('patients')
            if (cached && cached.length > 0) {
              return { data: cached } as unknown as T
            }
          }
        } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          if (path.includes('/agenda/appointments') || path.includes('/patients')) {
            const { optimisticEntity } = await outbox.enqueueMutation(path, method, body)
            toast.add({
              title: 'وضع الموبايل الليلي 24/7',
              description: 'تم حفظ العملية في الهاتف وسيتم إرسالها تلقائياً عند فتح كمبيوتر العيادة صباحاً.',
              color: 'warning'
            })
            return { data: optimisticEntity } as unknown as T
          }
        }
      }

      // Caller-initiated cancellation
      if (fetchError.name === 'AbortError' || signal?.aborted) {
        throw error
      }

      // Handle specific error codes
      if (fetchError.statusCode === 401) {
        const refreshed = await auth.refresh()
        if (refreshed) {
          headers.Authorization = `Bearer ${auth.accessToken.value}`
          return await $fetch<T>(url, {
            baseURL: apiBaseUrl.value,
            method,
            body,
            headers
          })
        }
        await auth.logout()
        throw error
      }

      if (fetchError.statusCode === 403) {
        toast.add({
          title: t('common.error'),
          description: t('common.forbidden', 'Acceso denegado'),
          color: 'error'
        })
        throw error
      }

      if (fetchError.statusCode === 404) {
        throw error
      }

      if (fetchError.statusCode === 409) {
        throw error
      }

      if (fetchError.statusCode === 422) {
        throw error
      }

      if (fetchError.statusCode && fetchError.statusCode >= 500) {
        toast.add({
          title: t('common.error'),
          description: t('common.serverError'),
          color: 'error'
        })
        throw error
      }

      // Network error
      if (!fetchError.statusCode) {
        toast.add({
          title: t('common.error'),
          description: t('common.networkError'),
          color: 'error'
        })
      }

      throw error
    }
  }

  // Convenience methods
  async function get<T>(path: string, options: Omit<UseApiOptions, 'method' | 'body'> = {}): Promise<T> {
    return $api<T>(path, { ...options, method: 'GET' })
  }

  async function post<T>(path: string, body?: object | null, options: Omit<UseApiOptions, 'method' | 'body'> = {}): Promise<T> {
    return $api<T>(path, { ...options, method: 'POST', body })
  }

  async function put<T>(path: string, body?: object | null, options: Omit<UseApiOptions, 'method' | 'body'> = {}): Promise<T> {
    return $api<T>(path, { ...options, method: 'PUT', body })
  }

  async function patch<T>(path: string, body?: object | null, options: Omit<UseApiOptions, 'method' | 'body'> = {}): Promise<T> {
    return $api<T>(path, { ...options, method: 'PATCH', body })
  }

  async function del<T>(path: string, options: Omit<UseApiOptions, 'method' | 'body'> = {}): Promise<T> {
    return $api<T>(path, { ...options, method: 'DELETE' })
  }

  return {
    $api,
    get,
    post,
    put,
    patch,
    del
  }
}

export type { ApiResponse, PaginatedResponse }
