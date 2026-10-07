import { useState } from 'react';
import { Info, KeyRound } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Button, Field, Modal } from '../ui';
import PasswordField from './PasswordField';
import SignInDetails from './SignInDetails';
import { MAX_PASSWORD, MIN_PASSWORD } from './helpers';
import { useBusyDialog } from './useBusyDialog';

/** Owner sets a new password for an employee. Render only while open. */
export default function ResetPasswordModal({ member, companyName, onClose }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { busy: saving, setBusy: setSaving, close } = useBusyDialog(onClose);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters, or click Generate`);
    if (password.length > MAX_PASSWORD) return setError(`Use at most ${MAX_PASSWORD} characters`);
    setError('');
    setSaving(true);
    try {
      await api.resetMemberPassword(member.id, password);
      toast.success(`Password changed for ${member.name}`);
      setDone(true);
    } catch (err) {
      if (err.status === 400) setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={close}
      title={done ? 'Password changed' : `Reset password for ${member.name}`}
      size="md"
      footer={
        done ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="reset-password-form" loading={saving} icon={KeyRound}>
              Change password
            </Button>
          </>
        )
      }
    >
      {done ? (
        <SignInDetails
          title={`${member.name} can sign in with the new password`}
          name={member.name}
          email={member.email}
          password={password}
          companyName={companyName}
          note={member.is_active ? undefined : `${member.name} is deactivated, so they can sign in only after you reactivate them.`}
        />
      ) : (
        <form id="reset-password-form" onSubmit={submit} className="space-y-4" noValidate>
          <div className="flex gap-2 rounded-lg bg-info-soft px-3 py-2.5 text-[13px] text-info-ink">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {member.name} will be signed out on every phone and computer right away. They sign in again with the new password you set
              here.
            </span>
          </div>
          <Field label="New password" error={error} required hint={`At least ${MIN_PASSWORD} characters.`}>
            <PasswordField
              value={password}
              onChange={(v) => {
                setPassword(v);
                if (error) setError('');
              }}
              maxLength={MAX_PASSWORD}
              showCopy
              data-autofocus
            />
          </Field>
        </form>
      )}
    </Modal>
  );
}
