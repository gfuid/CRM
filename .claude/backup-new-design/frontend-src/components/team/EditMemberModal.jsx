import { useId, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { PERMISSION_INFO, ROLE_LABEL } from '../../lib/constants';
import { Avatar, Badge, Button, Field, Input, Modal, Segmented, Switch } from '../ui';
import { DesignationField, RoleChoice } from './MemberFields';
import { EMAIL_RE, cleanOverrides, effectivePermission, sameOverrides } from './helpers';
import { useBusyDialog } from './useBusyDialog';

/** Extra plain-language notes for a few permissions. */
const PERMISSION_NOTE = {
  leads_export: 'Lets them download a file with every lead they can see. Give this only to people you trust.',
  leads_delete: 'Deleted leads go to the trash. Only you can restore them or delete them forever.',
  team_reports: 'Shows what each person did each day: calls, emails and follow-ups.',
};

function PermissionLabel({ info, custom }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span>{info.label}</span>
      {info.risky && <Badge tone="amber">Sensitive</Badge>}
      {custom && <Badge tone="info">Changed</Badge>}
    </span>
  );
}

function ChoicePermission({ info, value, onChange, custom }) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div id={labelId} className="min-w-0 text-sm font-medium text-ink">
        <PermissionLabel info={info} custom={custom} />
        {PERMISSION_NOTE[info.key] && <span className="block text-xs font-normal text-muted">{PERMISSION_NOTE[info.key]}</span>}
      </div>
      <Segmented value={value} onChange={onChange} options={info.options} size="sm" className="shrink-0 self-start sm:self-auto" />
    </div>
  );
}

/** Owner edits an employee's details, role and permissions. Render only while open. */
export default function EditMemberModal({ member, roleDefaults, designations, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: member.name || '',
    email: member.email || '',
    phone: member.phone || '',
    designation: member.designation || '',
    role: member.role === 'manager' ? 'manager' : 'agent',
  });
  const [overrides, setOverrides] = useState(() => ({ ...(member.permission_overrides || {}) }));
  const [errors, setErrors] = useState({});
  const { busy: saving, setBusy: setSaving, close } = useBusyDialog(onClose);

  const defaults = roleDefaults?.[form.role] || {};
  const customKeys = Object.keys(cleanOverrides(overrides, defaults)).filter((k) => PERMISSION_INFO.some((p) => p.key === k));

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setPermission = (key, value) =>
    setOverrides((o) => {
      const next = { ...o };
      if (defaults[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Enter their name';
    if (!form.email.trim()) errs.email = 'Enter their email address';
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = 'This email address does not look right';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      designation: form.designation.trim(),
      role: form.role,
    };
    // Send permissions only when they really changed, so the activity log does not record a change that did not happen
    const permissions = cleanOverrides(overrides, defaults);
    if (!sameOverrides(permissions, member.permission_overrides)) payload.permissions = permissions;

    setSaving(true);
    try {
      const updated = await api.updateMember(member.id, payload);
      toast.success(`Saved changes for ${updated?.name || form.name.trim()}`);
      onSaved(updated);
      onClose();
    } catch (err) {
      if (err.status === 409) setErrors({ email: err.message });
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={close}
      title={`Edit ${member.name}`}
      description={`${ROLE_LABEL[member.role] || 'Employee'}${member.is_active ? '' : ' · Deactivated'}`}
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="edit-member-form" loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-member-form" onSubmit={submit} className="space-y-6" noValidate>
        <section className="space-y-4" aria-labelledby="edit-member-details">
          <div className="flex items-center gap-3">
            <Avatar name={form.name || member.name} size={36} />
            <h3 id="edit-member-details" className="text-sm font-bold text-ink">
              Details
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.name} required>
              <Input value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={80} autoComplete="off" />
            </Field>
            <Field label="Email" error={errors.email} required hint="Changing it changes the email they sign in with.">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email')(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                inputMode="email"
              />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set('phone')(e.target.value)} maxLength={30} inputMode="tel" autoComplete="off" />
            </Field>
            <DesignationField value={form.designation} onChange={set('designation')} options={designations} />
          </div>
        </section>

        <section className="border-t border-line pt-5">
          <RoleChoice value={form.role} onChange={set('role')} hint="Changing the role changes the starting permissions below." />
        </section>

        <section className="border-t border-line pt-5" aria-labelledby="edit-member-permissions">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 id="edit-member-permissions" className="text-sm font-bold text-ink">
                What they can do
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                {customKeys.length
                  ? `${customKeys.length} ${customKeys.length === 1 ? 'setting is' : 'settings are'} different from the usual ${ROLE_LABEL[form.role]} access.`
                  : `Using the usual ${ROLE_LABEL[form.role]} access.`}
              </p>
            </div>
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => setOverrides({})} disabled={!Object.keys(overrides).length}>
              Reset to role defaults
            </Button>
          </div>
          <ul className="divide-y divide-line rounded-xl ring-1 ring-inset ring-line">
            {PERMISSION_INFO.map((info) => {
              const value = effectivePermission(info.key, overrides, defaults);
              const custom = customKeys.includes(info.key);
              return (
                <li key={info.key} className="px-4 py-3">
                  {info.type === 'choice' ? (
                    <ChoicePermission info={info} value={value} custom={custom} onChange={(v) => setPermission(info.key, v)} />
                  ) : (
                    <Switch
                      checked={value === true}
                      onChange={(v) => setPermission(info.key, v)}
                      label={<PermissionLabel info={info} custom={custom} />}
                      description={PERMISSION_NOTE[info.key]}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">Managing employees, settings, the trash and the activity log always stay with you, the owner.</p>
        </section>
      </form>
    </Modal>
  );
}
