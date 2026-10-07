import { useState } from 'react';
import { TriangleAlert, UserPlus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Button, Field, Input, Modal } from '../ui';
import { DesignationField, RoleChoice } from './MemberFields';
import PasswordField from './PasswordField';
import SignInDetails from './SignInDetails';
import { EMAIL_RE, MAX_PASSWORD, MIN_PASSWORD } from './helpers';
import { useBusyDialog } from './useBusyDialog';

const EMPTY = { name: '', email: '', phone: '', role: 'agent', designation: '', password: '' };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Enter their name';
  if (!form.email.trim()) errors.email = 'Enter their email address';
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'This email address does not look right';
  if (form.password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters, or click Generate`;
  else if (form.password.length > MAX_PASSWORD) errors.password = `Use at most ${MAX_PASSWORD} characters`;
  return errors;
}

/**
 * Owner adds an employee with an initial password, then sees the sign-in details to share.
 * Render it only while open, so every opening starts with an empty form.
 */
export default function AddMemberModal({ onClose, onAdded, designations, companyName, canAddMore }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [seatMessage, setSeatMessage] = useState('');
  const { busy: saving, setBusy: setSaving, close } = useBusyDialog(onClose);
  const [created, setCreated] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setSeatMessage('');
    try {
      const member = await api.addMember({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        designation: form.designation.trim(),
        password: form.password,
      });
      setCreated({ name: member.name, email: member.email, password: form.password });
      toast.success(`${member.name} can now sign in`);
      onAdded(member);
    } catch (err) {
      if (err.status === 409) setErrors({ email: err.message });
      else if (err.status === 402) setSeatMessage(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addAnother = () => {
    setForm(EMPTY);
    setErrors({});
    setSeatMessage('');
    setCreated(null);
    setFormKey((k) => k + 1);
  };

  return (
    <Modal
      open
      onClose={close}
      title={created ? 'Employee added' : 'Add employee'}
      description={created ? undefined : 'They sign in with the email and password you set here.'}
      size="lg"
      footer={
        created ? (
          <>
            {canAddMore && (
              <Button icon={UserPlus} onClick={addAnother}>
                Add another
              </Button>
            )}
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="add-member-form" loading={saving} icon={UserPlus}>
              Add employee
            </Button>
          </>
        )
      }
    >
      {created ? (
        <SignInDetails
          title={`${created.name} can now sign in`}
          name={created.name}
          email={created.email}
          password={created.password}
          companyName={companyName}
          note="For safety, this password is shown only now. If it gets lost, use Reset password from the team list."
        />
      ) : (
        <form key={formKey} id="add-member-form" onSubmit={submit} className="space-y-4" noValidate>
          {seatMessage && (
            <div role="alert" className="flex gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] text-danger-ink">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{seatMessage}</span>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.name} required>
              <Input value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={80} autoComplete="off" data-autofocus />
            </Field>
            <Field label="Email" error={errors.email} required hint="They use this to sign in.">
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

          <RoleChoice value={form.role} onChange={set('role')} hint="You can fine-tune what they can do later, from Edit." />

          <Field
            label="Initial password"
            error={errors.password}
            required
            hint={`At least ${MIN_PASSWORD} characters. You will share it with them, and they can change it later.`}
          >
            <PasswordField value={form.password} onChange={set('password')} maxLength={MAX_PASSWORD} />
          </Field>
        </form>
      )}
    </Modal>
  );
}
