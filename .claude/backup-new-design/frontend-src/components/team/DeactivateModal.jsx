import { useState } from 'react';
import { UserX } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ROLE_LABEL } from '../../lib/constants';
import { Button, Field, Modal, Select } from '../ui';
import { plural } from './helpers';
import { useBusyDialog } from './useBusyDialog';

/** Confirm deactivation, optionally handing their leads and open tasks to someone else. */
export default function DeactivateModal({ member, members, onClose, onDone }) {
  const toast = useToast();
  const { user } = useAuth();
  const [transferTo, setTransferTo] = useState('');
  const { busy: saving, setBusy: setSaving, close } = useBusyDialog(onClose);

  const others = members.filter((m) => m.is_active && m.id !== member.id);
  const firstName = member.name.split(/\s+/)[0] || member.name;

  const confirm = async () => {
    setSaving(true);
    try {
      const res = await api.deactivateMember(member.id, transferTo || undefined);
      const moved = res?.transferred;
      toast.success(
        moved?.to
          ? `${member.name} is deactivated. ${plural(moved.leads, 'lead')} and ${plural(moved.tasks, 'task')} moved to ${moved.to}.`
          : `${member.name} is deactivated and can no longer sign in.`
      );
      onDone(res?.member);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={close}
      title={`Deactivate ${member.name}?`}
      size="md"
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="danger" icon={UserX} onClick={confirm} loading={saving}>
            Deactivate
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted marker:text-faint">
          <li>{firstName} is signed out on every device right away and cannot sign in.</li>
          <li>Their leads, tasks and history stay in the CRM. Nothing is deleted.</li>
          <li>Their seat becomes free. You can reactivate them later if a seat is free.</li>
        </ul>

        {others.length > 0 ? (
          <Field
            label="Give their leads and open tasks to"
            hint={
              member.open_leads > 0
                ? `${firstName} has ${plural(member.open_leads, 'open lead')}. Hand them over so nothing is missed.`
                : 'Optional. Leave as it is to keep them assigned to this person.'
            }
          >
            <Select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} data-autofocus>
              <option value="">{`Nobody, keep them with ${firstName}`}</option>
              {others.map((m) => (
                <option key={m.id} value={m.id}>
                  {`${m.id === user?.id ? `${m.name} (you)` : m.name} · ${ROLE_LABEL[m.role] || 'Employee'}`}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <p className="text-[13px] text-muted">There is no other active person to hand their leads to, so they stay assigned to {firstName}.</p>
        )}
      </div>
    </Modal>
  );
}
