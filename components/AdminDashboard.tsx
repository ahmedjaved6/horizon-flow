import React, { useState, useEffect, useCallback } from 'react';
import Button from './Button';
import CreateClinic from './CreateClinic';
import CreateUser from './CreateUser';
import AssignClinic from './AssignClinic';
import { supabase } from '../lib/supabaseClient';

interface User {
  id: string;
  full_name: string;
  role: 'ADMIN' | 'DOCTOR' | 'ASSISTANT';
  phone: string;
  clinic_id: string | null;
  email: string;
}

interface Clinic {
  id: string;
  name: string;
  location: string | null;
}

// Utility: Skeleton
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded ${className}`} />
);

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'DASHBOARD' | 'CREATE_CLINIC' | 'CREATE_USER'>('DASHBOARD');
  
  const [userToAssign, setUserToAssign] = useState<User | null>(null);

  const fetchPlatformData = useCallback(async () => {
    try {
      const [usersResult, clinicsResult] = await Promise.all([
        supabase.from('app_users').select('*').order('created_at', { ascending: false }),
        supabase.from('clinics').select('*').order('created_at', { ascending: false })
      ]);

      if (usersResult.data) setUsers(usersResult.data as User[]);
      if (clinicsResult.data) setClinics(clinicsResult.data as Clinic[]);
    } catch (e) {
      console.error('Data fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatformData();
  }, [fetchPlatformData]);

  const totalClinics = clinics.length;
  const totalDoctors = users.filter(u => u.role === 'DOCTOR').length;
  const totalAssistants = users.filter(u => u.role === 'ASSISTANT').length;

  const getPrimaryDoctor = (clinicId: string) => {
    const doc = users.find(u => u.clinic_id === clinicId && u.role === 'DOCTOR');
    return doc ? doc.full_name : '—';
  };

  const handleEntityCreated = async () => {
    setView('DASHBOARD');
    await fetchPlatformData();
  };

  const handleAssignmentSuccess = async () => {
    setUserToAssign(null);
    await fetchPlatformData();
  };

  if (view === 'CREATE_CLINIC') {
    return (
      <div className="w-full max-w-5xl fade-in-up pb-24">
         <header className="mb-8 pt-6">
            <button 
              onClick={() => setView('DASHBOARD')}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 mb-4"
            >
              ← Back to Overview
            </button>
         </header>
         
         <div className="flex justify-center">
            <CreateClinic 
              isDoctorMode={false}
              onSuccess={handleEntityCreated}
              onCancel={() => setView('DASHBOARD')}
            />
         </div>
      </div>
    );
  }

  if (view === 'CREATE_USER') {
    return (
      <div className="w-full max-w-5xl fade-in-up pb-24">
         <header className="mb-8 pt-6">
            <button 
              onClick={() => setView('DASHBOARD')}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 mb-4"
            >
              ← Back to Overview
            </button>
         </header>
         
         <div className="flex justify-center">
            <CreateUser 
              onSuccess={handleEntityCreated}
              onCancel={() => setView('DASHBOARD')}
            />
         </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl fade-in-up pb-24 relative">
      {userToAssign && (
        <AssignClinic 
          user={userToAssign}
          clinics={clinics}
          onSuccess={handleAssignmentSuccess}
          onCancel={() => setUserToAssign(null)}
        />
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 pt-6">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-gray-900">Horizon Flow</h1>
          <p className="mt-2 text-gray-500 text-lg font-normal">Platform Administration</p>
        </div>
        
        <div className="flex gap-3">
           <Button 
             variant="secondary" 
             className="px-5 text-sm h-10 bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
             onClick={() => setView('CREATE_CLINIC')}
           >
              Create Clinic
           </Button>
           <Button 
             variant="primary" 
             className="px-5 text-sm h-10 shadow-sm"
             onClick={() => setView('CREATE_USER')}
           >
              Create User
           </Button>
        </div>
      </header>

      <section className="mb-16">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-6 pl-1">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { label: 'Active Clinics', value: totalClinics },
             { label: 'Doctors', value: totalDoctors },
             { label: 'Assistants', value: totalAssistants }
           ].map((stat, idx) => (
             <div key={idx} className="p-6 bg-gray-50 rounded-2xl border border-gray-100/50">
                {loading ? (
                  <>
                    <Skeleton className="h-9 w-12 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-medium text-gray-900 mb-1 tracking-tight">{stat.value}</p>
                    <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                  </>
                )}
             </div>
           ))}
        </div>
      </section>

      <section className="mb-16">
        <div className="flex items-baseline justify-between mb-6 pl-1">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clinics</h2>
        </div>
        
        <div className="w-full">
            {loading ? (
               <div className="flex flex-col">
                  <div className="grid grid-cols-12 px-4 py-3 border-b border-gray-200">
                      <div className="col-span-4"><Skeleton className="h-3 w-12" /></div>
                      <div className="col-span-4"><Skeleton className="h-3 w-16" /></div>
                      <div className="col-span-4"><Skeleton className="h-3 w-20" /></div>
                  </div>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="grid grid-cols-12 px-4 py-5 border-b border-gray-100 items-center">
                        <div className="col-span-4"><Skeleton className="h-5 w-32" /></div>
                        <div className="col-span-4"><Skeleton className="h-4 w-48" /></div>
                        <div className="col-span-4"><Skeleton className="h-4 w-24" /></div>
                    </div>
                  ))}
               </div>
            ) : clinics.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-500 font-normal">No clinics created yet.</p>
                </div>
            ) : (
                <div className="flex flex-col">
                    <div className="grid grid-cols-12 px-4 py-3 border-b border-gray-200 text-xs font-medium text-gray-500">
                        <div className="col-span-4">Name</div>
                        <div className="col-span-4">Location</div>
                        <div className="col-span-4 text-right md:text-left">Primary Doctor</div>
                    </div>
                     {clinics.map(clinic => (
                        <div key={clinic.id} className="grid grid-cols-12 px-4 py-5 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 items-center group animate-item">
                            <div className="col-span-4 font-medium text-gray-900">{clinic.name}</div>
                            <div className="col-span-4 text-sm text-gray-500">{clinic.location || '—'}</div>
                            <div className="col-span-4 text-sm text-gray-500 text-right md:text-left">{getPrimaryDoctor(clinic.id)}</div>
                        </div>
                     ))}
                </div>
            )}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-6 pl-1">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">System Users</h2>
        </div>
        
        <div className="w-full">
             <div className="flex flex-col">
                {loading ? (
                   <>
                      <div className="grid grid-cols-12 px-4 py-3 border-b border-gray-200">
                          <div className="col-span-4"><Skeleton className="h-3 w-12" /></div>
                          <div className="col-span-3"><Skeleton className="h-3 w-10" /></div>
                          <div className="col-span-3"><Skeleton className="h-3 w-16" /></div>
                          <div className="col-span-2 text-right"><Skeleton className="h-3 w-12 ml-auto" /></div>
                      </div>
                      {[1, 2, 3].map(i => (
                        <div key={i} className="grid grid-cols-12 px-4 py-5 border-b border-gray-100 items-center">
                            <div className="col-span-4 flex flex-col gap-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                            <div className="col-span-3"><Skeleton className="h-5 w-16 rounded" /></div>
                            <div className="col-span-3"><Skeleton className="h-4 w-24" /></div>
                            <div className="col-span-2 text-right"><Skeleton className="h-4 w-12 ml-auto" /></div>
                        </div>
                      ))}
                   </>
                ) : (
                  <>
                    <div className="grid grid-cols-12 px-4 py-3 border-b border-gray-200 text-xs font-medium text-gray-500">
                        <div className="col-span-4">Name</div>
                        <div className="col-span-3">Role</div>
                        <div className="col-span-3">Phone</div>
                        <div className="col-span-2 text-right">Status</div>
                    </div>
                    
                    {users.filter(u => u.role !== 'ADMIN').length === 0 && (
                         <div className="py-12 text-center">
                            <p className="text-sm text-gray-500 font-normal">No users added yet.</p>
                         </div>
                    )}
                    
                    {users.filter(u => u.role !== 'ADMIN').map(user => (
                        <div key={user.id} className="grid grid-cols-12 px-4 py-5 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 items-center group animate-item">
                            <div className="col-span-4">
                                <div className="font-medium text-gray-900">{user.full_name}</div>
                                <div className="text-xs text-gray-400 mt-1 font-normal">{user.email}</div>
                            </div>
                            <div className="col-span-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                    {user.role}
                                </span>
                            </div>
                            <div className="col-span-3 text-sm text-gray-500 font-mono tracking-tight">{user.phone}</div>
                            <div className="col-span-2 text-right flex justify-end">
                                {user.clinic_id ? (
                                    <span className="text-xs font-medium text-accent-blue">Active</span>
                                ) : (
                                    <button
                                      onClick={() => setUserToAssign(user)}
                                      className="text-xs font-medium text-gray-900 hover:text-accent-blue transition-colors duration-150 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full border border-gray-200"
                                    >
                                      Assign
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                  </>
                )}
             </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;