import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Button from './Button';

interface Clinic {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

interface AssignClinicProps {
  user: User;
  clinics: Clinic[];
  onSuccess: () => void;
  onCancel: () => void;
}

const AssignClinic: React.FC<AssignClinicProps> = ({ user, clinics, onSuccess, onCancel }) => {
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClinicId) {
      setError('Please select a clinic.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ clinic_id: selectedClinicId })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onSuccess();
    } catch (err: any) {
      console.error('Assignment error:', err);
      setError(err.message || 'Failed to assign clinic. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/10 backdrop-blur-sm transition-all duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 fade-in-up duration-150">
        <div className="text-center mb-8">
          <h3 className="text-xl font-medium text-gray-900 tracking-tight">Assign Clinic</h3>
          <p className="mt-2 text-gray-500 text-[15px] font-normal">
            Select a clinical environment for <span className="font-medium text-gray-900">{user.full_name}</span>.
          </p>
        </div>

        <form onSubmit={handleAssign} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="clinic-select" className="block text-sm font-medium text-gray-900 pl-1">
              Clinic
            </label>
            <div className="relative">
              <select
                id="clinic-select"
                value={selectedClinicId}
                onChange={(e) => {
                  setSelectedClinicId(e.target.value);
                  setError(null);
                }}
                className="block w-full appearance-none rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-150"
              >
                <option value="" disabled>Select a clinic...</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {clinics.length === 0 && (
              <p className="text-xs text-amber-600 mt-1 pl-1">
                No clinics available. Please create a clinic first.
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-100 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              type="submit" 
              className="w-full justify-center"
              disabled={loading || !selectedClinicId}
            >
              {loading ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onCancel}
              className="w-full"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignClinic;