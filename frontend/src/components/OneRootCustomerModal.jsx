import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Building2,
  User,
  Phone,
  Mail,
  Plus,
  MessageCircle,
  Globe,
  Tag,
  DollarSign,
  Ship,
  FileText,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Calendar,
  CalendarDays,
  Target,
  MessageSquare,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const COMMODITIES = [
  'Turmeric',
  'Tender Coconut',
  'Red Chilli',
  'Ginger',
  'Maize',
  'Rice DDGS',
  'Corn DDGS',
  'DORB',
  'RSM',
  'Soya seed',
  'Jowar'
];

const ACTIVITIES = [
  'Call initiated',
  'Email',
  'WhatsApp text/Zalo',
  'Response',
  'Meeting',
  'Price discussion',
  'Payment discussion',
  'Sample discussion',
  'Sample sent',
  'Negotiation',
  'Sent quotations',
  'Email reply',
  'Follow up calls'
];

const STAGES = [
  'Closed Lost',
  'Lead Generation',
  'Contact Established',
  'Requirement Understood',
  'Quotation Sent',
  'Closed Won'
];

const REPS = [
  'Rohan',
  'adric',
  'Pavithra',
  'Rahul',
  'Shiva',
  'David',
  'Athish',
  'Dan',
  'aarav',
  'Bhavana',
  'Preetham',
  'Sanju'
];

