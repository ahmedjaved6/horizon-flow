import React from 'react';

const AssignmentPending: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center fade-in-up">
      <h2 className="text-2xl font-medium text-gray-900 tracking-tight">Assignment Pending</h2>
      <p className="mt-2 text-gray-500 font-normal text-lg">Waiting for clinic assignment.</p>
    </div>
  );
};

export default AssignmentPending;