import { useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { PRIORITIES, STAGES } from '../../lib/constants';
import { useRouter } from '../../lib/router';
import { Button, Field, IconButton, Input, Modal, Select, Textarea } from '../ui';
import { QuickDateButtons } from './LeadBits';
import { COUNTRIES, CURRENCIES, QUANTITY_UNITS, useTeamMembers } from './leadUtils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADD_SOURCE = '__add_source__';
const NUMBER_FIELDS = ['quantity', 'price', 'value'];
const MORE_FIELDS = ['incoterm', 'payment_terms', 'port_delivery', 'website', 'address', 'industry_type', 'credit_rating', 'turnover', 'notes'];
const MAX_CONTACTS = 20;

const str = (v) => (v === undefined || v === null ? '' : String(v));
const num = (v) => (String(v).trim() === '' ? null : Number(v));
const round2 = (n) => Math.round(n * 100) / 100;
const emptyContact = () => ({ name: '', designation: '', phone: '', email: '' });
const sameText = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

/** Uses the company list's spelling for each product ("turmeric" -> "Turmeric") and drops case-only duplicates. */
const canonicalProducts = (products, options) => {
  const out = [];
  for (const p of products) {
    const name = options.find((o) => sameText(o, p)) || p;
    if (!out.some((x) => sameText(x, name))) out.push(name);
  }
  return out;
};

const initialForm = (lead, settings, userId) => {
  const qty = str(lead?.quantity);
  const price = str(lead?.price);
  const value = str(lead?.value);
  const auto = qty && price ? String(round2(Number(qty) * Number(price))) : '';
  return {
    name: str(lead?.name),
    contact_person: str(lead?.contact_person),
    phone: str(lead?.phone),
    whatsapp: str(lead?.whatsapp),
    whatsappSame: lead ? Boolean(lead.whatsapp) && lead.whatsapp === lead.phone : true,
    email: str(lead?.email),
    country: str(lead?.country),
    source: str(lead?.source),
    products: canonicalProducts(lead?.products || [], settings.commodities || []),
    quantity: qty,
    quantity_unit: lead?.quantity_unit || 'MT',
    price,
    value,
    valueTouched: Boolean(value) && value !== auto,
    currency: lead?.currency || settings.currency || 'INR',
    stage: lead?.stage || 'Lead Generation',
    priority: lead?.priority || 'Medium',
    expected_close_date: str(lead?.expected_close_date).slice(0, 10),
    follow_up_date: str(lead?.follow_up_date).slice(0, 10),
    incoterm: str(lead?.incoterm),
    payment_terms: str(lead?.payment_terms),
    port_delivery: str(lead?.port_delivery),
    website: str(lead?.website),
    address: str(lead?.address),
    industry_type: str(lead?.industry_type),
    credit_rating: str(lead?.credit_rating),
    turnover: str(lead?.turnover),
    notes: str(lead?.notes),
    // Keep any extra contact fields (WhatsApp, LinkedIn) so editing never drops them
    contacts: (lead?.contacts || []).map((c) => ({ ...emptyContact(), ...c })),
    assigned_to: lead?.assigned_to || userId,
  };
};

/** One normalised shape for both create and the edit diff. */
const toPayload = (f) => ({
  name: f.name.trim(),
  contact_person: f.contact_person.trim(),
  phone: f.phone.trim(),
  whatsapp: (f.whatsappSame ? f.phone : f.whatsapp).trim(),
  email: f.email.trim().toLowerCase(),
  country: f.country.trim(),
  source: f.source,
  products: f.products,
  quantity: num(f.quantity),
  quantity_unit: f.quantity.trim() ? f.quantity_unit : '',
  price: num(f.price),
  value: num(f.value),
  currency: f.currency,
  stage: f.stage,
  priority: f.priority,
  expected_close_date: f.expected_close_date,
  follow_up_date: f.follow_up_date,
  incoterm: f.incoterm,
  payment_terms: f.payment_terms,
  port_delivery: f.port_delivery.trim(),
  website: f.website.trim(),
  address: f.address.trim(),
  industry_type: f.industry_type.trim(),
  credit_rating: f.credit_rating.trim(),
  turnover: f.turnover.trim(),
  notes: f.notes.trim(),
  contacts: f.contacts
    .map((c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])))
    .filter((c) => Object.values(c).some(Boolean)),
});

const isEmpty = (v) => v === null || v === '' || (Array.isArray(v) && v.length === 0);

