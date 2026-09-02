'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const starter = [{
  id: 'satwika2343',
  name: 'Satwika',
  nickname: 'Saturday',
  age: '26',
  date: '2026-09-05',
  message: 'You make ordinary days feel like tiny celebrations. Today, the whole world gets to celebrate you.',
  photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85',
  gallery: [
    'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=700&q=80'
  ]
}];
const ADMIN_PASSWORD = 'sacwac';

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return '';
  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();
  if (Number.isNaN(birthDate.getTime()) || birthDate > today) return '';

  return String(today.getFullYear() - birthDate.getFullYear());
}

export default function AdminPage() {
  const [pages, setPages] = useState([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: '', nickname: '', age: '', date: '', message: '', photo: '', photoPublicId: '', galleryText: '', galleryPublicIds: [] });
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    if (!authenticated) return;
    fetch('/api/pages')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Database unavailable')))
      .then((stored) => setPages(stored.length ? stored : starter))
      .catch((error) => { console.error('Unable to load birthday pages:', error); setPages(starter); })
      .finally(() => setLoading(false));
  }, [authenticated]);

  function unlockAdmin(event) {
    event.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setPasswordError('');
      setAuthenticated(true);
      return;
    }
    setPasswordError('That password is not correct.');
    setPassword('');
  }

  function edit(page) {
    setSelected(page.id);
    setForm({ ...page, age: calculateAge(page.date), galleryText: (page.gallery || []).join('\n'), galleryPublicIds: page.galleryPublicIds || [] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function remove(id) {
    setConfirmDelete(id);
  }
  async function confirmRemove() {
    if (!confirmDelete) return;
    setConfirmDelete(null);
    setDeleting(true);
    const response = await fetch('/api/pages/' + confirmDelete, { method: 'DELETE' });
    if (!response.ok) { setUploadError('Could not delete this page.'); setDeleting(false); return; }
    setPages(pages.filter((page) => page.id !== confirmDelete));
    setDeleting(false);
  }
  async function save(event) {
    event.preventDefault();
    const record = { ...form, age: calculateAge(form.date), gallery: form.galleryText ? form.galleryText.split('\n').map((url) => url.trim()).filter(Boolean).slice(0, 17) : starter[0].gallery };
    delete record.galleryText;
    const response = await fetch(selected ? `/api/pages/${selected}` : '/api/pages', {
      method: selected ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!response.ok) { setUploadError('Could not save this page. Check your database connection.'); return; }
    const savedPage = await response.json();
    setPages(selected ? pages.map((page) => page.id === selected ? savedPage : page) : [savedPage, ...pages]);
    setForm({ name: '', nickname: '', age: '', date: '', message: '', photo: '', photoPublicId: '', galleryText: '', galleryPublicIds: [] });
    setSelected(null); setSaved(true); setTimeout(() => setSaved(false), 2200);
  }
  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value, ...(key === 'date' ? { age: calculateAge(value) } : {}) }));
  }
  async function uploadImage(file, onUploaded) {
    if (!file) return false;
    if (file.size > 1024 * 1024) { setUploadError('That image is larger than 1 MB. Please choose a smaller file.'); return false; }
    setUploadError('');
    const data = new FormData();
    data.append('file', file);
    setUploading(true);
    setUploadProgress(0);
    return new Promise((resolve) => {
      const request = new XMLHttpRequest();
      request.open('POST', '/api/upload');
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
      };
      request.onload = () => {
        try {
          const result = JSON.parse(request.responseText);
          if (request.status < 200 || request.status >= 300) {
            setUploadError(result.error || 'Cloudinary upload failed.');
            resolve(false);
            return;
          }
          onUploaded(result);
          setUploadProgress(100);
          resolve(true);
        } catch {
          setUploadError('Cloudinary returned an invalid upload response.');
          resolve(false);
        } finally {
          setUploading(false);
        }
      };
      request.onerror = () => {
        setUploadError('Cloudinary upload failed. Check your connection and try again.');
        setUploading(false);
        resolve(false);
      };
      request.send(data);
    });
  }
  async function uploadPortrait(event) {
    const file = event.target.files?.[0];
    await uploadImage(file, (result) => { update('photo', result.url); update('photoPublicId', result.publicId); });
  }
  async function uploadGallery(event) {
    const files = Array.from(event.target.files || []);
    if (files.length > 17) { setUploadError('Choose up to 17 gallery images.'); return; }
    const urls = [], publicIds = [];
    for (const file of files) {
      const uploaded = await uploadImage(file, (result) => { urls.push(result.url); publicIds.push(result.publicId); });
      if (!uploaded) return;
    }
    update('galleryText', urls.join('\n'));
    update('galleryPublicIds', publicIds);
  }

  if (!authenticated) return <main className="admin-password-screen"><div className="admin-password-modal" role="dialog" aria-modal="true" aria-labelledby="admin-password-title"><div className="admin-password-icon">✦</div><p className="eyebrow">PRIVATE CELEBRATION STUDIO</p><h1 id="admin-password-title">Enter your password</h1><p>Unlock the admin page to manage your birthday celebrations.</p><form onSubmit={unlockAdmin}><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setPasswordError(''); }} autoFocus required /><button className="primary-btn" type="submit">Enter admin page <span>→</span></button>{passwordError && <small className="admin-password-error" role="alert">{passwordError}</small>}</form></div></main>;
  if (loading) return <main className="loading-screen"><div className="birthday-loader" role="status" aria-live="polite"><span className="loader-ring" /><strong>Loading your pages</strong><small>preparing your celebrations...</small></div></main>;

  return <>{confirmDelete && <div className="delete-modal-backdrop" role="dialog" aria-modal="true"><div className="delete-modal"><div className="delete-modal-icon">?</div><h2>Are you sure?</h2><p>Are you sure you want to delete this birthday page?</p><div className="delete-modal-actions"><button type="button" className="text-btn" onClick={() => setConfirmDelete(null)}>Cancel</button><button type="button" className="delete-confirm-btn" onClick={confirmRemove}>Delete page</button></div></div></div>}{deleting && <main className="loading-screen"><div className="birthday-loader" role="status" aria-live="polite"><span className="loader-ring" /><strong>Deleting page</strong><small>clearing this celebration...</small></div></main>}<main className="admin-shell">
    {uploading && <div className="upload-overlay" role="status" aria-live="polite"><div className="upload-modal"><div className="upload-spinner" /><strong>Uploading image</strong><span>Please wait while your image is being uploaded</span><div className="upload-progress-label"><span>Upload progress</span><strong>{uploadProgress}%</strong></div><div className="progress-track"><span style={{ width: `${uploadProgress}%` }} /></div></div></div>}
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">✦</span><span>birthday<span className="rose">bloom</span></span></div>
      <div className="side-label">Workspace</div>
      <Link href="/admin" className="side-link active"><span>◈</span> Birthday pages</Link>
      <div className="side-note">Create beautiful, shareable birthday stories for the people who make life brighter.</div>
      <div className="sidebar-bottom"><span className="online-dot" /> All systems ready</div>
    </aside>
    <section className="admin-content">
      <header className="admin-header"><div><p className="eyebrow">YOUR CELEBRATION STUDIO</p><h1>Birthday pages</h1><p className="muted">Design a little universe for someone special.</p></div><div className="header-chip">✦ <span>{pages.length} {pages.length === 1 ? 'story' : 'stories'} live</span></div></header>
      <div className="admin-grid">
        <section className="form-card">
          <div className="card-heading"><div><h2>{selected ? 'Edit birthday page' : 'Create a birthday page'}</h2><p>Everything here can be changed later.</p></div><span className="step-pill">01 / DETAILS</span></div>
          <form onSubmit={save}>
            <div className="field-row"><label>Birthday person <input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Satwika" /></label><label>Nickname <input value={form.nickname} onChange={(e) => update('nickname', e.target.value)} placeholder="e.g. Saturday" /></label></div>
            <div className="field-row"><label>Date of birth <input type="date" required value={form.date} onChange={(e) => update('date', e.target.value)} /></label><label>Current age <input value={form.age} readOnly disabled aria-label="Current age calculated from date of birth" placeholder="Select a date of birth" /></label></div>
            <label>Big message <textarea required value={form.message} onChange={(e) => update('message', e.target.value)} placeholder="Write something only they would understand..." rows="4" /></label>
            <div className="upload-box"><div className="upload-icon">↥</div><div><strong>Upload a portrait to Cloudinary</strong><p>JPG, PNG or WEBP · max 1 MB</p></div><input ref={fileInput} className="file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadPortrait} /><button type="button" className="ghost-btn" onClick={() => fileInput.current?.click()}>Choose file</button></div>
            {form.photo && <img className="portrait-preview" src={form.photo} alt="Portrait preview" />}
            {uploadError && <p className="upload-error">{uploadError}</p>}
            <div className="upload-box"><div className="upload-icon">▧</div><div><strong>Upload gallery images</strong><p>Select up to 17 images · max 1 MB each</p></div><input className="file-input" id="gallery-upload" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={uploadGallery} /><button type="button" className="ghost-btn" onClick={() => document.getElementById('gallery-upload').click()}>Choose files</button></div>
            {form.galleryText && <div className="gallery-preview">{form.galleryText.split('\n').filter(Boolean).map((url) => <img key={url} src={url} alt="Gallery preview" />)}</div>}
            <div className="form-actions">{selected && <button type="button" className="text-btn" onClick={() => { setSelected(null); setForm({ name: '', nickname: '', age: '', date: '', message: '', photo: '', photoPublicId: '', galleryText: '', galleryPublicIds: [] }); }}>Cancel edit</button>}<button className="primary-btn" type="submit">{selected ? 'Save changes' : 'Create birthday page'} <span>→</span></button></div>
            {saved && <p className="saved-note">✓ Saved successfully</p>}
          </form>
        </section>
        <section className="list-card"><div className="card-heading"><div><h2>Your pages</h2><p>Share a link whenever you’re ready.</p></div><span className="count">{pages.length}</span></div>
          <div className="page-list">{pages.map((page) => <article className="page-item" key={page.id}><div className="mini-avatar" style={{ backgroundImage: `url(${page.photo || starter[0].photo})` }} /><div className="page-info"><strong>{page.name || 'Untitled'} <span className="live-dot">●</span></strong><span>/ {page.id}</span></div><div className="item-actions"><Link href={`/${page.id}`} target="_blank" aria-label="View page">↗</Link><button onClick={() => edit(page)} aria-label="Edit page">✎</button><button onClick={() => remove(page.id)} aria-label="Delete page">⌫</button></div></article>)}</div>
          {!pages.length && <div className="empty-state">No birthday pages yet.<br />Your first one can be magical.</div>}
        </section>
      </div>
      <footer className="admin-footer"><span>♪ Background music: add your file to <code>public/music/birthday.mp3</code></span><span>Built for the people worth celebrating.</span></footer>
    </section>
  </main></>;
}
