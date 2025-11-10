import React from 'react';

// Reusable feature list for auth/onboarding pages
// Renders a responsive grid (1 col on mobile, 2 on >=sm) of short value props.

type Feature = {
  icon: React.ReactNode;
  title: string;
  desc: string;
};

const FeatureItem = ({ icon, title, desc }: Feature) => (
  <div className="flex items-center gap-3">
    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center" aria-hidden="true">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-white/80">{desc}</p>
    </div>
  </div>
);

const IconShield = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 5-3.5 9-7 9s-7-4-7-9V7l7-4z" />
  </svg>
);

const IconBolt = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const IconLayers = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l9 5-9 5-9-5 9-5zm0 8l9 5-9 5-9-5 9-5z" />
  </svg>
);

const IconLock = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 10-8 0v4M5 11h14v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8z" />
  </svg>
);

const IconChart = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3v18m8-8H3m5-5v6m5-9v9m5-6v6" />
  </svg>
);

export default function PlatformFeatures() {
  const items: Feature[] = [
    { icon: IconShield, title: 'Secure & Compliant', desc: 'Multi-factor authentication enabled' },
    { icon: IconBolt, title: 'Fast & Efficient', desc: 'Real-time processing & updates' },
    { icon: IconLayers, title: 'Modular & Extensible', desc: 'Built for PMS, Innovation, and future modules' },
    { icon: IconLock, title: 'Role-Based Access', desc: 'Granular permissions for teams and approvers' },
    { icon: IconChart, title: 'Analytics Ready', desc: 'Dashboards and insights across modules' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((f, idx) => (
        <FeatureItem key={idx} {...f} />
      ))}
    </div>
  );
}