export default function OneRootCustomerModal({ isOpen, onClose, lead, onSave, onDelete }) {
  if (!isOpen || !lead) return null;

  const { isOwner } = useAuth();

  // Form states
  const [type, setType] = useState(lead.type || 'Export');
  const [companyName, setCompanyName] = useState(lead.name || lead.company_name || '');
  const [contactName, setContactName] = useState(
    lead.contact_person === '—' ? '' : lead.contact_person || ''
  );
  const [phone, setPhone] = useState(lead.phone || '+7 495 729 13 94');
  const [email, setEmail] = useState(lead.email || 'import@gkoptotorg.ru');
  const [designation, setDesignation] = useState(lead.designation || '');
  const [linkedin, setLinkedin] = useState(lead.linkedin || 'https://linkedin.com/in/...');
  const [whatsapp, setWhatsapp] = useState(lead.whatsapp || lead.phone || '');
  const [website, setWebsite] = useState(lead.website || 'https://www.gkoptotorg.ru/');
  const [country, setCountry] = useState(lead.country || 'Russia');
  const [leadSource, setLeadSource] = useState(lead.source || '');
  const [address, setAddress] = useState(lead.address || '');

  // Profile
  const [creditRating, setCreditRating] = useState(lead.credit_rating || '');
  const [turnover, setTurnover] = useState(lead.turnover || '0');
  const [sourcingRegion, setSourcingRegion] = useState(lead.sourcing_region || '');
  const [legacyIndustry, setLegacyIndustry] = useState(
    lead.legacy_industry_type || lead.industry_type || 'TRADING Company'
  );

  // Products
  const [commoditiesList, setCommoditiesList] = useState(() => {
    const list = [...COMMODITIES];
    if (Array.isArray(lead.products)) {
      lead.products.forEach((p) => {
        if (p && !list.includes(p)) list.push(p);
      });
    }
    if (lead.product && !list.includes(lead.product)) {
      list.push(lead.product);
    }
    return list;
  });
  const [selectedProducts, setSelectedProducts] = useState(
    Array.isArray(lead.products) && lead.products.length > 0
      ? lead.products
      : [lead.product || 'Maize']
  );
  const [quantity, setQuantity] = useState(lead.quantity || 0);
  const [price, setPrice] = useState(lead.price || 0);

  // Export Requirements
  const [reqIndustryList, setReqIndustryList] = useState([
    'Animal Feed & Poultry',
    'Food Processing',
    'Pharma / Extraction',
    'Agro Commodity Trading',
    'Wholesale Commodity Trade'
  ]);
  const [reqIndustry, setReqIndustry] = useState(lead.export_requirements?.industry_type || '');
  const [materialType, setMaterialType] = useState(lead.export_requirements?.material_type || '');
  const [polishLevel, setPolishLevel] = useState(lead.export_requirements?.polish_level || '');
  const [minCurcumin, setMinCurcumin] = useState(lead.export_requirements?.min_curcumin || '');
  const [cultivation, setCultivation] = useState(lead.export_requirements?.cultivation_method || '');
  const [preferredOrigin, setPreferredOrigin] = useState(lead.export_requirements?.preferred_origin || '');
  const [quantityNeeded, setQuantityNeeded] = useState(lead.export_requirements?.quantity_needed_kg || '');
  const [maxPrice, setMaxPrice] = useState(lead.export_requirements?.max_price_inr || '');
  const [incoterm, setIncoterm] = useState(lead.export_requirements?.incoterm || '');
  const [portDelivery, setPortDelivery] = useState(lead.export_requirements?.port_delivery || '');
  const [paymentDays, setPaymentDays] = useState(lead.export_requirements?.payment_days || '');

  // Assignment & Status
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to || lead.agent_name || 'Rohan');
  const [status, setStatus] = useState(lead.stage || lead.status || 'Closed Lost');

  // Daily Activity
  const [activeChecks, setActiveChecks] = useState([]);
  const [activityNote, setActivityNote] = useState('');

  // Follow-up & Dual Remarks (Current vs. Future)
  const [followUpDate, setFollowUpDate] = useState(lead.follow_up_date || '2026-05-27');
  const [todayRemarks, setTodayRemarks] = useState(lead.today_remarks || '');
  const [nextFollowUpAction, setNextFollowUpAction] = useState(lead.next_follow_up_action || '');
  const [previousRemarks, setPreviousRemarks] = useState(
    Array.isArray(lead.previous_remarks) && lead.previous_remarks.length > 0
      ? lead.previous_remarks
      : [
          {
            text: 'Sent mail no response also call not connected try again',
            timestamp: '5/25/2026, 4:32:20 PM'
          }
        ]
  );

  // Sync state if lead prop changes
  useEffect(() => {
    if (lead) {
      setFollowUpDate(lead.follow_up_date || '2026-05-27');
      setTodayRemarks(lead.today_remarks || '');
      setNextFollowUpAction(lead.next_follow_up_action || '');
      if (Array.isArray(lead.previous_remarks)) {
        setPreviousRemarks(lead.previous_remarks);
      }
    }
  }, [lead]);

  // Documents
  const [documents, setDocuments] = useState(lead.documents || []);

  const toggleProduct = (prod) => {
    if (selectedProducts.includes(prod)) {
      setSelectedProducts(selectedProducts.filter((p) => p !== prod));
    } else {
      setSelectedProducts([...selectedProducts, prod]);
    }
  };

  const toggleActivity = (act) => {
    if (activeChecks.includes(act)) {
      setActiveChecks(activeChecks.filter((a) => a !== act));
    } else {
      setActiveChecks([...activeChecks, act]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let updatedRemarks = [...previousRemarks];
    const hasToday = todayRemarks && todayRemarks.trim().length > 0;
    const hasFuture = nextFollowUpAction && nextFollowUpAction.trim().length > 0;

    if (hasToday || hasFuture) {
      const now = new Date();
      const formattedTimestamp = now.toLocaleString('en-US');
      const formattedDate = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const entryText = [
        hasToday ? `[Today's Interaction]: ${todayRemarks.trim()}` : null,
        hasFuture ? `[Planned Action on ${followUpDate}]: ${nextFollowUpAction.trim()}` : null,
      ].filter(Boolean).join(' | ');

      updatedRemarks.unshift({
        today_remark: todayRemarks.trim(),
        planned_action: nextFollowUpAction.trim(),
        text: entryText,
        remark: entryText,
        follow_up_date: followUpDate,
        timestamp: formattedTimestamp,
        date: formattedDate,
        author: assignedTo || 'User',
      });
    }

    const compositeNotes = [
      hasToday ? `[Today's Interaction]: ${todayRemarks.trim()}` : null,
      hasFuture ? `[Planned Action on ${followUpDate}]: ${nextFollowUpAction.trim()}` : null,
      lead.notes || null,
    ].filter(Boolean).join('\n\n') || lead.notes || '';

    const updatedLead = {
      ...lead,
      type,
      name: companyName,
      company_name: companyName,
      contact_person: contactName || '—',
      phone,
      email,
      designation,
      linkedin,
      whatsapp,
      website,
      country,
      source: leadSource,
      address,
      credit_rating: creditRating,
      turnover,
      sourcing_region: sourcingRegion,
      legacy_industry_type: legacyIndustry,
      products: selectedProducts,
      product: selectedProducts[0] || '',
      quantity: Number(quantity) || 0,
      price: Number(price) || 0,
      export_requirements: {
        industry_type: reqIndustry,
        material_type: materialType,
        polish_level: polishLevel,
        min_curcumin: minCurcumin,
        cultivation_method: cultivation,
        preferred_origin: preferredOrigin,
        quantity_needed_kg: quantityNeeded,
        max_price_inr: maxPrice,
        incoterm,
        port_delivery: portDelivery,
        payment_days: paymentDays
      },
      assigned_to: assignedTo,
      agent_name: assignedTo,
      stage: status,
      status: status,
      lead_stage: status,
      follow_up_date: followUpDate,
      today_remarks: todayRemarks.trim() || lead.today_remarks || '',
      next_follow_up_action: nextFollowUpAction.trim() || lead.next_follow_up_action || '',
      previous_remarks: updatedRemarks,
      notes: compositeNotes,
      documents
    };

    if (onSave) {
      onSave(updatedLead);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!isOwner) {
      alert('Permission Denied: Only Company Owners/Admins can delete leads.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${companyName}? This cannot be undone.`)) {
      if (onDelete) {
        onDelete(lead.id);
      }
      onClose();
    }
  };

  const handleUploadDummy = () => {
    const fileName = prompt('Enter document name to attach (e.g. Export_Specification_Sheet.pdf):');
    if (fileName) {
      setDocuments([
        ...documents,
        {
          name: fileName,
          size: '1.2 MB',
          uploaded_at: new Date().toLocaleDateString('en-US')
        }
      ]);
    }
  };

  // Header display dates
  const createdDateDisplay = lead.created_at || 'Created May 25, 2026';
  const followUpFormatted = followUpDate
    ? new Date(followUpDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'May 27, 2026';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* ============================================================== */}
        {/* MODAL HEADER (Dark bar matching OneRoot Screenshot)           */}
        {/* ============================================================== */}
        <div className="bg-[#0b1329] px-6 py-4 flex items-center justify-between border-b border-slate-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            {/* OneRoot Logo */}
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-white">OneRoot</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">
                .farm
              </span>
            </div>

            <div className="h-4 w-px bg-slate-700" />

            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-snug">
                {companyName || lead.company_name}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                View &amp; edit customer &bull; {createdDateDisplay}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ============================================================== */}
        {/* SCROLLABLE FORM BODY                                          */}
        {/* ============================================================== */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
          {/* Top Status Badges Row (Exact matching OneRoot screenshot 2) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
              <Clock size={12} className="text-slate-500" />
              <span>{createdDateDisplay}</span>
            </span>

            <span className="px-3 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              {status}
            </span>

            <span className="px-3 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
              {type}
            </span>

            {legacyIndustry && (
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                {legacyIndustry}
              </span>
            )}

            <span className="px-3 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
              Follow-up: {followUpFormatted} &bull; Overdue
            </span>
          </div>

          {/* Section 1: Type * */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Type <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              required
            />
          </div>

          {/* Section 2: CUSTOMER DETAILS */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              CUSTOMER DETAILS
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Company name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs"
                required
              />
            </div>

            {/* CONTACT 1 Container Box */}
            <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                CONTACT 1
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Contact person
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    placeholder="Contact name"
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => alert('Additional phone line added')}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-700 mt-1 cursor-pointer block"
                  >
                    + Add another number
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    placeholder="Designation"
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">LinkedIn</label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-purple-600 pt-1">
                <button
                  type="button"
                  onClick={() => alert('Additional detail section enabled')}
                  className="hover:underline cursor-pointer"
                >
                  Add other detail
                </button>
                <button
                  type="button"
                  onClick={() => alert('New contact block added')}
                  className="hover:underline cursor-pointer"
                >
                  + Add another contact
                </button>
              </div>
            </div>

            {/* WhatsApp / Zalo */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                WhatsApp/zolo number
              </label>
              <input
                type="text"
                value={whatsapp}
                placeholder="WhatsApp number"
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
              />
              <button
                type="button"
                className="text-[11px] font-bold text-purple-600 hover:text-purple-700 mt-1 cursor-pointer block"
              >
                + Add another number
              </button>
            </div>

            {/* Website */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>

            {/* Country & Lead source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Lead source
                </label>
                <select
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">Select lead source</option>
                  <option value="Self/own">Self/own</option>
                  <option value="Website">Website</option>
                  <option value="Trade Fair">Trade Fair</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Outreach">Cold Outreach</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Address</label>
              <textarea
                rows={2}
                value={address}
                placeholder="Office or port address..."
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Section 3: COMPANY PROFILE */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              COMPANY PROFILE
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Credit rating
                </label>
                <select
                  value={creditRating}
                  onChange={(e) => setCreditRating(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">Select credit rating</option>
                  <option value="AAA">AAA</option>
                  <option value="AA">AA</option>
                  <option value="A">A</option>
                  <option value="BBB">BBB</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Company turnover
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={turnover}
                    onChange={(e) => setTurnover(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-l-xl text-xs"
                  />
                  <span className="px-3.5 py-2.5 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl text-xs font-bold text-slate-600">
                    cr
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Sourcing region
                </label>
                <input
                  type="text"
                  value={sourcingRegion}
                  placeholder="e.g. Nizamabad, Salem, Guntur"
                  onChange={(e) => setSourcingRegion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Legacy industry type
                </label>
                <input
                  type="text"
                  value={legacyIndustry}
                  onChange={(e) => setLegacyIndustry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 4: PRODUCT */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              PRODUCT
            </h3>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Products <span className="text-rose-500">*</span>
                </label>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => {
                      const newProd = prompt('Enter custom commodity / product name:');
                      if (newProd && newProd.trim()) {
                        const trimmed = newProd.trim();
                        if (!commoditiesList.includes(trimmed)) {
                          setCommoditiesList((prev) => [...prev, trimmed]);
                        }
                        if (!selectedProducts.includes(trimmed)) {
                          setSelectedProducts((prev) => [...prev, trimmed]);
                        }
                      }
                    }}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> + Add Product
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Lock size={10} className="text-slate-400" /> Owner only
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {commoditiesList.map((commodity) => {
                  const isSelected = selectedProducts.includes(commodity);
                  return (
                    <button
                      key={commodity}
                      type="button"
                      onClick={() => toggleProduct(commodity)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {commodity}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 5: EXPORT REQUIREMENTS */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              EXPORT REQUIREMENTS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    Industry type
                  </label>
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => {
                        const newInd = prompt('Enter custom industry type:');
                        if (newInd && newInd.trim()) {
                          const trimmed = newInd.trim();
                          if (!reqIndustryList.includes(trimmed)) {
                            setReqIndustryList((prev) => [...prev, trimmed]);
                          }
                          setReqIndustry(trimmed);
                        }
                      }}
                      className="text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus size={10} /> + Add
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                      <Lock size={9} className="text-slate-400" /> Owner only
                    </span>
                  )}
                </div>
                <select
                  value={reqIndustry}
                  onChange={(e) => setReqIndustry(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">Select industry type</option>
                  {reqIndustryList.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Material type
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">Select material</option>
                  <option value="Finger / Raw">Finger / Raw</option>
                  <option value="Bulb">Bulb</option>
                  <option value="Meal Pellet">Meal Pellet</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Polish level
                </label>
                <select
                  value={polishLevel}
                  onChange={(e) => setPolishLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">Select polish</option>
                  <option value="Single Polish">Single Polish</option>
                  <option value="Double Polish">Double Polish</option>
                  <option value="Unpolished">Unpolished</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Min curcumin %
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3.5%"
                  value={minCurcumin}
                  onChange={(e) => setMinCurcumin(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Cultivation methods
                </label>
                <select
                  value={cultivation}
                  onChange={(e) => setCultivation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">Select cultivation method</option>
                  <option value="Conventional Cleaned">Conventional Cleaned</option>
                  <option value="Certified Organic">Certified Organic</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Preferred origin
                </label>
                <input
                  type="text"
                  placeholder="e.g. Salem, Nizamabad"
                  value={preferredOrigin}
                  onChange={(e) => setPreferredOrigin(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Quantity needed (kg)
                </label>
                <input
                  type="text"
                  value={quantityNeeded}
                  onChange={(e) => setQuantityNeeded(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Max price (₹)
                </label>
                <input
                  type="text"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Incoterm</label>
                <select
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">Select incoterm</option>
                  <option value="CIF">CIF</option>
                  <option value="FOB">FOB</option>
                  <option value="CFR">CFR</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Port delivery
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hai Phong, St. Petersburg"
                  value={portDelivery}
                  onChange={(e) => setPortDelivery(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Payment days after sailing from port of loading
                </label>
                <input
                  type="text"
                  placeholder="e.g. CAD, 15 days, 30 days LC"
                  value={paymentDays}
                  onChange={(e) => setPaymentDays(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 6: ASSIGNMENT */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              ASSIGNMENT
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Reassign to <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={!isOwner}
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold ${
                    !isOwner
                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  {REPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  {isOwner
                    ? 'Only admins can reassign this lead to another user.'
                    : 'Reassignment is restricted to Company Owners/Admins.'}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 7: DAILY ACTIVITY */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              DAILY ACTIVITY
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Select activities
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ACTIVITIES.map((act) => {
                  const isChecked = activeChecks.includes(act);
                  return (
                    <button
                      key={act}
                      type="button"
                      onClick={() => toggleActivity(act)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span className="truncate">{act}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Activity note
              </label>
              <textarea
                rows={2}
                placeholder="Write what happened with this lead…"
                value={activityNote}
                onChange={(e) => setActivityNote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
              />
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                Tick an activity above &mdash; a note on its own is not saved.
              </p>
            </div>
          </div>

          {/* Section 8: ACTIVITY HISTORY */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              ACTIVITY HISTORY
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 font-medium">
              No activity saved yet. The first one you save will appear here.
            </div>
          </div>

          {/* Section 9: FOLLOW-UP & SEPARATE REMARKS (Current vs. Future) */}
          <div className="space-y-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  <CalendarDays size={13} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Follow-up Schedule & Remarks
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Separate logs for today's interaction vs. planned action for the future follow-up
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                Next Follow-up: {followUpDate || 'Not set'}
              </div>
            </div>

            {/* Follow-up Date Input */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-purple-600" />
                <span>Next Follow-up Date</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="date"
                required
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs"
              />
              <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                Changing the follow-up date counts once per lead per day in Outreach.
              </p>
            </div>

            {/* Two Separate Text/Remark Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field 1: Remarks/notes for today's interaction */}
              <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <MessageCircle size={13} className="text-blue-600" />
                    <span>Remarks / Notes for Today's Interaction</span>
                  </label>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                    Today's Log
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  What was discussed, agreed, or discovered during today's call or meeting with this client.
                </p>
                <textarea
                  rows={3}
                  placeholder="e.g. Called client today. Discussed 50 MT double-polish turmeric specs and CAD payment terms. Client requested updated CIF quote..."
                  value={todayRemarks}
                  onChange={(e) => setTodayRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                />
              </div>

              {/* Field 2: Planned action/remarks for the future follow-up date */}
              <div className="p-3.5 rounded-xl border border-purple-200/80 bg-purple-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Target size={13} className="text-purple-600" />
                    <span>Planned Action / Remarks for Future Date</span>
                  </label>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
                    {followUpDate ? `For ${followUpDate}` : 'Future Task'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Dedicated task or action item that must be executed on that specific scheduled future date.
                </p>
                <textarea
                  rows={3}
                  placeholder="e.g. Share revised proforma invoice with 3.5% curcumin certificate, follow up on draft LC approval with procurement head..."
                  value={nextFollowUpAction}
                  onChange={(e) => setNextFollowUpAction(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 10: PREVIOUS REMARKS & FOLLOW-UP HISTORY */}
          <div className="space-y-2.5 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
                <MessageSquare size={14} className="text-purple-600" />
                <span>Follow-up & Remarks History ({previousRemarks.length})</span>
              </div>
              <span className="text-[10px] font-medium text-slate-400">
                Chronological timeline of interactions & scheduled plans
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 max-h-64 overflow-y-auto">
              {previousRemarks.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 font-medium">
                  No previous remarks recorded yet.
                </div>
              ) : (
                previousRemarks.map((rem, idx) => {
                  const hasSplit = rem.today_remark || rem.planned_action;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 text-xs"
                    >
                      {/* Meta header */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold border-b border-slate-100 pb-1.5">
                        <span className="text-slate-700 font-bold">
                          {rem.author || 'Sales Representative'}
                        </span>
                        <div className="flex items-center gap-2">
                          {rem.follow_up_date && (
                            <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60">
                              📅 Target: {rem.follow_up_date}
                            </span>
                          )}
                          <span>{rem.timestamp || rem.date}</span>
                        </div>
                      </div>

                      {hasSplit ? (
                        <div className="space-y-1.5 pt-0.5">
                          {rem.today_remark && (
                            <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 text-slate-800">
                              <span className="font-bold text-blue-900 block text-[10px] uppercase tracking-wider mb-0.5">
                                💬 Today's Interaction Notes
                              </span>
                              <p className="text-slate-800 font-medium text-xs whitespace-pre-wrap">
                                {rem.today_remark}
                              </p>
                            </div>
                          )}
                          {rem.planned_action && (
                            <div className="p-2 rounded-lg bg-purple-50/60 border border-purple-100 text-slate-800">
                              <span className="font-bold text-purple-900 block text-[10px] uppercase tracking-wider mb-0.5">
                                🎯 Planned Action for {rem.follow_up_date || 'Future Follow-up'}
                              </span>
                              <p className="text-slate-800 font-medium text-xs whitespace-pre-wrap">
                                {rem.planned_action}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-800 font-medium text-xs whitespace-pre-wrap">
                          {rem.text || rem.remark}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 11: Save Changes Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/25 transition-all cursor-pointer"
            >
              Save changes
            </button>
          </div>

          {/* Section 12: Delete Lead Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 font-medium">
              Deleting removes this lead for everyone and cannot be undone.
            </p>

            {isOwner ? (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete lead</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold">
                <Lock size={12} className="text-slate-400" />
                <span>Owner Only &bull; Deletion Locked</span>
              </div>
            )}
          </div>

          {/* Section 13: DOCUMENTS (matching screenshot 1) */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <FileText size={15} className="text-slate-500" />
                <span>Documents</span>
              </div>

              <button
                type="button"
                onClick={handleUploadDummy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Upload size={12} />
                <span>Upload</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 font-medium">
              Images, PDF, Office docs, text, ZIP &bull; max 20 MB
            </p>

            {documents.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-1.5 pt-1">
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700"
                  >
                    <span>{doc.name}</span>
                    <span className="text-[10px] text-slate-400">{doc.size}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
