import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface DemoPatient {
  id: string
  clinic_id?: string
  first_name: string
  last_name: string
  full_name?: string
  national_id?: string
  national_id_type?: string
  birth_date?: string
  date_of_birth?: string
  gender?: string
  phone?: string
  email?: string
  address?: Record<string, any>
  medical_notes?: string
  notes?: string
  allergies?: string[]
  diseases?: string[]
  status?: 'active' | 'archived'
  do_not_contact?: boolean
  has_complete_billing_info?: boolean
  created_at: string
  updated_at?: string
}

export interface DemoAppointment {
  id: string
  clinic_id?: string
  branch_id?: string
  patient_id: string
  patient_name: string
  professional_id?: string
  professional_name: string
  cabinet: string
  cabinet_id?: string
  cabinet_name?: string
  start_time: string
  end_time: string
  status: string
  current_status_since?: string
  treatment_name: string
  treatment_type?: string
  color: string
  created_at?: string
  updated_at?: string
}

export interface DemoToothRecord {
  id?: string
  patient_id?: string
  tooth_number?: number | string
  tooth_type?: 'permanent' | 'deciduous'
  general_condition?: string
  state?: string
  material?: string
  surfaces?: any
  notes?: string
  shade?: string
  system?: string
  is_displaced?: boolean
  is_rotated?: boolean
  created_at?: string
  updated_at?: string
}

