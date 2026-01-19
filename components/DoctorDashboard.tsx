import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import Button from './Button';
import { Patient, Appointment } from '../App';
import ClinicalDashboard, { DashboardMetrics } from './ClinicalDashboard';

interface VisitHistory {
  id: string;
  visit_date: string;
  treatment: string | null;
  notes?: string | null;
}

interface DoctorDashboardProps {
  queue: Patient[];
  appointments: Appointment[];
  doctorStatus: 'READY' | 'ON_BREAK';
  clinicId: string;
  doctorId: string;
}

// Utility: Skeleton
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded ${className}`} />
);

const getRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  return `${Math.floor(diffInMonths / 12)}y ago`;
};

const HistoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  visits: VisitHistory[];
  loading: boolean;
}> = ({ isOpen, onClose, visits, loading }) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true">
      <div 
        className="absolute inset-0 bg-gray-900/10 backdrop-blur-sm transition-opacity duration-150" 
        onClick={onClose}
      />
      
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[85vh] sm:max-h-[75vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150 overflow-hidden border border-gray-100">
        
        <div className="sm:hidden w-full flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200"></div>
        </div>

        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-[17px] font-medium text-gray-900 tracking-tight">Visit History</h3>
          <button 
            onClick={onClose}
            className="p-1.5 -mr-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-colors duration-150"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="overflow-y-auto p-0 flex-1 custom-scrollbar">
          {loading ? (
             <div className="flex flex-col">
               {[1, 2, 3].map((i) => (
                 <div key={i} className="p-6 border-b border-gray-50 last:border-0">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                 </div>
               ))}
             </div>
          ) : visits.length === 0 ? (
             <div className="h-48 flex flex-col items-center justify-center">
               <p className="text-gray-500 text-[15px] font-normal">This is the patient’s first visit.</p>
             </div>
          ) : (
             <div className="flex flex-col">
               {visits.map((visit) => (
                 <div key={visit.id} className="p-6 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors duration-150 animate-item">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[15px] font-medium text-gray-900">
                        {new Date(visit.visit_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[15px] text-gray-500 leading-relaxed font-normal">
                      {visit.treatment || 'General Visit'}
                    </p>
                    {visit.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg text-[13px] text-gray-600 leading-relaxed font-normal">
                        {visit.notes}
                      </div>
                    )}
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ 
    queue, 
    appointments, 
    doctorStatus, 
    clinicId, 
    doctorId 
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [pastVisits, setPastVisits] = useState<VisitHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [apptForm, setApptForm] = useState({
    name: '',
    phone: '',
    treatment: '',
    date: new Date().toLocaleDateString('en-CA'),
    time: ''
  });
  const [apptMessage, setApptMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const [view, setView] = useState<'LIVE' | 'DASHBOARD'>('LIVE');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    completedToday: null,
    waitingCount: null,
    avgWaitMins: null
  });

  const currentPatient = queue.find(p => p.status === 'IN_TREATMENT');
  const waitingPatients = queue.filter(p => p.status === 'IN_QUEUE');

  // Auto-Assign Logic: Retained but reactive to props
  useEffect(() => {
    const attemptAutoAssign = async () => {
        if (doctorStatus !== 'READY') return;
        if (currentPatient) return;
        
        const nextPatient = waitingPatients[0];
        if (!nextPatient) return;

        try {
            await supabase
                .from('patients')
                .update({ status: 'IN_TREATMENT' })
                .eq('id', nextPatient.id);
            // Realtime subscription in App.tsx will pick this up and update props
        } catch (e) {
            console.error('Auto-assign failed:', e);
        }
    };

    attemptAutoAssign();
  }, [doctorStatus, currentPatient, waitingPatients]);

  // Analytics Fetch (Local)
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [completedRes, queueRes, waitRes] = await Promise.all([
          // 1. Patients Treated Today: View
          supabase.from('clinic_today_completed').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
          // 2. Patients Waiting: Table (status = IN_QUEUE)
          supabase.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('status', 'IN_QUEUE'),
          // 3. Avg Wait Time: View (representing patient_visits aggregation)
          supabase.from('clinic_avg_wait_time_today').select('*').eq('clinic_id', clinicId).maybeSingle()
        ]);

        let avgWait: number | null = null;
        if (waitRes.data) {
           // Robustly find any number value in the returned object, assuming one generic 'avg' column
           const val = Object.values(waitRes.data).find(v => typeof v === 'number');
           if (typeof val === 'number') {
             avgWait = Math.round(val);
           }
        }

        setMetrics({
          completedToday: completedRes.count ?? 0,
          waitingCount: queueRes.count ?? 0,
          avgWaitMins: avgWait
        });
      } catch (e) {
        console.error("Analytics fetch failed:", e);
      }
    };
    fetchAnalytics();
  }, [clinicId]); 

  useEffect(() => {
     setMounted(true);
     if (!currentPatient) {
       setShowHistory(false);
       setPastVisits([]);
     }
  }, [currentPatient?.id]);

  const handleViewHistory = async () => {
    if (!currentPatient || !currentPatient.phone) return;
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('patient_visits')
        .select('id, visit_date, treatment, notes') 
        .eq('clinic_id', clinicId)
        .eq('patient_phone', currentPatient.phone)
        .order('visit_date', { ascending: false });
      setPastVisits(data as VisitHistory[] || []);
    } catch (e) {} finally {
      setHistoryLoading(false);
    }
  };
  
  const toggleAvailability = async (newStatus: 'READY' | 'ON_BREAK') => {
    setActionLoading(true);
    try {
      await supabase.from('app_users').update({ availability_status: newStatus }).eq('id', doctorId);
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
        setActionLoading(false);
    }
  };

  const handleCompleteTreatment = async () => {
    if (!currentPatient) return;
    setActionLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('patients')
        .update({ status: 'COMPLETED' })
        .eq('id', currentPatient.id);
      
      if (updateError) throw updateError;

      try {
        await supabase.from('patient_visits').insert({
          clinic_id: clinicId,
          patient_name: currentPatient.name,
          patient_phone: currentPatient.phone || null,
          treatment: currentPatient.treatment || null,
          visit_date: new Date().toISOString()
        });
      } catch (visitLogError) {
        console.log('Visit logging skipped:', visitLogError);
      }
    } catch (err) {
      console.error('Complete treatment error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const generateSlots = () => {
    const slots = [];
    for (let h = 9; h < 17; h++) {
      ['00', '30'].forEach(m => slots.push(`${h.toString().padStart(2, '0')}:${m}`));
    }
    return slots.map(time => {
       const isTaken = appointments.some(a => {
           const apptDate = new Date(a.appointment_time);
           const apptDateStr = apptDate.toLocaleDateString('en-CA');
           const apptTimeStr = apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
           return apptDateStr === apptForm.date && apptTimeStr === time;
       });
       return { time, disabled: isTaken };
    });
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setApptMessage(null);
    if (!apptForm.name || !apptForm.phone || !apptForm.time) return;

    try {
      const isoTime = new Date(`${apptForm.date}T${apptForm.time}`).toISOString();
      const { error } = await supabase.from('appointments').insert({
         clinic_id: clinicId,
         patient_name: apptForm.name,
         patient_phone: apptForm.phone,
         treatment: apptForm.treatment || null,
         appointment_time: isoTime,
         status: 'BOOKED'
      });
      if (error) throw error;
      setApptForm(prev => ({ ...prev, name: '', phone: '', treatment: '', time: '' }));
      setApptMessage("Appointment scheduled.");
    } catch (err) {
      setApptMessage("Failed to schedule.");
    }
  };

  if (view === 'DASHBOARD') {
    return (
       <ClinicalDashboard metrics={metrics} loading={false} onBack={() => setView('LIVE')} />
    );
  }

  return (
    <div className="w-full fade-in-up pb-24">
      <HistoryModal 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        visits={pastVisits} 
        loading={historyLoading} 
      />

      {/* Centered Availability Segmented Control */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="bg-gray-100/60 p-1 rounded-full inline-flex relative border border-gray-200/50 shadow-inner">
           <button 
             onClick={() => toggleAvailability('READY')} 
             disabled={actionLoading} 
             className={`relative z-10 px-6 py-1.5 text-[13px] font-medium rounded-full transition-all duration-200 flex items-center gap-2 ${
                doctorStatus === 'READY' 
                  ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5' 
                  : 'text-gray-400 hover:text-gray-600'
             }`}
           >
             <span className={`w-1.5 h-1.5 rounded-full ${doctorStatus === 'READY' ? 'bg-emerald-500' : 'bg-transparent border border-gray-300'}`} />
             Ready
           </button>
           <button 
             onClick={() => toggleAvailability('ON_BREAK')} 
             disabled={actionLoading} 
             className={`relative z-10 px-6 py-1.5 text-[13px] font-medium rounded-full transition-all duration-200 flex items-center gap-2 ${
                doctorStatus === 'ON_BREAK' 
                  ? 'bg-white text-stone-600 shadow-sm ring-1 ring-black/5' 
                  : 'text-gray-400 hover:text-gray-600'
             }`}
           >
             <span className={`w-1.5 h-1.5 rounded-full ${doctorStatus === 'ON_BREAK' ? 'bg-stone-400' : 'bg-transparent border border-gray-300'}`} />
             Break
           </button>
        </div>

        <button 
          onClick={() => setView('DASHBOARD')}
          className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          View Clinical Dashboard
        </button>
      </div>

      <div className="fade-in-up">
            <main className="flex flex-col items-center justify-center min-h-[30vh] mb-12">
               {currentPatient ? (
                 <div key={currentPatient.id} className="w-full max-w-lg text-center fade-in-up">
                    {/* VISUALLY DOMINANT CARD FOR ACTIVE PATIENT */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 sm:p-10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                        
                        <div className="mb-6">
                          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[11px] font-semibold uppercase tracking-wider">
                            Now Treating
                          </span>
                        </div>

                        <h2 className="text-4xl sm:text-5xl font-medium text-gray-900 tracking-tight mb-3">{currentPatient.name}</h2>
                        
                        {currentPatient.isReturning && currentPatient.lastVisitAt ? (
                          <div className="flex flex-col items-center mb-8 gap-1 fade-in-up mt-4">
                             {(currentPatient.visitCount || 0) > 1 && (
                               <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                                  Returning patient
                               </span>
                             )}
                             <p className="text-[15px] text-gray-500 font-normal">
                               Last visit: <span className="font-medium text-gray-900">{currentPatient.lastVisitTreatment || 'Consultation'}</span> · {getRelativeTime(currentPatient.lastVisitAt)}
                             </p>
                             <button 
                               onClick={handleViewHistory}
                               className="mt-2 text-[13px] font-medium text-accent-blue hover:text-blue-700 transition-colors hover:underline decoration-transparent hover:decoration-accent-blue/30 underline-offset-4"
                             >
                               View visit history
                             </button>
                          </div>
                        ) : (
                          <div className="mb-6 h-2"></div>
                        )}
                        
                        <div className="mb-10 flex flex-col gap-1 items-center">
                           {currentPatient.treatment && <p className="text-gray-900 text-[18px] leading-relaxed font-normal">{currentPatient.treatment}</p>}
                           {currentPatient.phone && <p className="text-gray-400 text-sm font-normal mt-1">{currentPatient.phone}</p>}
                        </div>
                        
                        <div className="hidden sm:block mt-8">
                          <Button onClick={handleCompleteTreatment} disabled={actionLoading} className="w-full sm:w-auto min-w-[220px] shadow-lg shadow-gray-200/50 bg-gray-900 hover:bg-black transition-transform active:scale-[0.98]">
                            {actionLoading ? 'Updating...' : 'Complete Treatment'}
                          </Button>
                        </div>
                    </div>
                    
                    {mounted && createPortal(
                       <div className="sm:hidden pointer-events-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/90 backdrop-blur-xl border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                         <Button onClick={handleCompleteTreatment} disabled={actionLoading} className="w-full shadow-lg">
                            {actionLoading ? 'Updating...' : 'Complete Treatment'}
                         </Button>
                       </div>,
                       document.getElementById('bottom-actions-root')!
                    )}
                 </div>
               ) : (
                 <div className="text-center fade-in-up py-12">
                   {doctorStatus === 'READY' ? (
                     <>
                       <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                       </div>
                       <h2 className="text-2xl font-medium text-gray-900 tracking-tight mb-2">You’re ready.</h2>
                       <p className="text-gray-500 font-normal text-lg">{waitingPatients.length > 0 ? "Waiting for assignment..." : "No patients right now."}</p>
                     </>
                   ) : (
                     <>
                       <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                       </div>
                       <h2 className="text-xl font-medium text-gray-500 tracking-tight mb-2">You are currently on break.</h2>
                       <p className="text-gray-400 font-normal text-[15px]">Switch to 'Ready' to resume patient intake.</p>
                     </>
                   )}
                 </div>
               )}
            </main>

            <section className="border-t border-gray-100 pt-12 mb-16">
               <div className="flex items-baseline justify-between mb-6">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider pl-1">Waiting List</h3>
                  <span className="text-[11px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded">{waitingPatients.length} Waiting</span>
               </div>
               {waitingPatients.length === 0 ? (
                  <div className="w-full h-32 flex items-center justify-center border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                    <p className="text-sm text-gray-500 font-normal">No patients waiting.</p>
                  </div>
               ) : (
                  <div className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                     {waitingPatients.map((patient, index) => (
                       <div key={patient.id} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors duration-150 animate-item">
                          <div className="flex items-center gap-4">
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-50 text-[11px] font-medium text-gray-500">{index + 1}</span>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 text-[15px]">{patient.name}</span>
                              {patient.treatment && <span className="text-[13px] text-gray-500 font-normal mt-0.5">{patient.treatment}</span>}
                            </div>
                          </div>
                          <span className="text-[13px] text-gray-400 font-normal bg-gray-50 px-2 py-1 rounded">Waiting</span>
                       </div>
                     ))}
                  </div>
               )}
            </section>

            <section className="border-t border-gray-100 pt-12 grid md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-6 pl-1">Schedule Appointment</h3>
                <form onSubmit={handleCreateAppointment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Name" className="bg-gray-50 border-0 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:ring-2 focus:ring-gray-900" value={apptForm.name} onChange={e => setApptForm({...apptForm, name: e.target.value})} required />
                    <input type="tel" placeholder="Phone" className="bg-gray-50 border-0 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:ring-2 focus:ring-gray-900" value={apptForm.phone} onChange={e => setApptForm({...apptForm, phone: e.target.value})} required />
                  </div>
                  <input type="text" placeholder="Treatment" className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:ring-2 focus:ring-gray-900" value={apptForm.treatment} onChange={e => setApptForm({...apptForm, treatment: e.target.value})} />
                  <input type="date" className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:ring-2 focus:ring-gray-900" value={apptForm.date} onChange={e => setApptForm({...apptForm, date: e.target.value, time: ''})} required />
                  
                  <div className="grid grid-cols-4 gap-2">
                    {generateSlots().map(({ time, disabled }) => (
                      <button
                        key={time}
                        type="button"
                        disabled={disabled}
                        onClick={() => setApptForm({...apptForm, time})}
                        className={`py-2 text-xs rounded-md transition-colors duration-150 ${
                           disabled ? 'opacity-30 cursor-not-allowed bg-gray-100 text-gray-400' :
                           apptForm.time === time ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-accent-blue">{apptMessage}</span>
                    <Button type="submit" className="px-6 py-2 h-9 text-xs" disabled={!apptForm.time}>Schedule</Button>
                  </div>
                </form>
              </div>

              <div>
                 <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-6 pl-1">Upcoming Appointments</h3>
                 {appointments.length === 0 ? (
                   <div className="py-12 text-center">
                     <p className="text-sm text-gray-500 font-normal">No appointments scheduled today.</p>
                   </div>
                 ) : (
                   <div className="flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar">
                      {appointments.map(appt => {
                        const d = new Date(appt.appointment_time);
                        return (
                          <div key={appt.id} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 transition-colors duration-150 animate-item">
                             <div>
                               <div className="text-gray-900 font-medium text-[13px]">{d.toLocaleDateString(undefined, {month:'short', day:'numeric'})} • {d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                               <div className="text-gray-500 text-[12px] mt-0.5">{appt.patient_name}</div>
                             </div>
                             <span className="text-[10px] font-medium bg-gray-50 text-gray-500 px-2 py-1 rounded">BOOKED</span>
                          </div>
                        );
                     })}
                   </div>
                 )}
              </div>
            </section>
        </div>
    </div>
  );
};

export default DoctorDashboard;