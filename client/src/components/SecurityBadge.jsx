import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

export default function SecurityBadge({ severity, size = 'sm' }) {
  const sev = String(severity || 'INFORMATIONAL').toUpperCase();

  const configs = {
    CRITICAL: {
      bg: 'bg-rose-950/60',
      border: 'border-rose-500/40',
      text: 'text-rose-400',
      glow: 'glow-red',
      icon: ShieldAlert,
      label: 'CRITICAL'
    },
    HIGH: {
      bg: 'bg-orange-950/60',
      border: 'border-orange-500/40',
      text: 'text-orange-400',
      glow: 'glow-amber',
      icon: AlertTriangle,
      label: 'HIGH'
    },
    MEDIUM: {
      bg: 'bg-amber-950/60',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      glow: '',
      icon: AlertCircle,
      label: 'MEDIUM'
    },
    LOW: {
      bg: 'bg-blue-950/60',
      border: 'border-blue-500/40',
      text: 'text-blue-400',
      glow: '',
      icon: Info,
      label: 'LOW'
    },
    INFORMATIONAL: {
      bg: 'bg-slate-900/60',
      border: 'border-slate-700/50',
      text: 'text-slate-400',
      glow: '',
      icon: Info,
      label: 'INFO'
    },
    SECURE: {
      bg: 'bg-emerald-950/60',
      border: 'border-emerald-500/40',
      text: 'text-emerald-400',
      glow: 'glow-green',
      icon: CheckCircle,
      label: 'SECURE'
    }
  };

  const config = configs[sev] || configs.INFORMATIONAL;
  const Icon = config.icon;

  const sizeClasses = size === 'xs' 
    ? 'px-1.5 py-0.5 text-[10px]' 
    : size === 'lg' 
    ? 'px-3 py-1.5 text-sm font-semibold' 
    : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 rounded font-mono uppercase tracking-wider border font-medium ${config.bg} ${config.border} ${config.text} ${config.glow} ${sizeClasses}`}>
      <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />
      {config.label}
    </span>
  );
}
