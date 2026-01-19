import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Button from './Button';

interface CreateClinicProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  isDoctorMode?: boolean;
}

const CreateClinic: React.FC<CreateClinicProps> = ({ 
  onSuccess, 
  onCancel, 
  isDoctorMode = false 
}) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreated, setIsCreated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Clinic name is required.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('clinics')
        .insert([{ 
          name: name.trim(), 
          location: location.trim() || null 
        }]);

      if (insertError) throw insertError;

      if (isDoctorMode) {
        setIsCreated(true);
      } else {
        if (onSuccess) onSuccess();
      }

    } catch (err: any) {
      console.error('Error creating clinic:', err);
      setError(err.message || 'Unable to create clinic. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isDoctorMode && isCreated) {
    return (
      <div className="flex flex-col items-center justify-center fade-in-up text-center max-w-md mx-auto min-h-[50vh]">
         <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
         </div>
         <h2 className="text-2xl font-medium text-gray-900 tracking-tight mb-3">Clinic Created</h2>
         <p className="text-gray-500 font-normal text-lg leading-relaxed">
           The clinic has been successfully registered.<br />
           Please await administrative assignment.
         </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto fade-in-up py-10">
       <div className="text-center mb-10">
          <h2 className="text-2xl font-medium text-gray-900 tracking-tight">Create New Clinic</h2>
          <p className="mt-2 text-gray-500 text-[15px] font-normal">
            {isDoctorMode ? "Establish a new clinical entity." : "Add a new clinic to the platform."}
          </p>
       </div>
       
       <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label htmlFor="clinic-name" className="block text-sm font-medium text-gray-900 pl-1">
              Clinic Name <span className="text-red-500">*</span>
            </label>
            <input
              id="clinic-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-200"
              placeholder="e.g. Downtown Medical Center"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="clinic-location" className="block text-sm font-medium text-gray-900 pl-1">
              Location <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <input
              id="clinic-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="block w-full rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-200"
              placeholder="e.g. 123 Health Ave, New York"
            />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="pt-4 flex flex-col gap-3">
            <Button 
              type="submit" 
              className="w-full justify-center"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Clinic'}
            </Button>
            
            {!isDoctorMode && onCancel && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onCancel}
                className="w-full"
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>
       </form>
    </div>
  );
};

export default CreateClinic;