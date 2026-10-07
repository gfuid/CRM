import { useEffect, useId, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { ACTIVITY_TYPES, STAGES } from '../../lib/constants';
import { localToday } from '../../lib/format';
import { Button, Field, Input, Select, Textarea } from '../ui';
import { QuickDateButtons } from './LeadBits';
import { followUpBucket, iconByName } from './leadUtils';

/**
 * Log a call / WhatsApp / email etc. on a lead, set the next follow-up and optionally move the stage.
 * Calls onLogged({ activity, lead }, { stageChanged }) after the server confirms.
 */
export default function ActivityComposer({ lead, onLogged, autoFocus = false, canChangeStage = false }) {
  const toast = useToast();
  const typeLabelId = useId();
  const noteRef = useRef(null);
  const leadDate = (lead.follow_up_date || '').slice(0, 10);

  const [type, setType] = useState('call_initiated');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(leadDate);
  const [prevLeadDate, setPrevLeadDate] = useState(leadDate);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Follow the lead's saved follow-up date when it changes elsewhere (edit, stage change)
  if (leadDate !== prevLeadDate) {
    setPrevLeadDate(leadDate);
    setDate(leadDate);
  }

  useEffect(() => {
    if (autoFocus) noteRef.current?.focus();
  }, [autoFocus]);

  const bucket = followUpBucket(lead, localToday());
  const needsNewDate = date === leadDate && (bucket === 'overdue' || bucket === 'today');

  const submit = async (e) => {
    e.preventDefault();
    if (type === 'note' && !note.trim()) {
      setError('Write the note first');
      noteRef.current?.focus();
      return;
    }
    setError('');
    const body = { type, note: note.trim() };
    if (date !== leadDate) body.next_follow_up_date = date;
    if (stage && stage !== lead.stage) body.stage = stage;
    setSaving(true);
    try {
      const res = await api.logActivity(lead.id, body);
      onLogged?.(res, { stageChanged: Boolean(body.stage) });
      toast.success(body.stage ? `Activity logged and moved to ${body.stage}` : 'Activity logged');
      setNote('');
      setStage('');
    } catch (err) {
      toast.error(`Couldn’t log the activity. ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-subtle/60 p-3 ring-1 ring-inset ring-line sm:p-4" noValidate>
      <div id={typeLabelId} className="mb-2 text-[13px] font-semibold text-ink">
        What did you do?
      </div>
      <div role="radiogroup" aria-labelledby={typeLabelId} className="flex flex-wrap gap-1.5">
        {ACTIVITY_TYPES.map((t) => {
          const Icon = iconByName(t.icon);
          const active = t.key === type;
          return (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setType(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors ${
                active ? 'bg-primary text-white ring-primary' : 'bg-surface text-muted ring-line hover:bg-subtle hover:text-ink'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      <Field label="Note" error={error} className="mt-3">
        <Textarea
          ref={noteRef}
          rows={3}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            if (error) setError('');
          }}
          maxLength={3000}
          placeholder="What was discussed? What happens next?"
        />
      </Field>

      <div className={`mt-3 grid gap-3 ${canChangeStage ? 'sm:grid-cols-2' : ''}`}>
        <div>
          <Field label="Next follow-up" hint={needsNewDate ? undefined : leadDate && date === '' ? 'The follow-up date will be removed.' : undefined}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <QuickDateButtons value={date} onPick={setDate} onClear={() => setDate('')} />
          {needsNewDate && (
            <p className={`mt-1.5 text-xs font-medium ${bucket === 'overdue' ? 'text-danger' : 'text-warning-ink'}`}>
              {bucket === 'overdue' ? 'This follow-up is overdue.' : 'This follow-up is due today.'} Pick the next date.
            </p>
          )}
        </div>
        {canChangeStage && (
          <Field label="Move to stage (optional)">
            <Select value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Keep current stage">
              {STAGES.filter((s) => s.key !== lead.stage).map((s) => (
                <option key={s.key} value={s.key}>
                  {s.key}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <Button type="submit" variant="primary" icon={Send} loading={saving}>
          Log activity
        </Button>
      </div>
    </form>
  );
}
