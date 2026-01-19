import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import { supabase } from '../lib/supabaseClient';
import { Patient, Appointment } from '../App';

interface AssistantDashboardProps {
    queue: Patient[];
    appointments: Appointment[];
    doctorStatus: 'READY' | 'ON_BREAK';
    clinicId: string;
    activeDoctorId: string | null;
}

const TREATMENT_OPTIONS = [
  'Consultation', 'Scaling / Cleaning', 'Filling', 'Root Canal', 'Crown', 
  'Extraction', 'Braces / Ortho', 'Whitening', 'Follow-up', 'Other'
];

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

const AssistantDashboard: React.FC<AssistantDashboardProps> = ({
    queue,
    appointments,
    doctorStatus,
    clinicId,
    activeDoctorId
}) => {
  const [mode, setMode] = useState<'WALK_IN' | 'SCHEDULE'>('WALK_IN');
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [treatment, setTreatment] = useState('');
  const [isCustomTreatment, setIsCustomTreatment] = useState(false);
  
  const [apptDate, setApptDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [apptTime, setApptTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isReturning, setIsReturning] = useState(false);
  const [returningInfo, setReturningInfo] = useState<string | null>(null);
  
  const [suggestions, setSuggestions] = useState<{name: string, phone: string, lastVisit: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // UX State
  const [patientToCancel, setPatientToCancel] = useState<string | null>(null);

  // Derived State for UI Hierarchy
  const activePatient = queue.find(p => p.status === 'IN_TREATMENT');
  const waitingQueue = queue.filter(p => p.status === 'IN_QUEUE');

  const generateSlots = () => {
    const slots = [];
    for (let h = 9; h < 17; h++) {
      ['00', '30'].forEach(m => slots.push(`${h.toString().padStart(2, '0')}:${m}`));
    }
    return slots.map(time => {
       const isTaken = appointments.some(a => {
           const d = new Date(a.appointment_time);
           const dStr = d.toLocaleDateString('en-CA');
           const tStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
           return dStr === apptDate && tStr === time;
       });
       return { time, disabled: isTaken };
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
        if (!phoneNumber || phoneNumber.length < 6 || !clinicId) {
            setSuggestions([]);
            setShowSuggestions(false);
            if (phoneNumber.length < 3) {
                 setIsReturning(false);
                 setReturningInfo(null);
            }
            return;
        }

        try {
            const { data, error } = await supabase
                .from('patients')
                .select('name, phone, created_at')
                .eq('clinic_id', clinicId)
                .ilike('phone', `${phoneNumber}%`)
                .order('created_at', { ascending: false })
                .limit(20)
                .abortSignal(controller.signal);

            if (error || !data) return;

            const uniqueMap = new Map();
            data.forEach((p: any) => {
                if (p.phone && !uniqueMap.has(p.phone)) {
                    uniqueMap.set(p.phone, {
                        name: p.name,
                        phone: p.phone,
                        lastVisit: p.created_at
                    });
                }
            });
            
            const uniqueResults = Array.from(uniqueMap.values()).slice(0, 3);

            if (uniqueResults.length === 1) {
                const match = uniqueResults[0] as {name: string, phone: string, lastVisit: string};
                
                setPatientName(match.name);
                setIsReturning(true);
                setShowSuggestions(false);
                setSuggestions([]);
                
                const { data: visit } = await supabase
                    .from('patient_visits')
                    .select('treatment, visit_date')
                    .eq('clinic_id', clinicId)
                    .eq('patient_phone', match.phone)
                    .order('visit_date', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (visit) {
                    setReturningInfo(`Last visit: ${visit.treatment || 'Checkup'} · ${getRelativeTime(visit.visit_date)}`);
                } else {
                    setReturningInfo(`Registered ${getRelativeTime(match.lastVisit)}`);
                }
                
            } else if (uniqueResults.length > 1) {
                setSuggestions(uniqueResults.map((r: any) => ({
                    name: r.name,
                    phone: r.phone,
                    lastVisit: new Date(r.lastVisit).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                })));
                setShowSuggestions(true);
                setIsReturning(false);
                setReturningInfo(null);
            } else {
                setShowSuggestions(false);
                setIsReturning(false);
                setReturningInfo(null);
            }
        } catch (e) {
            // fail silent
        }
    }, 300);

    return () => {
        clearTimeout(timeoutId);
        controller.abort();
    };
  }, [phoneNumber, clinicId]);

  const handleSuggestionSelect = async (s: {name: string, phone: string, lastVisit: string}) => {
      setPatientName(s.name);
      setPhoneNumber(s.phone);
      setIsReturning(true);
      setShowSuggestions(false);
      setSuggestions([]);
      
      if (clinicId) {
         try {
             const { data: visit } = await supabase
                .from('patient_visits')
                .select('treatment, visit_date')
                .eq('clinic_id', clinicId)
                .eq('patient_phone', s.phone)
                .order('visit_date', { ascending: false })
                .limit(1)
                .maybeSingle();
             
             if (visit) {
                 setReturningInfo(`Last visit: ${visit.treatment || 'Checkup'} · ${getRelativeTime(visit.visit_date)}`);
             } else {
                 setReturningInfo(`Registered ${getRelativeTime(s.lastVisit)}`);
             }
         } catch(e) {}
      }
  };

  const handleTreatmentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'Other') {
      setIsCustomTreatment(true);
      setTreatment('');
    } else {
      setIsCustomTreatment(false);
      setTreatment(val);
    }
  };

  const isValid = patientName.trim().length > 0 && phoneNumber.trim().length > 0 && (mode === 'WALK_IN' || apptTime !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !clinicId) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'WALK_IN') {
          // Safe Logic: IN_QUEUE always. DoctorDashboard Auto-Assign will promote if Ready.
          let initialStatus = 'IN_QUEUE';
          // Optimisation: Re-enable immediate assignment if we are confident in state
          const activePatient = queue.find(p => p.status === 'IN_TREATMENT');
          if (doctorStatus === 'READY' && !activePatient) {
              initialStatus = 'IN_TREATMENT';
          }

          const { error: insertError } = await supabase.from('patients').insert({
            clinic_id: clinicId,
            name: patientName.trim(), 
            phone: phoneNumber.trim(),
            treatment: treatment.trim() || null,
            status: initialStatus
          });
          if (insertError) throw insertError;
          setSuccessMsg("Patient added to queue.");
      } else {
          const isoTime = new Date(`${apptDate}T${apptTime}`).toISOString();
          const { error: apptError } = await supabase.from('appointments').insert({
             clinic_id: clinicId,
             patient_name: patientName.trim(),
             patient_phone: phoneNumber.trim(),
             treatment: treatment.trim() || null,
             appointment_time: isoTime,
             status: 'BOOKED'
          });
          if (apptError) throw apptError;
          setSuccessMsg("Appointment scheduled.");
      }

      setPatientName('');
      setPhoneNumber('');
      setTreatment('');
      setIsCustomTreatment(false);
      setApptTime('');
      setIsReturning(false);
      setReturningInfo(null);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError('Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleArrive = async (appt: Appointment) => {
    if (!clinicId) return;
    setError(null);
    setSuccessMsg(null);

    try {
        let initialStatus = 'IN_QUEUE';
        const activePatient = queue.find(p => p.status === 'IN_TREATMENT');
        if (doctorStatus === 'READY' && !activePatient) {
            initialStatus = 'IN_TREATMENT';
        }

        const { error: insertError } = await supabase.from('patients').insert({
            clinic_id: clinicId,
            name: appt.patient_name,
            phone: appt.patient_phone,
            treatment: appt.treatment,
            status: initialStatus
        });
        if (insertError) throw insertError;

        const { error: updateError } = await supabase.from('appointments').update({ status: 'CANCELLED' }).eq('id', appt.id);
        if (updateError) throw updateError;
        setSuccessMsg(`${appt.patient_name} marked as arrived.`);
    } catch (err) {
        console.error('Arrival error:', err);
        setError('Failed to check in appointment.');
    }
  };

  const confirmCancelPatient = async () => {
    if (!clinicId || !patientToCancel) return;
    const pid = patientToCancel;
    setPatientToCancel(null);
    
    try {
        await supabase
          .from('patients')
          .update({ status: 'CANCELLED' })
          .eq('id', pid);
    } catch (err) {
        // App subscription handles refresh
    }
  };

  const selectValue = isCustomTreatment 
    ? 'Other' 
    : (TREATMENT_OPTIONS.includes(treatment) ? treatment : '');

  return (
    <div className="w-full max-w-md mx-auto fade-in-up py-8 pb-24">
      {patientToCancel && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity" onClick={() => setPatientToCancel(null)} />
           <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 tracking-tight">Cancel patient?</h3>
              <p className="mt-2 text-sm text-gray-500 font-normal">This will remove the patient from today’s queue.</p>
              <div className="mt-6 flex gap-3">
                 <button 
                   onClick={() => setPatientToCancel(null)}
                   className="flex-1 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                 >
                   Keep
                 </button>
                 <button 
                   onClick={confirmCancelPatient}
                   className="flex-1 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl text-sm font-medium transition-colors"
                 >
                   Cancel Patient
                 </button>
              </div>
           </div>
        </div>,
        document.body
      )}

      <div className="flex justify-center mb-6">
        <div className="bg-gray-50 p-1 rounded-full inline-flex relative h-10 w-full max-w-[240px]">
           <button onClick={() => { setMode('WALK_IN'); setError(null); setSuccessMsg(null); }} className={`flex-1 relative z-10 text-[13px] font-medium rounded-full transition-all duration-150 ${mode === 'WALK_IN' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Walk-in</button>
           <button onClick={() => { setMode('SCHEDULE'); setError(null); setSuccessMsg(null); }} className={`flex-1 relative z-10 text-[13px] font-medium rounded-full transition-all duration-150 ${mode === 'SCHEDULE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Schedule</button>
        </div>
      </div>

      <div className="text-center mb-2">
        <h2 className="text-2xl font-medium text-gray-900 tracking-tight">{mode === 'WALK_IN' ? 'Register Walk-in' : 'Schedule Appointment'}</h2>
        <p className="mt-2 text-gray-500 text-[15px] font-normal">{mode === 'WALK_IN' ? 'Add a patient to the live queue.' : 'Book a future slot.'}</p>
      </div>
      
      {activeDoctorId ? (
        <div className="flex justify-center mb-8 fade-in-up">
           <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-medium transition-colors duration-300 shadow-sm ${
             doctorStatus === 'READY' 
               ? 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700' 
               : 'bg-stone-50/80 border-stone-200/60 text-stone-600'
           }`}>
             <span className={`w-1.5 h-1.5 rounded-full ${doctorStatus === 'READY' ? 'bg-emerald-500' : 'bg-stone-400'}`} />
             {doctorStatus === 'READY' ? 'Ready' : 'On Break'}
           </div>
        </div>
      ) : (
        <div className="flex justify-center mb-8 fade-in-up">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500 text-[13px]">
                Doctor status unavailable
             </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 mb-16">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-900 pl-1">Patient Name <span className="text-red-500">*</span></label>
          <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} disabled={loading} className="block w-full rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-150" placeholder="e.g. Alex Smith" />
        </div>

        <div className="space-y-1 relative">
          <div className="flex justify-between items-baseline pl-1 pr-1">
            <label className="block text-sm font-medium text-gray-900">Phone Number <span className="text-red-500">*</span></label>
            {isReturning && (
                <span className="text-[11px] text-accent-blue font-medium tracking-tight fade-in-up">
                    Returning patient {returningInfo ? <span className="text-gray-500 font-normal"> · {returningInfo}</span> : ''}
                </span>
            )}
          </div>
          <input 
            type="tel" 
            value={phoneNumber} 
            onChange={(e) => setPhoneNumber(e.target.value)} 
            disabled={loading} 
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="block w-full rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-150" 
            placeholder="e.g. 555-0123" 
          />
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
               {suggestions.map((s, idx) => (
                 <button
                   key={idx}
                   type="button"
                   onMouseDown={() => handleSuggestionSelect(s)}
                   className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                 >
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-medium text-gray-900">{s.name}</span>
                      <span className="text-xs text-gray-500">{s.lastVisit}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.phone}</div>
                 </button>
               ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-900 pl-1">Treatment <span className="text-gray-500 font-normal">(Optional)</span></label>
          <div className="relative">
             <select
               value={selectValue}
               onChange={handleTreatmentSelect}
               disabled={loading}
               className="block w-full appearance-none rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-150"
             >
               <option value="" disabled>Select treatment...</option>
               {TREATMENT_OPTIONS.map(opt => (
                 <option key={opt} value={opt}>{opt}</option>
               ))}
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
               <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
               </svg>
             </div>
          </div>
          
          {isCustomTreatment && (
             <input 
               type="text" 
               value={treatment} 
               onChange={(e) => setTreatment(e.target.value)} 
               disabled={loading} 
               autoFocus
               className="mt-2 block w-full rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-150 fade-in-up" 
               placeholder="Specify treatment..." 
             />
          )}
        </div>

        {mode === 'SCHEDULE' && (
          <div className="space-y-4 pt-2 fade-in-up">
             <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-900 pl-1">Date</label>
                <input type="date" value={apptDate} onChange={(e) => { setApptDate(e.target.value); setApptTime(''); }} disabled={loading} className="block w-full rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6" />
             </div>
             <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-900 pl-1">Available Slots</label>
                <div className="grid grid-cols-4 gap-2">
                   {generateSlots().map(({ time, disabled }) => (
                     <button key={time} type="button" disabled={disabled} onClick={() => setApptTime(time)} className={`py-2 text-xs rounded-md transition-colors duration-150 ${disabled ? 'opacity-30 cursor-not-allowed bg-gray-100' : apptTime === time ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900 hover:bg-gray-200'}`}>{time}</button>
                   ))}
                </div>
             </div>
          </div>
        )}

        {(error || successMsg) && (
          <div className={`p-3 rounded-md border text-sm text-center ${error ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-700'}`}>
            {error || successMsg}
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" className="w-full justify-center" disabled={!isValid || loading}>{loading ? 'Processing...' : mode === 'WALK_IN' ? 'Add to Queue' : 'Confirm Appointment'}</Button>
        </div>
      </form>

      <section className="border-t border-gray-100 pt-10 mb-8">
         <div className="flex items-baseline justify-between mb-6 pl-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Live Queue</h3>
            </div>
            <span className="text-[11px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded">{queue.length}</span>
         </div>
         
         {queue.length === 0 ? (
             <div className="py-12 text-center"><p className="text-sm text-gray-500 font-normal">The queue is clear.</p></div> 
         ) : (
             <div className="space-y-6">
                {/* 1. VISUALLY DOMINANT ACTIVE PATIENT CARD */}
                {activePatient && (
                    <div className="animate-item">
                        <div className="p-5 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-blue-100/80 relative overflow-hidden group">
                           {/* Subtle Left Accent Line */}
                           <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                           
                           <div className="flex justify-between items-center pl-2">
                              <div>
                                 <span className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Now Treating</span>
                                 <span className="text-lg font-medium text-gray-900 block">{activePatient.name}</span>
                                 {activePatient.treatment && <span className="text-sm text-gray-500 block mt-0.5">{activePatient.treatment}</span>}
                              </div>
                              <span className="text-[11px] px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium whitespace-nowrap">
                                In Treatment
                              </span>
                           </div>
                        </div>
                    </div>
                )}

                {/* 2. NEUTRAL WAITING LIST */}
                {waitingQueue.length > 0 && (
                    <div className="space-y-3">
                        {waitingQueue.map((p) => (
                           <div key={p.id} className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl border border-gray-100 group animate-item">
                              <span className="text-gray-900 text-[15px] font-medium">{p.name}</span>
                              <div className="flex items-center gap-3">
                                 <button 
                                    onClick={() => setPatientToCancel(p.id)}
                                    disabled={loading}
                                    className="text-[11px] font-medium text-red-600 bg-white border border-red-100 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors shadow-sm"
                                 >
                                    Cancel
                                 </button>
                                 <span className="text-[11px] px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                    Waiting
                                 </span>
                              </div>
                           </div>
                        ))}
                    </div>
                )}
             </div>
         )}
      </section>

      <section className="border-t border-gray-100 pt-10">
         <div className="flex items-baseline justify-between mb-6 pl-1">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Upcoming Appointments</h3>
         </div>
         {appointments.length === 0 ? <div className="py-12 text-center"><p className="text-sm text-gray-500 font-normal">No appointments scheduled today.</p></div> : (
             <div className="space-y-2">
               {appointments.map(a => {
                  const d = new Date(a.appointment_time);
                  return (
                    <div key={a.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 px-2 group animate-item">
                       <div><span className="block text-gray-900 text-[13px] font-medium">{d.toLocaleDateString(undefined, {month:'short', day:'numeric'})} • {d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span><span className="text-gray-500 text-[12px]">{a.patient_name}</span></div>
                       <div className="flex items-center gap-2">
                         {doctorStatus === 'ON_BREAK' && (
                           <span className="hidden sm:inline-block text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">
                             Doctor on break
                           </span>
                         )}
                         <button 
                           onClick={() => handleArrive(a)} 
                           disabled={loading}
                           className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors shadow-sm ${
                             doctorStatus === 'ON_BREAK' 
                               ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                               : 'text-white bg-gray-900 hover:bg-gray-800'
                           }`}
                         >
                           Arrive
                         </button>
                       </div>
                    </div>
                  );
               })}
             </div>
         )}
      </section>
    </div>
  );
};

export default AssistantDashboard;