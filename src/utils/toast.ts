import Swal, { SweetAlertIcon } from 'sweetalert2';

type Opts = Partial<{
  title: string;
  text: string;
  timer: number;
  position: 'top' | 'top-start' | 'top-end' | 'center' | 'center-start' | 'center-end' | 'bottom' | 'bottom-start' | 'bottom-end';
}>;

const base = {
  toast: true,
  position: 'bottom-end' as const,
  timer: 2000,
  showConfirmButton: false,
};

function show(icon: SweetAlertIcon, opts: Opts = {}) {
  return Swal.fire({
    ...base,
    icon,
    title: opts.title,
    text: opts.text,
    timer: opts.timer ?? base.timer,
    position: (opts.position as any) ?? base.position,
  });
}

export const toast = {
  success: (title = 'Success', text?: string, opts?: Opts) => show('success', { title, text, ...opts }),
  error: (title = 'Error', text?: string, opts?: Opts) => show('error', { title, text, ...opts }),
  info: (title = 'Info', text?: string, opts?: Opts) => show('info', { title, text, ...opts }),
  warning: (title = 'Warning', text?: string, opts?: Opts) => show('warning', { title, text, ...opts }),
};
