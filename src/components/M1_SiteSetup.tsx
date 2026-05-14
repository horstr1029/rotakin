'use client';
import { useRef, useState, useCallback } from 'react';
import { Building2, User, MapPin, FileText, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import type { SiteInfo, AuditState } from '@/lib/types';
import { cn } from '@/lib/utils';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </Label>
  );
}

export default function M1_SiteSetup() {
  const { state, updateSite, updateBranding } = useStore();
  const { site, branding } = state.audit;
  const orgLogoRef = useRef<HTMLInputElement>(null);
  const clientLogoRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSiteChange = useCallback((field: keyof SiteInfo, value: string) => {
    updateSite({ [field]: value });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaved(false);
    saveTimer.current = setTimeout(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 300);
  }, [updateSite]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--rk-text)' }}>Site Setup</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--rk-text2)' }}>Configure site information, branding and audit parameters.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--rk-green)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--rk-green)' }} />
              Saved
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => importRef.current?.click()} className="gap-1.5 text-xs">
            <Upload className="w-3.5 h-3.5" />
            Import from Previous Audit
          </Button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportSite} />
        </div>
      </div>

      {/* Card 1: Audit Information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--rk-accent)' }}>
            <FileText className="w-4 h-4" />
            Audit Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <FieldLabel>Report Reference</FieldLabel>
              <Input
                value={site.reportRef}
                onChange={e => handleSiteChange('reportRef', e.target.value)}
                placeholder="e.g. ROT-2024-001"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Audit Date</FieldLabel>
              <Input
                type="date"
                value={site.auditDate}
                onChange={e => handleSiteChange('auditDate', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Site Type</FieldLabel>
              <Select value={site.siteType} onValueChange={(v: string | null) => v && handleSiteChange('siteType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Active Standard</FieldLabel>
              <Select value={site.activeStandard} onValueChange={(v: string | null) => v && handleSiteChange('activeStandard', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select standard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SANS 10222-5-1-4">SANS 10222-5-1-4</SelectItem>
                  <SelectItem value="BS EN 50132-7">BS EN 50132-7</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Site & Client Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--rk-accent)' }}>
            <Building2 className="w-4 h-4" />
            Site &amp; Client Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 space-y-1.5">
              <FieldLabel>Site Name</FieldLabel>
              <Input
                value={site.siteName}
                onChange={e => handleSiteChange('siteName', e.target.value)}
                placeholder="e.g. Greenfield Mall"
              />
            </div>
            <div className="col-span-3 space-y-1.5">
              <FieldLabel>Site Address</FieldLabel>
              <Input
                value={site.siteAddress}
                onChange={e => handleSiteChange('siteAddress', e.target.value)}
                placeholder="Full site address"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Client / Organisation</FieldLabel>
              <Input
                value={site.client}
                onChange={e => handleSiteChange('client', e.target.value)}
                placeholder="Client name"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Contract No</FieldLabel>
              <Input
                value={site.contractNo}
                onChange={e => handleSiteChange('contractNo', e.target.value)}
                placeholder="Contract number"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>NVR Reference</FieldLabel>
              <Input
                value={site.nvrRef}
                onChange={e => handleSiteChange('nvrRef', e.target.value)}
                placeholder="NVR device reference"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Engineer Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--rk-accent)' }}>
            <User className="w-4 h-4" />
            Engineer Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <FieldLabel>Engineer ID</FieldLabel>
              <Input
                value={site.engineerId}
                onChange={e => handleSiteChange('engineerId', e.target.value)}
                placeholder="e.g. ENG-001"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Engineer Name</FieldLabel>
              <Input
                value={site.engineerName}
                onChange={e => handleSiteChange('engineerName', e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Certification Body</FieldLabel>
              <Input
                value={site.certBody}
                onChange={e => handleSiteChange('certBody', e.target.value)}
                placeholder="e.g. SAIDSA"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Certificate Number</FieldLabel>
              <Input
                value={site.certNumber}
                onChange={e => handleSiteChange('certNumber', e.target.value)}
                placeholder="Certification number"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Witness Name</FieldLabel>
              <Input
                value={site.witnessName}
                onChange={e => handleSiteChange('witnessName', e.target.value)}
                placeholder="Full name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Conditions & Location */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--rk-accent)' }}>
            <MapPin className="w-4 h-4" />
            Conditions &amp; Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <FieldLabel>Weather Conditions</FieldLabel>
              <Input
                value={site.weather}
                onChange={e => handleSiteChange('weather', e.target.value)}
                placeholder="e.g. Clear, overcast"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Lux Level</FieldLabel>
              <Input
                value={site.lux}
                onChange={e => handleSiteChange('lux', e.target.value)}
                placeholder="e.g. 350 lux"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>GPS Latitude</FieldLabel>
              <Input
                value={site.gpsLat}
                onChange={e => handleSiteChange('gpsLat', e.target.value)}
                placeholder="e.g. -26.2041"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>GPS Longitude</FieldLabel>
              <Input
                value={site.gpsLng}
                onChange={e => handleSiteChange('gpsLng', e.target.value)}
                placeholder="e.g. 28.0473"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 5: Notes */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--rk-accent)' }}>
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={site.notes}
            onChange={e => handleSiteChange('notes', e.target.value)}
            placeholder="Additional notes, observations or special conditions..."
            className="min-h-[100px] resize-y"
          />
        </CardContent>
      </Card>

      {/* Card 6: Branding */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--rk-accent)' }}>
            Branding &amp; Logos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Org Logo */}
            <div className="space-y-2">
              <FieldLabel>Organisation Logo</FieldLabel>
              <div
                onClick={() => orgLogoRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center min-h-[110px] rounded-lg cursor-pointer border-2 border-dashed transition-colors overflow-hidden',
                )}
                style={{
                  borderColor: branding.orgLogo ? 'var(--rk-accent)' : 'var(--rk-border2)',
                  background: 'var(--rk-surface2)',
                }}
              >
                {branding.orgLogo ? (
                  <img src={branding.orgLogo} alt="Org logo" className="max-h-[90px] max-w-full object-contain p-2" />
                ) : (
                  <span className="text-xs" style={{ color: 'var(--rk-text3)' }}>Click to upload logo</span>
                )}
              </div>
              <input
                ref={orgLogoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleLogoUpload('orgLogo', e.target.files[0])}
              />
              {branding.orgLogo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateBranding({ orgLogo: '' })}
                  className="text-xs h-auto py-1"
                  style={{ color: 'var(--rk-red)' }}
                >
                  Remove logo
                </Button>
              )}
            </div>
            {/* Client Logo */}
            <div className="space-y-2">
              <FieldLabel>Client Logo</FieldLabel>
              <div
                onClick={() => clientLogoRef.current?.click()}
                className="flex flex-col items-center justify-center min-h-[110px] rounded-lg cursor-pointer border-2 border-dashed transition-colors overflow-hidden"
                style={{
                  borderColor: branding.clientLogo ? 'var(--rk-accent)' : 'var(--rk-border2)',
                  background: 'var(--rk-surface2)',
                }}
              >
                {branding.clientLogo ? (
                  <img src={branding.clientLogo} alt="Client logo" className="max-h-[90px] max-w-full object-contain p-2" />
                ) : (
                  <span className="text-xs" style={{ color: 'var(--rk-text3)' }}>Click to upload logo</span>
                )}
              </div>
              <input
                ref={clientLogoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleLogoUpload('clientLogo', e.target.files[0])}
              />
              {branding.clientLogo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateBranding({ clientLogo: '' })}
                  className="text-xs h-auto py-1"
                  style={{ color: 'var(--rk-red)' }}
                >
                  Remove logo
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
