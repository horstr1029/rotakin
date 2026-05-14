'use client';

import React, { useRef } from 'react';
import { useStore } from '@/lib/store';
import type { SiteInfo, AuditState } from '@/lib/types';

function Field({
  label,
  children,
  fullWidth,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <div className="label" style={{ color: 'var(--text2)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

export default function M1_SiteSetup() {
  const { state, updateSite, updateBranding } = useStore();
  const { site, branding } = state.audit;
  const orgLogoRef = useRef<HTMLInputElement>(null);
  const clientLogoRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  function handleSiteChange(field: keyof SiteInfo, value: string) {
    updateSite({ [field]: value });
  }

  function handleLogoUpload(type: 'orgLogo' | 'clientLogo', file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      updateBranding({ [type]: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  }

  function handleImportSite(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string) as AuditState;
        if (data?.audit?.site) {
          updateSite(data.audit.site);
          if (data.audit.branding) updateBranding(data.audit.branding);
        }
      } catch {
        alert('Could not parse site info from file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
            Site Setup
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: '13px' }}>
            Configure site information, branding and audit parameters.
          </p>
        </div>
        <button
          onClick={() => importRef.current?.click()}
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border2)',
            color: 'var(--text2)',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '13px',
          }}
        >
          Import Site from Previous Audit
        </button>
        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportSite} />
      </div>

      {/* Section: Site Information */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
          Site Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="Report Reference">
            <input style={inputStyle} value={site.reportRef} onChange={e => handleSiteChange('reportRef', e.target.value)} placeholder="e.g. ROT-2024-001" />
          </Field>
          <Field label="Audit Date">
            <input style={inputStyle} type="date" value={site.auditDate} onChange={e => handleSiteChange('auditDate', e.target.value)} />
          </Field>
          <Field label="Site Name">
            <input style={inputStyle} value={site.siteName} onChange={e => handleSiteChange('siteName', e.target.value)} placeholder="e.g. Greenfield Mall" />
          </Field>
          <Field label="Site Address">
            <input style={inputStyle} value={site.siteAddress} onChange={e => handleSiteChange('siteAddress', e.target.value)} placeholder="Full address" />
          </Field>
          <Field label="Client Name">
            <input style={inputStyle} value={site.client} onChange={e => handleSiteChange('client', e.target.value)} placeholder="Client / Organisation" />
          </Field>
          <Field label="Contract No">
            <input style={inputStyle} value={site.contractNo} onChange={e => handleSiteChange('contractNo', e.target.value)} placeholder="Contract number" />
          </Field>
          <Field label="Engineer ID">
            <input style={inputStyle} value={site.engineerId} onChange={e => handleSiteChange('engineerId', e.target.value)} placeholder="e.g. ENG-001" />
          </Field>
          <Field label="Engineer Name">
            <input style={inputStyle} value={site.engineerName} onChange={e => handleSiteChange('engineerName', e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Witness Name">
            <input style={inputStyle} value={site.witnessName} onChange={e => handleSiteChange('witnessName', e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Certificate No">
            <input style={inputStyle} value={site.certNumber} onChange={e => handleSiteChange('certNumber', e.target.value)} placeholder="Certification number" />
          </Field>
          <Field label="NVR Reference">
            <input style={inputStyle} value={site.nvrRef} onChange={e => handleSiteChange('nvrRef', e.target.value)} placeholder="NVR device reference" />
          </Field>
          <Field label="Site Type">
            <select style={inputStyle} value={site.siteType} onChange={e => handleSiteChange('siteType', e.target.value)}>
              <option value="retail">Retail</option>
              <option value="industrial">Industrial</option>
              <option value="residential">Residential</option>
              <option value="government">Government</option>
            </select>
          </Field>
          <Field label="Weather Conditions">
            <input style={inputStyle} value={site.weather} onChange={e => handleSiteChange('weather', e.target.value)} placeholder="e.g. Clear, overcast" />
          </Field>
          <Field label="Lux Level">
            <input style={inputStyle} value={site.lux} onChange={e => handleSiteChange('lux', e.target.value)} placeholder="e.g. 350 lux" />
          </Field>
          <Field label="GPS Latitude">
            <input style={inputStyle} value={site.gpsLat} onChange={e => handleSiteChange('gpsLat', e.target.value)} placeholder="e.g. -26.2041" />
          </Field>
          <Field label="GPS Longitude">
            <input style={inputStyle} value={site.gpsLng} onChange={e => handleSiteChange('gpsLng', e.target.value)} placeholder="e.g. 28.0473" />
          </Field>
          <Field label="Certification Body">
            <input style={inputStyle} value={site.certBody} onChange={e => handleSiteChange('certBody', e.target.value)} placeholder="e.g. SAIDSA" />
          </Field>
          <Field label="Active Standard">
            <select style={inputStyle} value={site.activeStandard} onChange={e => handleSiteChange('activeStandard', e.target.value)}>
              <option value="SANS 10222-5-1-4">SANS 10222-5-1-4</option>
              <option value="BS EN 50132-7">BS EN 50132-7</option>
              <option value="Custom">Custom</option>
            </select>
          </Field>
          <Field label="Notes" fullWidth>
            <textarea
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={site.notes}
              onChange={e => handleSiteChange('notes', e.target.value)}
              placeholder="Additional notes, observations or special conditions..."
            />
          </Field>
        </div>
      </div>

      {/* Section: Branding / Logos */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '20px',
        }}
      >
        <h3 style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
          Branding &amp; Logos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Org Logo */}
          <div>
            <div style={{ color: 'var(--text2)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Organisation Logo
            </div>
            <div
              onClick={() => orgLogoRef.current?.click()}
              style={{
                border: `2px dashed ${branding.orgLogo ? 'var(--accent)' : 'var(--border2)'}`,
                borderRadius: '8px',
                minHeight: '100px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: 'var(--surface2)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {branding.orgLogo ? (
                <img src={branding.orgLogo} alt="Org logo" style={{ maxHeight: '90px', maxWidth: '100%', objectFit: 'contain', padding: '8px' }} />
              ) : (
                <span style={{ color: 'var(--text3)', fontSize: '12px' }}>Click to upload logo</span>
              )}
            </div>
            <input
              ref={orgLogoRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleLogoUpload('orgLogo', e.target.files[0])}
            />
            {branding.orgLogo && (
              <button
                onClick={() => updateBranding({ orgLogo: '' })}
                style={{ marginTop: '6px', background: 'transparent', color: 'var(--red)', fontSize: '12px', padding: '2px 0' }}
              >
                Remove logo
              </button>
            )}
          </div>

          {/* Client Logo */}
          <div>
            <div style={{ color: 'var(--text2)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Client Logo
            </div>
            <div
              onClick={() => clientLogoRef.current?.click()}
              style={{
                border: `2px dashed ${branding.clientLogo ? 'var(--accent)' : 'var(--border2)'}`,
                borderRadius: '8px',
                minHeight: '100px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: 'var(--surface2)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {branding.clientLogo ? (
                <img src={branding.clientLogo} alt="Client logo" style={{ maxHeight: '90px', maxWidth: '100%', objectFit: 'contain', padding: '8px' }} />
              ) : (
                <span style={{ color: 'var(--text3)', fontSize: '12px' }}>Click to upload logo</span>
              )}
            </div>
            <input
              ref={clientLogoRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleLogoUpload('clientLogo', e.target.files[0])}
            />
            {branding.clientLogo && (
              <button
                onClick={() => updateBranding({ clientLogo: '' })}
                style={{ marginTop: '6px', background: 'transparent', color: 'var(--red)', fontSize: '12px', padding: '2px 0' }}
              >
                Remove logo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