export const useDemoStore = defineStore('dentapex-demo', () => {
  // --- Reactive State (Single Source of Truth) ---
  const isDemoMode = ref(true)
  const initialized = ref(false)
  const loading = ref(false)
  const isIncognitoMode = ref(false)

  const clinic = ref({
    id: 'demo-clinic-00000000-0000-0000-0000-000000000001',
    name: 'عيادة دنت أپكس الاستعراضية النموذجية',
    phone: '+201000000000',
    email: 'demo@dentapex.clinic',
    address: { city: 'القاهرة', street: 'شارع التحرير، وسط البلد' },
    currency: 'EGP',
    timezone: 'Africa/Cairo',
    tax_id: 'EG-998877665',
    legal_name: 'عيادة دنت أپكس لطب وجراحة الأسنان',
    settings: { slot_duration_min: 15 },
  })

  const currentUser = ref({
    id: 'demo-user-00000000-0000-0000-0000-000000000001',
    first_name: 'د. أحمد',
    last_name: 'إبراهيم',
    email: 'ahmed@dentapex.clinic',
    role: 'admin',
    is_professional: true,
  })

  const cabinets = ref([
    { id: 'cab-1', name: 'العيادة 1 (الكرسي الرئيسي)', is_active: true, display_order: 1 },
    { id: 'cab-2', name: 'العيادة 2 (كرسي علاج الجذور)', is_active: true, display_order: 2 },
    { id: 'cab-3', name: 'العيادة 3 (كرسي الجراحة والزراعة)', is_active: true, display_order: 3 },
  ])

  const professionals = ref([
    {
      id: 'demo-user-00000000-0000-0000-0000-000000000001',
      professional_name: 'د. أحمد إبراهيم',
      first_name: 'د. أحمد',
      last_name: 'إبراهيم',
      email: 'ahmed@dentapex.clinic',
      role: 'admin',
      is_active: true,
      color: '#0ea5e9',
    },
    {
      id: 'demo-user-00000000-0000-0000-0000-000000000002',
      professional_name: 'د. ريم مصطفى',
      first_name: 'د. ريم',
      last_name: 'مصطفى',
      email: 'reem@dentapex.clinic',
      role: 'dentist',
      is_active: true,
      color: '#10b981',
    },
  ])

  const treatmentsCatalog = ref([
    { id: 't-1', code: 'CHK-01', name: 'كشف واستشارة وتشخيص شامل', category: 'diagnostico', price: 300, currency: 'EGP' },
    { id: 't-2', code: 'RES-01', name: 'حشو كمبوزيت تجميلي سطح واحد', category: 'restauradora', price: 650, currency: 'EGP' },
    { id: 't-3', code: 'RES-02', name: 'حشو كمbوزيت تجميلي سطحين أو أكثر (MOD)', category: 'restauradora', price: 950, currency: 'EGP' },
    { id: 't-4', code: 'ENDO-01', name: 'علاج جذور وعصب ضرس خلفي (Molar Endo)', category: 'endodoncia', price: 2200, currency: 'EGP' },
    { id: 't-5', code: 'CRW-01', name: 'تاج زيركون تجميلي كامل (Zirconia Crown)', category: 'restauradora', price: 3500, currency: 'EGP' },
    { id: 't-6', code: 'IMP-01', name: 'زرعة أسنان تيتانيوم سويسرية مدمجة بالعظم', category: 'cirugia', price: 9500, currency: 'EGP' },
    { id: 't-7', code: 'HYG-01', name: 'جلسة تنظيف وتلميع أسنان وإزالة ترسبات جيرية', category: 'diagnostico', price: 500, currency: 'EGP' },
    { id: 't-8', code: 'EXT-01', name: 'خلع ضرس عقل جراحي مطمور (Surgical Extraction)', category: 'cirugia', price: 1800, currency: 'EGP' },
    { id: 't-9', code: 'VEN-01', name: 'عدسة فينير إيماكس تجميلية (E-Max Veneer)', category: 'restauradora', price: 4200, currency: 'EGP' },
    { id: 't-10', code: 'WHT-01', name: 'جلسة تبييض أسنان احترافي بالعيادة (In-Office Whitening)', category: 'restauradora', price: 3000, currency: 'EGP' },
  ])

  const patients = ref<DemoPatient[]>([])
  const appointments = ref<DemoAppointment[]>([])
  const odontograms = ref<Record<string, Record<string, DemoToothRecord>>>({})

  // --- IndexedDB Helper with Incognito Fallback ---
  const IDB_NAME = 'DentApex_Demo_Sandbox_v2'
  const IDB_VERSION = 1

  async function getIDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      isIncognitoMode.value = true
      return null
    }

    try {
      return await new Promise((resolve) => {
        const req = window.indexedDB.open(IDB_NAME, IDB_VERSION)
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result
          if (!db.objectStoreNames.contains('patients')) db.createObjectStore('patients', { keyPath: 'id' })
          if (!db.objectStoreNames.contains('appointments')) db.createObjectStore('appointments', { keyPath: 'id' })
          if (!db.objectStoreNames.contains('odontograms')) db.createObjectStore('odontograms', { keyPath: 'patient_id' })
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => {
          isIncognitoMode.value = true
          resolve(null)
        }
      })
    } catch {
      isIncognitoMode.value = true
      return null
    }
  }

  // --- Helpers for Normalizing Seed Records ---
  function normalizePatient(p: any): DemoPatient {
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim()
    return {
      id: p.id || crypto.randomUUID(),
      clinic_id: clinic.value.id,
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      full_name: fullName,
      national_id: p.national_id || '',
      national_id_type: 'dni',
      birth_date: p.birth_date || p.date_of_birth || '1995-01-01',
      date_of_birth: p.date_of_birth || p.birth_date || '1995-01-01',
      gender: p.gender || 'male',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || { city: 'القاهرة', street: '' },
      medical_notes: p.medical_notes || p.notes || '',
      notes: p.notes || p.medical_notes || '',
      allergies: Array.isArray(p.allergies) ? p.allergies : [],
      diseases: Array.isArray(p.diseases) ? p.diseases : [],
      status: p.status || 'active',
      do_not_contact: Boolean(p.do_not_contact),
      has_complete_billing_info: true,
      created_at: p.created_at || new Date().toISOString(),
      updated_at: p.updated_at || new Date().toISOString(),
    }
  }

  function normalizeAppointment(a: any, index: number): DemoAppointment {
    // Dynamically adjust seed appointment timestamps around today
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // Distribution across today, tomorrow, and yesterday
    let targetDate = new Date(now)
    if (index % 3 === 1) targetDate.setDate(now.getDate() + 1) // Tomorrow
    else if (index % 3 === 2) targetDate.setDate(now.getDate() - 1) // Yesterday

    const targetDateStr = targetDate.toISOString().split('T')[0]

    // Extract hours/minutes from seed or generate sensible slot
    let timeSlot = '09:00:00'
    let durationMinutes = 45
    if (a.start_time && a.start_time.includes('T')) {
      const parts = a.start_time.split('T')[1].split(':')
      timeSlot = `${parts[0] || '10'}:${parts[1] || '00'}:00`
    } else {
      const hour = 9 + (index % 8)
      timeSlot = `${String(hour).padStart(2, '0')}:00:00`
    }

    const startIso = `${targetDateStr}T${timeSlot}Z`
    const endDate = new Date(new Date(startIso).getTime() + durationMinutes * 60000)
    const endIso = endDate.toISOString()

    return {
      id: a.id || crypto.randomUUID(),
      clinic_id: clinic.value.id,
      branch_id: 'demo-branch-01',
      patient_id: a.patient_id || '',
      patient_name: a.patient_name || 'مريض تجريبي',
      professional_id: currentUser.value.id,
      professional_name: a.professional_name || currentUser.value.first_name,
      cabinet: a.cabinet_name || a.cabinet || 'العيادة 1 (الكرسي الرئيسي)',
      cabinet_name: a.cabinet_name || a.cabinet || 'العيادة 1 (الكرسي الرئيسي)',
      cabinet_id: a.cabinet_id || 'cab-1',
      start_time: startIso,
      end_time: endIso,
      status: a.status || 'scheduled',
      current_status_since: startIso,
      treatment_name: a.treatment_name || a.treatment_type || 'كشف واستشارة',
      treatment_type: a.treatment_type || a.treatment_name || 'كشف واستشارة',
      color: a.color || '#3b82f6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  // --- Dynamic Lazy-Loading Initializer ---
  async function initDemoData(forceReset = false) {
    if (initialized.value && !forceReset) return
    loading.value = true

    try {
      const db = await getIDB()

      if (db && !forceReset) {
        // Try reading from IndexedDB
        const storedPatients: DemoPatient[] = await new Promise((resolve) => {
          const tx = db.transaction('patients', 'readonly')
          const req = tx.objectStore('patients').getAll()
          req.onsuccess = () => resolve(req.result || [])
          req.onerror = () => resolve([])
        })

        if (storedPatients.length > 0) {
          patients.value = storedPatients.map(normalizePatient)

          const storedAppts: DemoAppointment[] = await new Promise((resolve) => {
            const tx = db.transaction('appointments', 'readonly')
            const req = tx.objectStore('appointments').getAll()
            req.onsuccess = () => resolve(req.result || [])
            req.onerror = () => resolve([])
          })
          appointments.value = storedAppts

          const storedOdonto: any[] = await new Promise((resolve) => {
            const tx = db.transaction('odontograms', 'readonly')
            const req = tx.objectStore('odontograms').getAll()
            req.onsuccess = () => resolve(req.result || [])
            req.onerror = () => resolve([])
          })

          const mapped: Record<string, Record<string, DemoToothRecord>> = {}
          for (const item of storedOdonto) {
            if (item.patient_id && item.teeth) {
              mapped[item.patient_id] = item.teeth
            }
          }
          odontograms.value = mapped

          initialized.value = true
          loading.value = false
          return
        }
      }

      // Dynamic Lazy-Loading (Never imported in initial bundle)
      const [patientsModule, odontogramModule, agendaModule] = await Promise.all([
        import('../demo/demo_patients_seed.json'),
        import('../demo/demo_odontogram_seed.json'),
        import('../demo/demo_agenda_seed.json'),
      ])

      const rawPatients = patientsModule.default || patientsModule
      const rawAgenda = agendaModule.default || agendaModule
      const rawOdonto = odontogramModule.default || odontogramModule

      patients.value = (rawPatients as any[]).map(normalizePatient)
      appointments.value = (rawAgenda as any[]).map((a, idx) => normalizeAppointment(a, idx))

      if (rawOdonto && (rawOdonto as any).patients_odontogram) {
        const mapped: Record<string, Record<string, DemoToothRecord>> = {}
        for (const [pid, data] of Object.entries<any>((rawOdonto as any).patients_odontogram)) {
          mapped[pid] = data.teeth || {}
        }
        odontograms.value = mapped
      }

      // Background Async Persist to IndexedDB (if not Incognito)
      if (db) {
        try {
          const tx = db.transaction(['patients', 'appointments', 'odontograms'], 'readwrite')
          const pStore = tx.objectStore('patients')
          const aStore = tx.objectStore('appointments')
          const oStore = tx.objectStore('odontograms')

          pStore.clear()
          aStore.clear()
          oStore.clear()

          for (const p of patients.value) pStore.put(p)
          for (const a of appointments.value) aStore.put(a)
          for (const [pid, teeth] of Object.entries(odontograms.value)) {
            oStore.put({ patient_id: pid, teeth })
          }
        } catch {
          isIncognitoMode.value = true
        }
      }

      initialized.value = true
    } catch (err) {
      console.warn('Demo initialization fallback to in-memory:', err)
      isIncognitoMode.value = true
    } finally {
      loading.value = false
    }
  }

  // --- Reactive Actions (Instant UI Updates + Background Sync) ---

  function getPatient(id: string): DemoPatient | undefined {
    return patients.value.find(p => p.id === id)
  }

  async function addPatient(patientData: Partial<DemoPatient>): Promise<DemoPatient> {
    const newPatient = normalizePatient({
      ...patientData,
      id: crypto.randomUUID ? crypto.randomUUID() : `patient-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Instant Reactivity (Single Source of Truth)
    patients.value.unshift(newPatient)

    // Background Async Sync
    const db = await getIDB()
    if (db) {
      try {
        const tx = db.transaction('patients', 'readwrite')
        tx.objectStore('patients').put(newPatient)
      } catch {
        isIncognitoMode.value = true
      }
    }

    return newPatient
  }

  async function updatePatient(id: string, updates: Partial<DemoPatient>): Promise<DemoPatient | null> {
    const idx = patients.value.findIndex(p => p.id === id)
    if (idx === -1) return null

    const updated = normalizePatient({
      ...patients.value[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    })

    patients.value[idx] = updated

    const db = await getIDB()
    if (db) {
      try {
        const tx = db.transaction('patients', 'readwrite')
        tx.objectStore('patients').put(updated)
      } catch {
        isIncognitoMode.value = true
      }
    }

    return updated
  }

  async function deletePatient(id: string): Promise<boolean> {
    const idx = patients.value.findIndex(p => p.id === id)
    if (idx === -1) return false

    patients.value.splice(idx, 1)

    const db = await getIDB()
    if (db) {
      try {
        const tx = db.transaction('patients', 'readwrite')
        tx.objectStore('patients').delete(id)
      } catch {
        isIncognitoMode.value = true
      }
    }

    return true
  }

  function getAppointment(id: string): DemoAppointment | undefined {
    return appointments.value.find(a => a.id === id)
  }

  async function addAppointment(apptData: Partial<DemoAppointment>): Promise<DemoAppointment> {
    const newAppt = normalizeAppointment({
      ...apptData,
      id: crypto.randomUUID ? crypto.randomUUID() : `appt-${Date.now()}`,
      created_at: new Date().toISOString(),
    }, appointments.value.length)

    // Instant Reactivity
    appointments.value.push(newAppt)

    // Background Async Sync
    const db = await getIDB()
    if (db) {
      try {
        const tx = db.transaction('appointments', 'readwrite')
        tx.objectStore('appointments').put(newAppt)
      } catch {
        isIncognitoMode.value = true
      }
    }

    return newAppt
  }

  async function updateAppointment(id: string, updates: Partial<DemoAppointment>): Promise<DemoAppointment | null> {
    const idx = appointments.value.findIndex(a => a.id === id)
    if (idx === -1) return null

    const updated: DemoAppointment = {
      ...appointments.value[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    }

    appointments.value[idx] = updated

    const db = await getIDB()
    if (db) {
      try {
        const tx = db.transaction('appointments', 'readwrite')
        tx.objectStore('appointments').put(updated)
      } catch {
        isIncognitoMode.value = true
      }
    }

    return updated
  }

  async function deleteAppointment(id: string): Promise<boolean> {
    const idx = appointments.value.findIndex(a => a.id === id)
    if (idx === -1) return false

    appointments.value.splice(idx, 1)

    const db = await getIDB()
    if (db) {
      try {
        const tx = db.transaction('appointments', 'readwrite')
        tx.objectStore('appointments').delete(id)
      } catch {
        isIncognitoMode.value = true
      }
    }

    return true
  }

  // --- Odontogram Mapping & Actions ---
  function getOdontogramData(patientId: string) {
    const rawTeeth = odontograms.value[patientId] || {}
    const teethArray: any[] = []

    // Helper condition mapping from demo state
    const conditionMap: Record<string, string> = {
      sound: 'healthy',
      healthy: 'healthy',
      cavity: 'caries',
      caries: 'caries',
      filled: 'filling',
      filling: 'filling',
      endo: 'root_canal',
      root_canal: 'root_canal',
      crown: 'crown',
      implant: 'implant',
      extracted: 'missing',
      missing: 'missing',
      veneer: 'crown',
      pulpotomy: 'root_canal',
      space_maintainer: 'filling',
    }

    // List of standard permanent teeth (11-48)
    const permanentNumbers = [
      18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
      48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
    ]

    for (const num of permanentNumbers) {
      const tKey = String(num)
      const record = rawTeeth[tKey]
      const genCondition = record ? (conditionMap[record.state || ''] || 'healthy') : 'healthy'

      const surfacesObj = {
        M: 'healthy',
        D: 'healthy',
        O: 'healthy',
        V: 'healthy',
        L: 'healthy',
      }

      if (record && record.surfaces && Array.isArray(record.surfaces)) {
        for (const s of record.surfaces) {
          if (s in surfacesObj) {
            (surfacesObj as any)[s] = genCondition
          }
        }
      }

      teethArray.push({
        id: `tooth-${patientId}-${num}`,
        patient_id: patientId,
        tooth_number: num,
        tooth_type: 'permanent',
        general_condition: genCondition,
        surfaces: surfacesObj,
        notes: record?.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    return {
      patient_id: patientId,
      teeth: teethArray,
      condition_colors: {
        healthy: '#22c55e',
        caries: '#ef4444',
        filling: '#3b82f6',
        crown: '#f59e0b',
        missing: '#9ca3af',
        root_canal: '#8b5cf6',
        implant: '#06b6d4',
        extraction_indicated: '#dc2626',
        sealant: '#10b981',
        fracture: '#f97316',
      },
      available_conditions: [
        'healthy',
        'caries',
        'filling',
        'crown',
        'missing',
        'root_canal',
        'implant',
        'extraction_indicated',
        'sealant',
        'fracture',
      ],
      surfaces: ['M', 'D', 'O', 'V', 'L'],
    }
  }

  async function updateToothRecord(patientId: string, toothNumber: string | number, record: DemoToothRecord) {
    const tNum = String(toothNumber)
    if (!odontograms.value[patientId]) {
      odontograms.value[patientId] = {}
    }

    // Instant Reactivity
    odontograms.value[patientId][tNum] = {
      ...odontograms.value[patientId][tNum],
      ...record,
      state: record.general_condition || record.state || 'healthy',
    }

    // Background Async Sync
    const db = await getIDB()
    if (db) {
      try {
        const tx = db.transaction('odontograms', 'readwrite')
        tx.objectStore('odontograms').put({
          patient_id: patientId,
          teeth: odontograms.value[patientId],
        })
      } catch {
        isIncognitoMode.value = true
      }
    }
  }

  async function resetDemoData() {
    await initDemoData(true)
  }

  return {
    isDemoMode,
    initialized,
    loading,
    isIncognitoMode,
    clinic,
    currentUser,
    cabinets,
    professionals,
    treatmentsCatalog,
    patients,
    appointments,
    odontograms,
    initDemoData,
    getPatient,
    addPatient,
    updatePatient,
    deletePatient,
    getAppointment,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    getOdontogramData,
    updateToothRecord,
    resetDemoData,
  }
})
