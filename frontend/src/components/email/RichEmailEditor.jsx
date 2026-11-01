import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Heading2, List, ListOrdered, AlignLeft, AlignCenter, Link2, ImagePlus,
  MousePointerClick, Minus, Eraser, Undo2, Redo2, Code2, Loader2, Braces, Trash2,
} from 'lucide-react';
import { api } from '../../services/api';
import { sanitizeHtml, prepareEmailImage, buttonHtml, PLACEHOLDERS } from './emailUtils';

const btn = 'w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const sep = 'w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1';
const field = 'w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30';

/**
 * Email editor: formatting toolbar, pictures (uploaded and shrunk automatically), buttons, links,
 * personalisation fields and an HTML view. `value` is HTML; `onChange` receives cleaned HTML.
 */
export default function RichEmailEditor({ value, onChange, placeholder = 'Write your email…', minHeight = 260 }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const savedRange = useRef(null);
  const lastHtml = useRef('');
  const [mode, setMode] = useState('visual');
  const [source, setSource] = useState('');
  const [pop, setPop] = useState(null); // 'link' | 'button' | 'fields'
  const [linkForm, setLinkForm] = useState({ url: '', text: '' });
  const [btnForm, setBtnForm] = useState({ label: 'Request a quote', url: 'https://' });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selImg, setSelImg] = useState(null);
  const [empty, setEmpty] = useState(true);

  // Load outside changes (template picked, form reset) without disturbing typing
  useEffect(() => {
    const el = ref.current;
    if (!el || mode !== 'visual') return;
    const incoming = value || '';
    if (incoming !== lastHtml.current) {
      el.innerHTML = sanitizeHtml(incoming);
      lastHtml.current = incoming;
      setEmpty(!el.textContent.trim() && !el.querySelector('img'));
    }
  }, [value, mode]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML;
    lastHtml.current = html;
    setEmpty(!el.textContent.trim() && !el.querySelector('img'));
    onChange(html);
  }, [onChange]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current && ref.current.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    } else if (sel) {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  };

  const exec = (cmd, arg) => {
    restoreSelection();
    document.execCommand(cmd, false, arg);
    saveSelection();
    emit();
  };
  const insertHtml = (html) => {
    restoreSelection();
    document.execCommand('insertHTML', false, sanitizeHtml(html));
    saveSelection();
    emit();
  };

  const toggleHeading = () => {
    restoreSelection();
    const block = document.queryCommandValue('formatBlock');
    document.execCommand('formatBlock', false, /h2/i.test(block) ? 'p' : 'h2');
    emit();
  };

  const uploadFiles = async (files) => {
    const list = [...(files || [])].filter((f) => /^image\//.test(f.type));
    if (!list.length) return;
    setUploading(true);
    setError('');
    try {
      for (const file of list) {
        const { dataUrl } = await prepareEmailImage(file);
        const res = await api.uploadEmailImage(dataUrl, file.name);
        const url = res?.data?.url;
        if (!url) throw new Error(res?.message || 'Upload failed');
        insertHtml(`<p><img src="${url}" alt="${String(file.name || 'image').replace(/["<>]/g, '')}" style="max-width:100%;height:auto;border-radius:8px;display:block" width="560"></p>`);
      }
    } catch (err) {
      setError(err?.message || 'The picture could not be added.');
    } finally {
      setUploading(false);
    }
  };

  const onPaste = (e) => {
    const files = e.clipboardData?.files;
    if (files && files.length) {
      e.preventDefault();
      saveSelection();
      uploadFiles(files);
      return;
    }
    const html = e.clipboardData?.getData('text/html');
    if (html) {
      e.preventDefault();
      document.execCommand('insertHTML', false, sanitizeHtml(html));
      emit();
    }
  };

  const onDrop = (e) => {
    if (e.dataTransfer?.files?.length) {
      e.preventDefault();
      uploadFiles(e.dataTransfer.files);
    }
  };

  const onEditorClick = (e) => {
    saveSelection();
    setSelImg(e.target && e.target.tagName === 'IMG' ? e.target : null);
  };

  const sizeImg = (pct) => {
    if (!selImg) return;
    selImg.style.width = `${pct}%`;
    selImg.removeAttribute('width');
    selImg.style.maxWidth = '100%';
    selImg.style.height = 'auto';
    emit();
  };
  const alignImg = (center) => {
    if (!selImg) return;
    selImg.style.marginLeft = center ? 'auto' : '0';
    selImg.style.marginRight = center ? 'auto' : '0';
    selImg.style.display = 'block';
    emit();
  };
  const removeImg = () => {
    if (!selImg) return;
    selImg.remove();
    setSelImg(null);
    emit();
  };

  const addLink = (e) => {
    e.preventDefault();
    let url = linkForm.url.trim();
    if (!url) return;
    if (!/^(https?:|mailto:|tel:)/i.test(url)) url = /@/.test(url) && !/\//.test(url) ? `mailto:${url}` : `https://${url}`;
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.toString().trim() && !linkForm.text.trim()) {
      document.execCommand('createLink', false, url);
      ref.current?.querySelectorAll(`a[href="${CSS.escape(url)}"]`).forEach((a) => a.setAttribute('target', '_blank'));
      emit();
    } else {
      const text = (linkForm.text || url).replace(/[<>]/g, '');
      document.execCommand('insertHTML', false, sanitizeHtml(`<a href="${url.replace(/"/g, '%22')}" target="_blank">${text}</a>&nbsp;`));
      emit();
    }
    setPop(null);
    setLinkForm({ url: '', text: '' });
  };

  const addButton = (e) => {
    e.preventDefault();
    let url = btnForm.url.trim();
    if (!url || url === 'https://') return;
    if (!/^(https?:|mailto:|tel:)/i.test(url)) url = /@/.test(url) && !/\//.test(url) ? `mailto:${url}` : `https://${url}`;
    insertHtml(buttonHtml(btnForm.label || 'Open', url));
    setPop(null);
  };

  const switchMode = () => {
    if (mode === 'visual') {
      setSource(ref.current ? ref.current.innerHTML : value || '');
      setMode('html');
    } else {
      const clean = sanitizeHtml(source);
      lastHtml.current = '';
      onChange(clean);
      setMode('visual');
    }
    setPop(null);
    setSelImg(null);
  };

  const tool = (title, Icon, onClick, opts = {}) => (
    <button type="button" title={title} aria-label={title} className={btn} onMouseDown={(e) => e.preventDefault()} onClick={onClick} disabled={opts.disabled}>
      <Icon size={15} />
    </button>
  );

  return (
    <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500" data-email-editor>
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
        {mode === 'visual' && (
          <>
            {tool('Bold', Bold, () => exec('bold'))}
            {tool('Italic', Italic, () => exec('italic'))}
            {tool('Underline', Underline, () => exec('underline'))}
            {tool('Heading', Heading2, toggleHeading)}
            <span className={sep} />
            {tool('Bullet list', List, () => exec('insertUnorderedList'))}
            {tool('Numbered list', ListOrdered, () => exec('insertOrderedList'))}
            {tool('Align left', AlignLeft, () => exec('justifyLeft'))}
            {tool('Align center', AlignCenter, () => exec('justifyCenter'))}
            <span className={sep} />
            {tool('Add link', Link2, () => { saveSelection(); setLinkForm({ url: '', text: '' }); setPop(pop === 'link' ? null : 'link'); })}
            <button type="button" title="Add picture" aria-label="Add picture" className={btn} onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading}>
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
            </button>
            {tool('Add button', MousePointerClick, () => { saveSelection(); setPop(pop === 'button' ? null : 'button'); })}
            {tool('Divider line', Minus, () => insertHtml('<hr style="border:none;border-top:1px solid #e2e8f0;margin:18px 0"><p><br></p>'))}
            <button type="button" title="Insert personal field" aria-label="Insert personal field" className={`${btn} w-auto px-2 gap-1 text-[11px] font-semibold`} onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => setPop(pop === 'fields' ? null : 'fields')}>
              <Braces size={14} /> Field
            </button>
            <span className={sep} />
            {tool('Clear formatting', Eraser, () => exec('removeFormat'))}
            {tool('Undo', Undo2, () => exec('undo'))}
            {tool('Redo', Redo2, () => exec('redo'))}
          </>
        )}
        <button type="button" onClick={switchMode} className={`ml-auto inline-flex items-center gap-1 px-2 h-8 rounded-md text-[11px] font-semibold cursor-pointer ${mode === 'html' ? 'bg-slate-900 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Edit the HTML code">
          <Code2 size={14} /> {mode === 'html' ? 'Back to editor' : 'HTML'}
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple className="hidden" onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} aria-label="Choose pictures" />
      </div>

      {pop === 'link' && (
        <form onSubmit={addLink} className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <input autoFocus className={`${field} flex-1 min-w-[180px]`} placeholder="https://your-website.com or email" value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} />
          <input className={`${field} w-44`} placeholder="Text (optional)" value={linkForm.text} onChange={(e) => setLinkForm({ ...linkForm, text: e.target.value })} />
          <button type="submit" className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold cursor-pointer">Add link</button>
          <button type="button" onClick={() => setPop(null)} className="text-xs text-slate-500 cursor-pointer">Cancel</button>
        </form>
      )}
      {pop === 'button' && (
        <form onSubmit={addButton} className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <input autoFocus className={`${field} w-44`} placeholder="Button text" value={btnForm.label} onChange={(e) => setBtnForm({ ...btnForm, label: e.target.value })} />
          <input className={`${field} flex-1 min-w-[180px]`} placeholder="https://… or your email" value={btnForm.url} onChange={(e) => setBtnForm({ ...btnForm, url: e.target.value })} />
          <button type="submit" className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold cursor-pointer">Add button</button>
          <button type="button" onClick={() => setPop(null)} className="text-xs text-slate-500 cursor-pointer">Cancel</button>
        </form>
      )}
      {pop === 'fields' && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-[11px] text-slate-500 mr-1">Filled in for each buyer:</span>
          {PLACEHOLDERS.map((p) => (
            <button key={p.key} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { insertHtml(`{{${p.key}}}`); setPop(null); }} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 cursor-pointer">
              {p.label}
            </button>
          ))}
        </div>
      )}
      {selImg && mode === 'visual' && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-amber-50/60 dark:bg-amber-950/20 text-[11px]">
          <span className="font-semibold text-slate-600 dark:text-slate-300 mr-1">Picture:</span>
          {[['Small', 33], ['Medium', 60], ['Full width', 100]].map(([l, p]) => (
            <button key={l} type="button" onClick={() => sizeImg(p)} className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">{l}</button>
          ))}
          <button type="button" onClick={() => alignImg(true)} className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">Center</button>
          <button type="button" onClick={() => alignImg(false)} className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">Left</button>
          <button type="button" onClick={removeImg} className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"><Trash2 size={12} /> Remove</button>
        </div>
      )}

      {mode === 'visual' ? (
        <div className="relative">
          {empty && <div className="absolute left-4 top-3 text-sm text-slate-400 pointer-events-none select-none">{placeholder}</div>}
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Email body"
            className="email-editor-content px-4 py-3 text-sm text-slate-800 dark:text-slate-100 outline-none overflow-auto"
            style={{ minHeight, maxHeight: 560 }}
            onInput={emit}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            onBlur={saveSelection}
            onClick={onEditorClick}
            onPaste={onPaste}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
          />
        </div>
      ) : (
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full px-4 py-3 text-xs font-mono bg-slate-950 text-emerald-100 outline-none"
          style={{ minHeight }}
          spellCheck={false}
          aria-label="Email HTML"
        />
      )}
      {(error || uploading) && (
        <div className={`px-3 py-1.5 text-[11px] border-t ${error ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
          {error || 'Shrinking and uploading the picture…'}
        </div>
      )}
    </div>
  );
}
