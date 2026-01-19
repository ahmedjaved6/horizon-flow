import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import Layout from './components/Layout';
// Hero component removed from flow for unified intro
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import CreateClinic from './components/CreateClinic';
import AssistantDashboard from './components/AssistantDashboard';
import AssignmentPending from './components/AssignmentPending';
import DoctorWelcome from './components/DoctorWelcome';

// Core Identity Types
export interface UserIdentity {
  id: string;
  role: 'ADMIN' | 'DOCTOR' | 'ASSISTANT';
  full_name: string;
  clinic_id: string | null;
  availability_status?: 'READY' | 'ON_BREAK';
}

export interface ClinicIdentity {
  id: string;
  name: string;
}

export interface AppIdentity {
  user: UserIdentity;
  clinic: ClinicIdentity | null;
}

export interface Patient {
  id: string;
  name: string;
  status: 'IN_TREATMENT' | 'IN_QUEUE' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  phone?: string;
  treatment?: string;
  visitCount?: number;
  lastVisitAt?: string | null;
  lastVisitTreatment?: string | null;
  isReturning?: boolean;
  clinic_id: string;
}

export interface Appointment {
  id: string;
  patient_name: string;
  patient_phone: string;
  treatment: string | null;
  appointment_time: string;
  status: 'BOOKED' | 'CANCELLED';
  clinic_id: string;
}

type HydrationState = 'BOOTING' | 'UNAUTHENTICATED' | 'AUTHENTICATED';

