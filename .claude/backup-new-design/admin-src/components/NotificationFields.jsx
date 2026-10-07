import { Field, Input, Segmented, Select, Textarea } from './ui';
import { AUDIENCES, NOTIFICATION_TYPES } from '../lib/constants';

export const TITLE_MAX = 120;
export const MESSAGE_MAX = 2000;

export const emptyNotification = () => ({ audience: 'owners', type: 'info', title: '', message: '' });

/** Returns field errors for a notification draft (empty object when valid). */
export function validateNotification(v) {
  const errors = {};
  if (!v.title.trim()) errors.title = 'Enter a title.';
  else if (v.title.trim().length > TITLE_MAX) errors.title = `Keep the title under ${TITLE_MAX} characters.`;
  if (!v.message.trim()) errors.message = 'Enter a message.';
  else if (v.message.trim().length > MESSAGE_MAX) errors.message = `Keep the message under ${MESSAGE_MAX} characters.`;
  return errors;
}

/** Audience, type, title and message inputs for an announcement. */
export default function NotificationFields({ value, onChange, errors = {} }) {
  const set = (key) => (val) => onChange({ ...value, [key]: val });
  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          Who should see it
        </span>
        <Segmented value={value.audience} onChange={set('audience')} options={AUDIENCES} label="Who should see it" />
        <p className="mt-1 text-xs text-muted">
          {value.audience === 'owners' ? 'Only company owners see this in their CRM.' : 'The owner and every employee see this in their CRM.'}
        </p>
      </div>
      <Field label="Type" hint="Sets the icon and colour people see.">
        <Select value={value.type} onChange={(e) => set('type')(e.target.value)} options={NOTIFICATION_TYPES} />
      </Field>
      <Field label="Title" required error={errors.title} hint={`${value.title.length}/${TITLE_MAX} characters`}>
        <Input value={value.title} onChange={(e) => set('title')(e.target.value)} maxLength={TITLE_MAX} />
      </Field>
      <Field label="Message" required error={errors.message} hint={`${value.message.length}/${MESSAGE_MAX} characters`}>
        <Textarea value={value.message} onChange={(e) => set('message')(e.target.value)} rows={5} maxLength={MESSAGE_MAX} />
      </Field>
    </div>
  );
}