const validate = (f, initial) => {
  const errs = {};
  if (!f.name.trim()) errs.name = 'Enter the company name';
  if (f.email.trim() && !EMAIL_RE.test(f.email.trim())) errs.email = 'Enter a valid email address, like name@company.com';
  for (const k of NUMBER_FIELDS) {
    const raw = String(f[k]).trim();
    if (raw === '') {
      if (initial && String(initial[k]).trim() !== '') errs[k] = 'To remove this number, enter 0';
    } else if (!Number.isFinite(Number(raw)) || Number(raw) < 0) {
      errs[k] = 'Enter a number that is 0 or more';
    }
  }
  f.contacts.forEach((c, i) => {
    if (c.email && !EMAIL_RE.test(c.email.trim())) errs[`contact_${i}`] = 'This contact’s email is not valid';
  });
  return errs;
};

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function ProductPicker({ value, options, onToggle, onAdd, adding, canAdd }) {
  const [draft, setDraft] = useState('');
  const legendId = useId();
  const all = [...options, ...value.filter((p) => !options.some((o) => sameText(o, p)))];
  const add = async () => {
    const v = draft.trim();
    if (!v) return;
    const ok = await onAdd(v);
    if (ok) setDraft('');
  };
  return (
    <div>
      <div id={legendId} className="mb-1.5 text-[13px] font-semibold text-ink">
        Products
      </div>
      {all.length > 0 ? (
        <div role="group" aria-labelledby={legendId} className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {all.map((p) => {
            const on = value.some((v) => sameText(v, p));
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(p)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors ${
                  on ? 'bg-primary-soft text-primary-ink ring-primary/40' : 'bg-surface text-muted ring-line hover:bg-subtle hover:text-ink'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted">
          {canAdd ? 'No products in your list yet. Add one below.' : 'Your company has no products in its list yet. Ask the owner to add them.'}
        </p>
      )}
      {canAdd && (
        <div className="mt-2 flex items-end gap-2">
          <Field label="Add a product that is not listed" className="flex-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="Product name"
              maxLength={120}
            />
          </Field>
          <Button icon={Plus} onClick={add} loading={adding} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

function LeadForm({ lead, onClose, onSaved, onOpenLead }) {
  const { user, company, can, isOwner, setCompany } = useAuth();
  const toast = useToast();
  const { navigate } = useRouter();
  const members = useTeamMembers();
  const settings = company?.settings || {};
  const editing = Boolean(lead);
  const canReassign = can('leads_reassign');
  // POST /company/lists/:list is open to the owner and to people who can add leads
  const canAddToLists = isOwner || can('leads_create');
  const formRef = useRef(null);
  const countryListId = useId();
  const moreId = useId();

  const initial = useMemo(() => initialForm(lead, settings, user?.id), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dup, setDup] = useState(null);
  const [more, setMore] = useState(() => editing && (MORE_FIELDS.some((k) => initial[k]) || initial.contacts.length > 0));
  const [addingSource, setAddingSource] = useState(false);
  const [sourceDraft, setSourceDraft] = useState('');
  const [listBusy, setListBusy] = useState('');

  const set = (patch) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      // Deal value follows quantity × price until the user types their own value
      if (!next.valueTouched && ('quantity' in patch || 'price' in patch)) {
        const q = Number(next.quantity);
        const p = Number(next.price);
        next.value = String(next.quantity).trim() && String(next.price).trim() && Number.isFinite(q) && Number.isFinite(p) ? String(round2(q * p)) : '';
      }
      return next;
    });
    const keys = Object.keys(patch);
    const clears = (k) => keys.includes(k) || (k.startsWith('contact_') && keys.includes('contacts'));
    if (Object.keys(errors).some(clears)) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !clears(k))));
    if (dup && keys.some((k) => ['name', 'email', 'phone'].includes(k))) setDup(null);
  };

  const sourceOptions = useMemo(() => {
    const list = settings.lead_sources || [];
    return form.source && !list.includes(form.source) ? [...list, form.source] : list;
  }, [settings.lead_sources, form.source]);

  const currencyOptions = useMemo(() => {
    const list = [...CURRENCIES];
    for (const c of [settings.currency, form.currency]) if (c && !list.includes(c)) list.unshift(c);
    return list;
  }, [settings.currency, form.currency]);

  const unitOptions = QUANTITY_UNITS.includes(form.quantity_unit) ? QUANTITY_UNITS : [...QUANTITY_UNITS, form.quantity_unit];

  const assignOptions = useMemo(() => {
    const active = members.filter((m) => m.is_active !== false);
    const current = members.find((m) => m.id === form.assigned_to);
    const list = current && current.is_active === false ? [...active, current] : active;
    return list.map((m) => ({ value: m.id, label: `${m.name}${m.id === user?.id ? ' (you)' : ''}${m.is_active === false ? ' (inactive)' : ''}` }));
  }, [members, form.assigned_to, user?.id]);

  /** Adds a value to a company dropdown list and refreshes the cached company settings. */
  const addToList = async (list, value) => {
    setListBusy(list);
    try {
      const res = await api.addListItem(list, value);
      setCompany((c) => (c ? { ...c, settings: { ...(c.settings || {}), [list]: res.items } } : c));
      const match = res.items.find((v) => v.toLowerCase() === value.toLowerCase()) || value;
      return match;
    } catch (err) {
      toast.error(`Couldn’t add “${value}”. ${err.message}`);
      return null;
    } finally {
      setListBusy('');
    }
  };

  const addProduct = async (value) => {
    const existing = [...(settings.commodities || []), ...form.products].find((p) => p.toLowerCase() === value.toLowerCase());
    const name = existing || (await addToList('commodities', value));
    if (!name) return false;
    setForm((f) => (f.products.some((p) => sameText(p, name)) ? f : { ...f, products: [...f.products, name] }));
    if (!existing) toast.success(`Added “${name}” to your products`);
    return true;
  };

  const addSource = async () => {
    const v = sourceDraft.trim();
    if (!v) return;
    const name = await addToList('lead_sources', v);
    if (!name) return;
    set({ source: name });
    setAddingSource(false);
    setSourceDraft('');
    toast.success(`Added “${name}” to your lead sources`);
  };

  const openLead = (id) => {
    if (onOpenLead) onOpenLead(id);
    else navigate(`/app/leads?lead=${encodeURIComponent(id)}`);
  };

  const focusFirstError = () => {
    setTimeout(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus(), 0);
  };

  const submit = async (e, { allowDuplicate = false } = {}) => {
    e?.preventDefault();
    const errs = validate(form, editing ? initial : null);
    setErrors(errs);
    if (Object.keys(errs).length) {
      if (Object.keys(errs).some((k) => k.startsWith('contact_'))) setMore(true);
      focusFirstError();
      return;
    }
    setSaving(true);
    try {
      let saved;
      if (editing) {
        const before = toPayload(initial);
        const after = toPayload(form);
        const changes = {};
        for (const k of Object.keys(after)) {
          if (JSON.stringify(after[k]) !== JSON.stringify(before[k]) && after[k] !== null) changes[k] = after[k];
        }
        if (canReassign && form.assigned_to && form.assigned_to !== initial.assigned_to) changes.assigned_to = form.assigned_to;
        if (!Object.keys(changes).length) {
          toast.info('No changes to save');
          onClose();
          return;
        }
        saved = await api.updateLead(lead.id, changes);
        toast.success('Lead updated');
      } else {
        const body = Object.fromEntries(Object.entries(toPayload(form)).filter(([, v]) => !isEmpty(v)));
        if (canReassign && form.assigned_to) body.assigned_to = form.assigned_to;
        if (allowDuplicate) body.allow_duplicate = true;
        saved = await api.createLead(body);
        toast.success(`Added “${saved.name}”`, { action: { label: 'Open', onClick: () => openLead(saved.id) } });
      }
      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (err.status === 409 && err.errors?.duplicate) {
        setDup(err.errors.duplicate);
        setTimeout(() => formRef.current?.querySelector('[data-duplicate]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);
      } else {
        toast.error(err.message || 'Couldn’t save the lead');
      }
    } finally {
      setSaving(false);
    }
  };

  const contactsSet = (i, patch) => set({ contacts: form.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  return (
    <Modal
      open
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Edit lead' : 'New lead'}
      description={editing ? lead.name : 'Only the company name is required. You can fill in the rest later.'}
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="lead-form" loading={saving}>
            {editing ? 'Save changes' : 'Add lead'}
          </Button>
        </>
      }
    >
      <form id="lead-form" ref={formRef} onSubmit={submit} noValidate className="space-y-6">
        {dup && (
          <div data-duplicate role="alert" className="rounded-lg bg-warning-soft p-3 text-sm text-warning-ink ring-1 ring-inset ring-warning/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold">This looks like a lead you already have: “{dup.name}”.</p>
                <p className="mt-0.5 text-[13px]">It is assigned to {dup.assigned_name || 'someone on your team'}.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openLead(dup.id)}>
                    Open existing
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => submit(null, { allowDuplicate: true })} disabled={saving}>
                    Create anyway
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Section title="Essentials">
          <Field label="Company name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={160} data-autofocus autoComplete="organization" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact person">
              <Input value={form.contact_person} onChange={(e) => set({ contact_person: e.target.value })} maxLength={120} autoComplete="off" />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} inputMode="email" autoComplete="off" />
            </Field>
            <Field label="Phone" hint="Include the country code, like +971 50 123 4567">
              <Input type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" maxLength={40} autoComplete="off" />
            </Field>
            <div>
              <Field label="WhatsApp">
                <Input
                  type="tel"
                  value={form.whatsappSame ? form.phone : form.whatsapp}
                  onChange={(e) => set({ whatsapp: e.target.value })}
                  disabled={form.whatsappSame}
                  inputMode="tel"
                  maxLength={40}
                  autoComplete="off"
                />
              </Field>
              <label className="mt-1.5 inline-flex cursor-pointer items-center gap-2 text-[13px] text-muted">
                <input
                  type="checkbox"
                  checked={form.whatsappSame}
                  onChange={(e) => set({ whatsappSame: e.target.checked, whatsapp: e.target.checked ? form.whatsapp : form.whatsapp || form.phone })}
                  className="h-4 w-4 rounded accent-primary"
                />
                Same as phone
              </label>
            </div>
            <Field label="Country">
              <Input value={form.country} onChange={(e) => set({ country: e.target.value })} list={countryListId} maxLength={80} autoComplete="off" />
            </Field>
            <datalist id={countryListId}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <div>
              {addingSource ? (
                <div className="flex items-end gap-2">
                  <Field label="New lead source" className="flex-1">
                    <Input
                      value={sourceDraft}
                      onChange={(e) => setSourceDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSource();
                        } else if (e.key === 'Escape') {
                          e.stopPropagation();
                          setAddingSource(false);
                        }
                      }}
                      maxLength={120}
                      autoFocus
                    />
                  </Field>
                  <Button variant="primary" onClick={addSource} loading={listBusy === 'lead_sources'} disabled={!sourceDraft.trim()}>
                    Add
                  </Button>
                  <Button variant="ghost" onClick={() => setAddingSource(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Field label="Source">
                  <Select
                    value={form.source}
                    onChange={(e) => (e.target.value === ADD_SOURCE ? setAddingSource(true) : set({ source: e.target.value }))}
                    placeholder="Not set"
                  >
                    {sourceOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    {canAddToLists && <option value={ADD_SOURCE}>+ Add new source…</option>}
                  </Select>
                </Field>
              )}
            </div>
          </div>
        </Section>

        <Section title="Deal">
          <ProductPicker
            value={form.products}
            options={settings.commodities || []}
            onToggle={(p) =>
              set({
                products: form.products.some((x) => sameText(x, p)) ? form.products.filter((x) => !sameText(x, p)) : [...form.products, p],
              })
            }
            onAdd={addProduct}
            adding={listBusy === 'commodities'}
            canAdd={canAddToLists}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid grid-cols-[1fr_6.5rem] gap-2">
              <Field label="Quantity" error={errors.quantity}>
                <Input type="number" min="0" step="any" inputMode="decimal" value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} />
              </Field>
              <Field label="Unit">
                <Select value={form.quantity_unit} onChange={(e) => set({ quantity_unit: e.target.value })} options={unitOptions} />
              </Field>
            </div>
            <Field label="Price per unit" error={errors.price}>
              <Input type="number" min="0" step="any" inputMode="decimal" value={form.price} onChange={(e) => set({ price: e.target.value })} />
            </Field>
            <Field
              label="Deal value"
              error={errors.value}
              hint={!form.valueTouched && form.value ? 'Worked out from quantity × price. Type to change it.' : undefined}
            >
              <Input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={form.value}
                onChange={(e) => set({ value: e.target.value, valueTouched: e.target.value.trim() !== '' })}
              />
            </Field>
            <Field label="Currency">
              <Select value={form.currency} onChange={(e) => set({ currency: e.target.value })} options={currencyOptions} />
            </Field>
            <Field label="Stage">
              <Select value={form.stage} onChange={(e) => set({ stage: e.target.value })} options={STAGES.map((s) => s.key)} />
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => set({ priority: e.target.value })} options={PRIORITIES} />
            </Field>
            <Field label="Expected close date">
              <Input type="date" value={form.expected_close_date} onChange={(e) => set({ expected_close_date: e.target.value })} />
            </Field>
            <div>
              <Field label="Next follow-up date">
                <Input type="date" value={form.follow_up_date} onChange={(e) => set({ follow_up_date: e.target.value })} />
              </Field>
              <QuickDateButtons value={form.follow_up_date} onPick={(d) => set({ follow_up_date: d })} onClear={() => set({ follow_up_date: '' })} />
            </div>
            {canReassign && (
              <Field label="Assign to" className="sm:col-span-2">
                <Select value={form.assigned_to} onChange={(e) => set({ assigned_to: e.target.value })} options={assignOptions} />
              </Field>
            )}
          </div>
        </Section>

        <section>
          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            aria-expanded={more}
            aria-controls={moreId}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-ink ring-1 ring-inset ring-line hover:bg-subtle"
          >
            <span>
              More details
              <span className="ml-2 text-xs font-normal text-muted">Terms, address, notes, other contacts</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted transition-transform ${more ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {more && (
            <div id={moreId} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Incoterm">
                  <Select
                    value={form.incoterm}
                    onChange={(e) => set({ incoterm: e.target.value })}
                    placeholder="Not set"
                    options={withCurrent(settings.incoterms, form.incoterm)}
                  />
                </Field>
                <Field label="Payment terms">
                  <Select
                    value={form.payment_terms}
                    onChange={(e) => set({ payment_terms: e.target.value })}
                    placeholder="Not set"
                    options={withCurrent(settings.payment_terms, form.payment_terms)}
                  />
                </Field>
                <Field label="Port of delivery">
                  <Input value={form.port_delivery} onChange={(e) => set({ port_delivery: e.target.value })} maxLength={160} />
                </Field>
                <Field label="Website">
                  <Input type="url" value={form.website} onChange={(e) => set({ website: e.target.value })} inputMode="url" maxLength={300} placeholder="https://" />
                </Field>
                <Field label="Industry">
                  <Input value={form.industry_type} onChange={(e) => set({ industry_type: e.target.value })} maxLength={120} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Credit rating">
                    <Input value={form.credit_rating} onChange={(e) => set({ credit_rating: e.target.value })} maxLength={20} />
                  </Field>
                  <Field label="Turnover">
                    <Input value={form.turnover} onChange={(e) => set({ turnover: e.target.value })} maxLength={60} />
                  </Field>
                </div>
                <Field label="Address" className="sm:col-span-2">
                  <Textarea rows={2} value={form.address} onChange={(e) => set({ address: e.target.value })} maxLength={500} />
                </Field>
                <Field label="Notes" className="sm:col-span-2">
                  <Textarea rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={5000} />
                </Field>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-[13px] font-semibold text-ink">Other contacts</h4>
                  <Button
                    size="sm"
                    icon={Plus}
                    onClick={() => set({ contacts: [...form.contacts, emptyContact()] })}
                    disabled={form.contacts.length >= MAX_CONTACTS}
                  >
                    Add contact
                  </Button>
                </div>
                {form.contacts.length === 0 ? (
                  <p className="text-xs text-muted">Add more people at this company, like a purchase manager or owner.</p>
                ) : (
                  <ul className="space-y-3">
                    {form.contacts.map((c, i) => (
                      <li key={i} className="rounded-lg p-3 ring-1 ring-inset ring-line">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted">Contact {i + 1}</span>
                          <IconButton
                            icon={Trash2}
                            size="sm"
                            variant="danger-ghost"
                            label={`Remove contact ${i + 1}`}
                            onClick={() => set({ contacts: form.contacts.filter((_, j) => j !== i) })}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Name">
                            <Input value={c.name} onChange={(e) => contactsSet(i, { name: e.target.value })} maxLength={120} />
                          </Field>
                          <Field label="Designation">
                            <Input value={c.designation} onChange={(e) => contactsSet(i, { designation: e.target.value })} maxLength={120} />
                          </Field>
                          <Field label="Phone">
                            <Input type="tel" inputMode="tel" value={c.phone} onChange={(e) => contactsSet(i, { phone: e.target.value })} maxLength={40} />
                          </Field>
                          <Field label="Email" error={errors[`contact_${i}`]}>
                            <Input type="email" inputMode="email" value={c.email} onChange={(e) => contactsSet(i, { email: e.target.value })} />
                          </Field>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </form>
    </Modal>
  );
}

function withCurrent(list = [], current) {
  return current && !list.includes(current) ? [...list, current] : list;
}

/**
 * Create or edit a lead. Props: open, onClose, lead (edit mode), onSaved(lead), onOpenLead(id) (optional:
 * how to open another lead, used by "Open existing" on a duplicate and the toast's "Open").
 */
export default function LeadFormModal({ open, ...props }) {
  if (!open) return null;
  return <LeadForm {...props} />;
}