const App: React.FC = () => {
  // 1. Explicit Hydration State
  const [hydrationState, setHydrationState] = useState<HydrationState>('BOOTING');
  
  // 2. Data Context - Single Source of Truth
  const [session, setSession] = useState<Session | null>(null);
  const [identity, setIdentity] = useState<AppIdentity | null>(null);
  
  // 3. Operational State (Lifted from Dashboards)
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [doctorStatus, setDoctorStatus] = useState<'READY' | 'ON_BREAK'>('READY'); // Default safe
  const [queue, setQueue] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // 4. View State (default to login for unified flow)
  const [authView, setAuthView] = useState<'landing' | 'login'>('login');
  
  // 5. Welcome Screen State
  const [doctorWelcomeSeen, setDoctorWelcomeSeen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
       if (event === 'SIGNED_OUT') {
         setSession(null);
         setIdentity(null);
         setHydrationState('UNAUTHENTICATED');
         setAuthView('login');
         setQueue([]);
         setAppointments([]);
         setActiveDoctorId(null);
         setDoctorWelcomeSeen(false);
       }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Core Hydration Logic
  const executeHydration = useCallback(async () => {
    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !currentSession) {
        setSession(null);
        setIdentity(null);
        setHydrationState('UNAUTHENTICATED');
        return;
      }

      // Fetch User Profile
      const { data: profile, error: profileError } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();

      if (profileError || !profile) {
        console.error("Profile fetch error:", profileError);
        setSession(null);
        setIdentity(null);
        setHydrationState('UNAUTHENTICATED');
        return;
      }

      const user: UserIdentity = profile as UserIdentity;
      let clinic: ClinicIdentity | null = null;

      // Fetch Clinic (if applicable)
      if (user.role !== 'ADMIN' && user.clinic_id) {
         const { data: clinicData } = await supabase
           .from('clinics')
           .select('id, name')
           .eq('id', user.clinic_id)
           .single();
         
         if (clinicData) {
            clinic = clinicData;
         }
      }

      // Construct final identity
      const finalIdentity: AppIdentity = {
        user,
        clinic
      };

      // Set Global Identity Context
      setSession(currentSession);
      setIdentity(finalIdentity);
      setHydrationState('AUTHENTICATED');

    } catch (err) {
      console.error("Hydration execution error:", err);
      setHydrationState('UNAUTHENTICATED');
    }
  }, []);

  useEffect(() => {
    executeHydration();
  }, [executeHydration]);

  // ---------------------------------------------------------------------------
  // CENTRALIZED DATA & REALTIME LOGIC
  // ---------------------------------------------------------------------------
  
  // Helper: Promote appointments (moved from dashboards)
  const promoteTodayAppointments = useCallback(async (clinicId: string) => {
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('status', 'BOOKED')
        .gte('appointment_time', `${todayStr}T00:00:00`);

      if (!appts || appts.length === 0) return;

      const { error: insertError } = await supabase
        .from('patients')
        .insert(appts.map(a => ({
          clinic_id: clinicId,
          name: a.patient_name,
          phone: a.patient_phone,
          treatment: a.treatment,
          status: 'IN_QUEUE'
        })));
      
      if (insertError) throw insertError;

      const ids = appts.map(a => a.id);
      await supabase
        .from('appointments')
        .update({ status: 'CANCELLED' })
        .in('id', ids);
    } catch (e) {
      console.log('Promotion skipped', e);
    }
  }, []);

  // Main Data Fetcher
  const refreshWorkspace = useCallback(async (clinicId: string, docId: string | null) => {
    // 1. Fetch Queue with Enrichment
    const { data: rawQueue } = await supabase
      .from('patients')
      .select('id, name, status, created_at, phone, treatment')
      .eq('clinic_id', clinicId)
      .in('status', ['IN_TREATMENT', 'IN_QUEUE'])
      .order('created_at', { ascending: true });
    
    if (rawQueue) {
        // Enrich
        const enrichedQueue = await Promise.all(rawQueue.map(async (p: any) => {
            if (!p.phone) return { ...p, visitCount: 0, lastVisitAt: null, isReturning: false, clinic_id: clinicId };
            try {
                const [countRes, lastRes] = await Promise.all([
                    supabase.from('patient_visits').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('patient_phone', p.phone),
                    supabase.from('patient_visits').select('visit_date, treatment').eq('clinic_id', clinicId).eq('patient_phone', p.phone).order('visit_date', { ascending: false }).limit(1).maybeSingle()
                ]);
                return {
                    ...p,
                    visitCount: countRes.count || 0,
                    lastVisitAt: lastRes.data?.visit_date || null,
                    lastVisitTreatment: lastRes.data?.treatment || null,
                    isReturning: (countRes.count || 0) > 0,
                    clinic_id: clinicId
                };
            } catch {
                return { ...p, visitCount: 0, lastVisitAt: null, isReturning: false, clinic_id: clinicId };
            }
        }));
        
        const sorted = enrichedQueue.sort((a, b) => {
            if (a.status === 'IN_TREATMENT' && b.status !== 'IN_TREATMENT') return -1;
            if (a.status !== 'IN_TREATMENT' && b.status === 'IN_TREATMENT') return 1;
            return 0;
        });
        setQueue(sorted as Patient[]);
    }

    // 2. Fetch Appointments
    const todayStr = new Date().toLocaleDateString('en-CA');
    const { data: aData } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'BOOKED')
      .gte('appointment_time', `${todayStr}T00:00:00`)
      .order('appointment_time', { ascending: true });
    
    if (aData) setAppointments(aData as Appointment[]);

    // 3. Fetch Doctor Status
    if (docId) {
        const { data: uData } = await supabase.from('app_users').select('availability_status').eq('id', docId).single();
        if (uData) {
            setDoctorStatus(uData.availability_status || 'ON_BREAK');
        }
    }
  }, []);

  useEffect(() => {
    if (hydrationState !== 'AUTHENTICATED' || !identity?.user?.clinic_id) return;

    const clinicId = identity.user.clinic_id;
    let resolvedDoctorId: string | null = null;
    let cleanupSubs: () => void = () => {};

    const initWorkspace = async () => {
        // A. Promote Appointments once
        await promoteTodayAppointments(clinicId);

        // B. Resolve Active Doctor ID
        if (identity.user.role === 'DOCTOR') {
            resolvedDoctorId = identity.user.id;
        } else {
            // For Assistant: Resolve best guess doctor
            // 1. Try Primary
            const { data: cData } = await supabase.from('clinics').select('primary_doctor_id').eq('id', clinicId).single();
            if (cData?.primary_doctor_id) {
                resolvedDoctorId = cData.primary_doctor_id;
            } else {
                // 2. Fallback to any doctor
                const { data: uData } = await supabase.from('app_users').select('id').eq('clinic_id', clinicId).eq('role', 'DOCTOR').limit(1).maybeSingle();
                if (uData) resolvedDoctorId = uData.id;
            }
        }
        
        setActiveDoctorId(resolvedDoctorId);

        // C. Initial Fetch
        await refreshWorkspace(clinicId, resolvedDoctorId);

        // D. Setup Subscriptions
        const mainChannel = supabase.channel('clinic-global')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patients', filter: `clinic_id=eq.${clinicId}` }, () => {
                refreshWorkspace(clinicId, resolvedDoctorId);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinicId}` }, () => {
                refreshWorkspace(clinicId, resolvedDoctorId);
            })
            // FIX: Subscribe to app_users by clinic_id to handle availability, ignoring specific doctor_id issues
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_users', filter: `clinic_id=eq.${clinicId}` }, (payload: any) => {
                console.log('[REALTIME][AVAILABILITY] payload:', payload);
                const newData = payload.new;
                
                // Allow update if availability_status is present, regardless of role in payload
                if (newData.availability_status) {
                   const nextStatus = newData.availability_status;
                   console.log('[STATE][doctorStatus] updated to:', nextStatus);
                   setDoctorStatus(nextStatus);
                   // NOTE: Intentionally NOT calling refreshWorkspace here to avoid "re-fetching the world" and race conditions
                }
            })
            .subscribe();

        cleanupSubs = () => {
            supabase.removeChannel(mainChannel);
        };
    };

    initWorkspace();

    return () => {
        cleanupSubs();
    };
  }, [hydrationState, identity, promoteTodayAppointments, refreshWorkspace]);


  const handleLoginSuccess = () => {
    setHydrationState('BOOTING');
    executeHydration();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log('Logout error', e);
    }
    setSession(null);
    setIdentity(null);
    setHydrationState('UNAUTHENTICATED');
    setAuthView('login');
    setDoctorWelcomeSeen(false);
  };

  const renderContent = () => {
    switch (hydrationState) {
      case 'BOOTING':
        // VISUAL MATCH: Return a clean white screen. 
        // This prevents double-rendering the logo and allows the Login component 
        // to handle the full intro animation sequence seamlessly when unauthenticated.
        return <div className="min-h-screen bg-white"></div>;

      case 'UNAUTHENTICATED':
        // Unified login view (Landing/Hero removed)
        return (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
            onLoading={() => {}} 
            onError={() => {}} 
          />
        );

      case 'AUTHENTICATED':
        if (!identity?.user) return null;

        const { role, clinic_id } = identity.user;

        switch (role) {
          case 'ADMIN':
            return <AdminDashboard />;
            
          case 'DOCTOR':
            if (clinic_id && !doctorWelcomeSeen) {
              return <DoctorWelcome user={identity.user} onComplete={() => setDoctorWelcomeSeen(true)} />;
            }
            return clinic_id ? (
                <DoctorDashboard 
                    queue={queue}
                    appointments={appointments}
                    doctorStatus={doctorStatus}
                    clinicId={clinic_id}
                    doctorId={identity.user.id}
                />
            ) : <CreateClinic isDoctorMode={true} />;
            
          case 'ASSISTANT':
            return clinic_id ? (
                <AssistantDashboard 
                    queue={queue}
                    appointments={appointments}
                    doctorStatus={doctorStatus}
                    clinicId={clinic_id}
                    // For assistant, activeDoctorId might be null if no doc exists, handled in UI
                    activeDoctorId={activeDoctorId}
                />
            ) : <AssignmentPending />;
            
          default:
            return <div className="text-center text-[#86868b]">Unknown role configuration.</div>;
        }
    }
  };

  return (
    <Layout 
      onLoginClick={() => setAuthView('login')}
      onLogoClick={() => setAuthView('login')}
      onLogoutClick={handleLogout}
      isLoggedIn={hydrationState === 'AUTHENTICATED'}
      identity={identity}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;