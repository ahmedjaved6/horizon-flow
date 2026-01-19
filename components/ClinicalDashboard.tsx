import React from 'react';

export interface DashboardMetrics {
  completedToday: number | null;
  waitingCount: number | null;
  avgWaitMins: number | null;
}

interface ClinicalDashboardProps {
  metrics: DashboardMetrics;
  loading: boolean;
  onBack: () => void;
}

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded ${className}`} />
);

const KPICard: React.FC<{
  label: string;
  value: number | null;
  loading: boolean;
  suffix?: string;
}> = ({ label, value, loading, suffix = '' }) => {
  // Logic: Show skeleton if explicitly loading. If loaded but value is null/undefined, show "—"
  const displayValue = value !== null ? value : "—";
  
  return (
    <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-6 flex flex-col justify-center items-start min-h-[140px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors duration-200 hover:bg-gray-50">
      <span className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider mb-2.5">
        {label}
      </span>
      
      {loading ? (
        <Skeleton className="h-9 w-20" />
      ) : (
        <span className="text-4xl font-medium text-gray-900 tracking-tight tabular-nums">
          {displayValue}
          {value !== null && suffix && <span className="text-2xl text-gray-400 ml-1 font-normal">{suffix}</span>}
        </span>
      )}
    </div>
  );
};

const ClinicalDashboard: React.FC<ClinicalDashboardProps> = ({ metrics, loading, onBack }) => {
  return (
    <div className="w-full fade-in-up pb-24">
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors px-1 py-1 rounded-md hover:bg-gray-100/50 -ml-1 group"
        >
          <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Live View
        </button>
      </div>

      <div className="mb-10">
        <h2 className="text-2xl font-medium text-gray-900 tracking-tight">Clinical Dashboard</h2>
        <p className="text-gray-500 text-[15px] mt-1 font-normal">Real-time clinic performance metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <KPICard 
           label="Patients Treated Today" 
           value={metrics.completedToday} 
           loading={metrics.completedToday === null} 
         />
         
         <KPICard 
           label="Patients Waiting" 
           value={metrics.waitingCount} 
           loading={metrics.waitingCount === null} 
         />
         
         <KPICard 
           label="Avg Wait Time (mins)" 
           value={metrics.avgWaitMins} 
           loading={metrics.avgWaitMins === null && loading}
         />
      </div>
    </div>
  );
};

export default ClinicalDashboard;