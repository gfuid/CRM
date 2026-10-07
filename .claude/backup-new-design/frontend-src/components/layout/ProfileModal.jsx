import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, tokenStore } from '../../lib/api';
import { ROLE_LABEL } from '../../lib/constants';
import { Button, Field, Input, Modal, PasswordInput } from '../ui';

export default function ProfileModal({ open, onClose }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      setForm({ name: user.name || '', phone: user.phone || '' });
      setPw({ current: '', next: '', confirm: '' });
      setErrors({});
    }
  }, [open, user]);

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Enter your name';
    const changingPw = pw.current || pw.next || pw.confirm;
    if (changingPw) {
      if (!pw.current) errs.current = 'Enter your current password';
      if (pw.next.length < 6) errs.next = 'Use at least 6 characters';
      else if (pw.next !== pw.confirm) errs.confirm = 'Passwords don’t match';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const body = { name: form.name.trim(), phone: form.phone.trim() };
      if (changingPw) Object.assign(body, { current_password: pw.current, new_password: pw.next });
      const res = await api.updateProfile(body);
      if (res.token) tokenStore.set(res.token);
      setUser(res.user);
      toast.success(changingPw ? 'Password changed. Other devices have been signed out.' : 'Profile saved');
      onClose();
    } catch (err) {
      if (/current password/i.test(err.message)) setErrors({ current: err.message });
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your profile"
      description={`${user?.email} · ${ROLE_LABEL[user?.role] || ''}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="profile-form" loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <form id="profile-form" onSubmit={save} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name} required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" inputMode="tel" />
          </Field>
        </div>
        <div className="border-t border-line pt-4">
          <h3 className="text-sm font-bold text-ink">Change password</h3>
          <p className="mb-3 text-xs text-muted">Leave empty to keep your current password.</p>
          <div className="space-y-3">
            <Field label="Current password" error={errors.current}>
              <PasswordInput value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="New password" error={errors.next}>
                <PasswordInput value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
              </Field>
              <Field label="Confirm new password" error={errors.confirm}>
                <PasswordInput value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
              </Field>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
