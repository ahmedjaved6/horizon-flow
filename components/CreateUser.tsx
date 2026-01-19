import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Button from './Button';

interface CreateUserProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type UserRole = 'DOCTOR' | 'ASSISTANT';

const CreateUser: React.FC<CreateUserProps> = ({ onSuccess, onCancel }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('DOCTOR');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !phone.trim() || !password.trim()) {
      setError('Name, phone, and password are required.');
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        throw new Error('Authentication session missing. Please refresh the page and try again.');
      }

      const accessToken = sessionData.session.access_token;

      const { data, error: funcError } = await supabase.functions.invoke('create-app-user', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          password: password,
          role: role
        }
      });

      if (funcError) {
        let errorMessage = funcError.message;
        if (funcError.context && typeof funcError.context.json === 'function') {
          try {
            const errorBody = await funcError.context.clone().json();
            if (errorBody && errorBody.error) {
              errorMessage = errorBody.error;
            } else if (errorBody && errorBody.message) {
              errorMessage = errorBody.message;
            }
          } catch (e) { }
        }
        throw new Error(errorMessage);
      }
      
      onSuccess();

    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Unable to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto fade-in-up py-10">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-medium text-gray-900 tracking-tight">Create New User</h2>
        <p className="mt-2 text-gray-500 text-[15px] font-normal">
          Register a new Doctor or Assistant.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        <div className="space-y-1">
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-900 pl-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="block w-full rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-200"
            placeholder="e.g. Jane Doe"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="role" className="block text-sm font-medium text-gray-900 pl-1">
            Role <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="block w-full appearance-none rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-200"
            >
              <option value="DOCTOR">Doctor</option>
              <option value="ASSISTANT">Assistant</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-900 pl-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="block w-full rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-200"
            placeholder="e.g. 555-0123"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-gray-900 pl-1">
            Email <span className="text-gray-500 font-normal">(Optional)</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-200"
            placeholder="name@example.com"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-gray-900 pl-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border-0 bg-gray-50 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-transparent placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-200"
            placeholder="Set a temporary password"
          />
        </div>

        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-100 text-sm text-red-600 fade-in-up">
            {error}
          </div>
        )}

        <div className="pt-4 flex flex-col gap-3">
          <Button 
            type="submit" 
            className="w-full justify-center"
            disabled={loading}
          >
            {loading ? 'Creating User...' : 'Create User'}
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
  );
};

export default CreateUser;