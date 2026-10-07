import { useMemo, useState } from 'react';
import { UserPlus, UsersRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { loadMembers, useAsync } from '../lib/hooks';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui';
import { SeatCard } from '../components/team/billing';
import MemberList from '../components/team/MemberList';
import AddMemberModal from '../components/team/AddMemberModal';
import EditMemberModal from '../components/team/EditMemberModal';
import ResetPasswordModal from '../components/team/ResetPasswordModal';
import DeactivateModal from '../components/team/DeactivateModal';
import { plural, sortMembers } from '../components/team/helpers';

// Assignee pickers elsewhere use a shared, cached member list; refresh it after team changes
const refreshMemberCache = () =>
  loadMembers(true).catch((err) => console.warn('[team] could not refresh the shared member list', err));

function TeamSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading team">
      <Skeleton className="h-52" />
      <Skeleton className="h-72" />
    </div>
  );
}

/** Owner-only: seats, employees, roles and permissions. */
export default function TeamPage() {
  const { user, company } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.team(), []);
  const [dialog, setDialog] = useState(null); // { type: 'add' | 'edit' | 'password' | 'deactivate', member? }
  const [busyId, setBusyId] = useState(null);

  const members = useMemo(() => sortMembers(data?.members || []), [data]);
  const billing = data?.billing;
  const staff = members.filter((m) => m.role !== 'owner');
  const activeStaff = staff.filter((m) => m.is_active).length;
  const noSeats = Boolean(billing) && billing.seats_available <= 0;
  const designations = company?.settings?.designations || [];

  // Re-read seats and members after any change (Add another stays accurate once this returns)
  const afterChange = () => {
    refreshMemberCache();
    return reload({ quiet: true });
  };

  const activate = async (member) => {
    setBusyId(member.id);
    try {
      await api.activateMember(member.id);
      toast.success(`${member.name} can sign in again`);
      afterChange();
    } catch (err) {
      // 402: no free seat. The server message says what to do.
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const onAction = (type, member) => {
    if (type === 'activate') activate(member);
    else setDialog({ type, member });
  };

  const closeDialog = () => setDialog(null);

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Team" description="Add employees, choose what they can do, and keep track of your seats." />
        <TeamSkeleton />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Team"
        description="Add employees, choose what they can do, and keep track of your seats."
        actions={
          <div className="flex w-full flex-col gap-1 sm:w-auto sm:items-end">
            <Button
              variant="primary"
              size="lg"
              icon={UserPlus}
              onClick={() => setDialog({ type: 'add' })}
              disabled={!billing || noSeats}
              aria-describedby={noSeats ? 'team-no-seats' : undefined}
              className="w-full sm:w-auto"
            >
              Add employee
            </Button>
            {noSeats && (
              <p id="team-no-seats" className="text-xs text-muted sm:text-right">
                All seats are in use. Contact your account manager for more seats.
              </p>
            )}
          </div>
        }
      />

      {error && !data ? (
        <ErrorState message={error.message} onRetry={() => reload()} />
      ) : (
        <div className="space-y-5">
          {billing && <SeatCard billing={billing} />}

          <section aria-labelledby="team-members-title" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="team-members-title" className="text-[15px] font-bold text-ink">
                People
              </h2>
              <p className="text-[13px] text-muted">
                {plural(activeStaff, 'active employee')}
                {staff.length > activeStaff ? ` · ${staff.length - activeStaff} deactivated` : ''}
              </p>
            </div>

            {error && <ErrorState message={error.message} onRetry={() => reload()} />}

            <MemberList members={members} currentUserId={user?.id} busyId={busyId} onAction={onAction} />

            {staff.length === 0 && (
              <Card>
                <EmptyState
                  icon={UsersRound}
                  title="No employees yet"
                  message="Add your sales staff and managers so they can sign in, work on leads and log their calls."
                  action={
                    !noSeats && billing ? (
                      <Button variant="primary" icon={UserPlus} onClick={() => setDialog({ type: 'add' })}>
                        Add your first employee
                      </Button>
                    ) : null
                  }
                />
              </Card>
            )}
          </section>
        </div>
      )}

      {dialog?.type === 'add' && (
        <AddMemberModal
          onClose={closeDialog}
          onAdded={afterChange}
          designations={designations}
          companyName={company?.name}
          canAddMore={Boolean(billing) && billing.seats_available > 0}
        />
      )}
      {dialog?.type === 'edit' && (
        <EditMemberModal
          member={dialog.member}
          roleDefaults={data?.role_defaults}
          designations={designations}
          onClose={closeDialog}
          onSaved={afterChange}
        />
      )}
      {dialog?.type === 'password' && <ResetPasswordModal member={dialog.member} companyName={company?.name} onClose={closeDialog} />}
      {dialog?.type === 'deactivate' && (
        <DeactivateModal member={dialog.member} members={members} onClose={closeDialog} onDone={afterChange} />
      )}
    </>
  );
}
