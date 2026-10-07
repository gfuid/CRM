import { useState } from 'react';
import { Check, CircleCheck, Copy } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui';
import { copyText, signInMessage, signInUrl } from './helpers';

/**
 * Success panel with the sign-in details the owner shares with the employee.
 * The password is only shown here once; it is never stored in the browser.
 */
export default function SignInDetails({ title, name, email, password, companyName, note }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await copyText(signInMessage({ name, email, password, companyName }));
      setCopied(true);
      toast.success('Sign-in details copied');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const rows = [
    { label: 'Sign-in page', value: signInUrl() },
    { label: 'Email', value: email },
    { label: 'Password', value: password, mono: true },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl bg-primary-soft px-4 py-3 text-primary-ink">
        <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-0.5 text-[13px]">Share these details with {name} privately, for example on WhatsApp.</p>
        </div>
      </div>

      <dl className="divide-y divide-line rounded-xl ring-1 ring-inset ring-line">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4">
            <dt className="w-28 shrink-0 text-xs font-semibold text-muted">{r.label}</dt>
            <dd className={`min-w-0 break-all text-sm text-ink ${r.mono ? 'font-mono tracking-wide' : ''}`}>{r.value}</dd>
          </div>
        ))}
      </dl>

      <Button variant="primary" icon={copied ? Check : Copy} onClick={copy} className="w-full sm:w-auto">
        {copied ? 'Copied' : 'Copy details'}
      </Button>

      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}
