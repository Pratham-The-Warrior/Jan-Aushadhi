import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 px-4 bg-surface text-center">
      <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6 border border-primary/20 clinical-shadow animate-slideUp">
        <FileQuestion className="w-10 h-10 text-primary" />
      </div>
      <h1 className="font-display text-4xl font-bold text-on-surface mb-3 tracking-tight">
        Page Not Found
      </h1>
      <p className="text-on-surface/60 max-w-md mx-auto mb-10 text-lg">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        className="btn-primary py-3 px-8 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Return Home
      </button>
    </div>
  );
}
