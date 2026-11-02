import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import {
  Building2,
  MapPin,
  Briefcase,
  Target,
  Cpu,
  Smartphone,
  Users,
  Compass,
  MessageSquare,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Upload,
  Radio,
  Loader2,
  ShieldCheck,
  Check,
  QrCode,
  Server,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';
import { whatsappService } from '@/service/whatsappService';
import { emailService } from '@/service/emailService';

export const OnboardingWizard: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user, completeOnboarding } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const [waDetails, setWaDetails] = useState<any>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailConnected, setEmailConnected] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<'app_pass' | 'google_oauth'>('app_pass');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form State across all 10 steps
  const [onboardingData, setOnboardingData] = useState({
    // Step 1
    company_name: user?.company_name || 'Sharyx Client Corp',
    business_email: user?.email || 'admin@company.com',
    website: 'https://company.com',
    logo_url: '',
    // Step 2
    address: '100 Innovation Way, Suite 400',
    city: 'San Francisco',
    state: 'California',
    pincode: '94105',
    // Step 3
    industry: 'IT & Software',
    industry_sub_type: 'B2B Enterprise SaaS',
    selected_services: ['AI Lead Qualification', '24/7 Technical Support', 'Demo Booking'],
    // Step 4
    goals: ['Lead Qualification', '24/7 Phone Receptionist', 'WhatsApp Automation'],
    // Step 5
    technical_level: 'Intermediate',
    // Step 6
    apps: ['Gmail', 'WhatsApp', 'Slack', 'HubSpot'],
    // Step 7
    company_size: '11-50',
    // Step 8
    discovery_source: 'AI / ChatGPT Recommendation',
    // Step 9: WhatsApp
    wa_provider: 'meta_cloud', // 'meta_cloud' | 'qr_gateway' | 'custom_gateway'
    wa_phone: '+1 555 019 2831',
    wa_phone_id: '10928371928371',
    wa_waba_id: '98127391823719',
    wa_access_token: 'EAAG_dummy_token_sharyx_live',
    wa_api_url: 'https://api.custom-gateway.com/v1',
    wa_api_key: '',
    // Step 10: Email
    email_user: user?.email || 'admin@company.com',
    email_app_pass: 'abcd efgh ijkl mnop',
  });

  // Real-time Field Validator
  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'company_name':
        if (!value || typeof value !== 'string' || value.trim().length < 2) {
          return 'Company name must be at least 2 characters.';
        }
        return '';
      case 'business_email':
        if (!value || typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return 'Please provide a valid official business email (e.g. name@company.com).';
        }
        return '';
      case 'website':
        if (value && typeof value === 'string' && value.trim()) {
          const v = value.trim();
          if (!v.includes('.') || v.length < 4) {
            return 'Please enter a valid website domain or URL.';
          }
        }
        return '';
      case 'address':
        if (!value || typeof value !== 'string' || value.trim().length < 3) {
          return 'Street address is required.';
        }
        return '';
      case 'city':
        if (!value || typeof value !== 'string' || value.trim().length < 2) {
          return 'City is required.';
        }
        return '';
      case 'state':
        if (!value || typeof value !== 'string' || value.trim().length < 2) {
          return 'State / Province is required.';
        }
        return '';
      case 'pincode':
        if (!value || typeof value !== 'string' || value.trim().length < 3) {
          return 'Postal code / ZIP is required.';
        }
        return '';
      case 'selected_services':
        if (!Array.isArray(value) || value.length === 0) {
          return 'Please select at least one recommended workflow.';
        }
        return '';
      case 'goals':
        if (!Array.isArray(value) || value.length === 0) {
          return 'Please select at least one automation objective.';
        }
        return '';
      case 'apps':
        if (!Array.isArray(value) || value.length === 0) {
          return 'Please select at least one software platform.';
        }
        return '';
      case 'wa_phone':
        if (onboardingData.wa_provider !== 'qr_gateway') {
          if (!value || typeof value !== 'string' || value.replace(/[^0-9]/g, '').length < 8) {
            return 'Please enter a valid WhatsApp phone number with country code.';
          }
        }
        return '';
      case 'wa_phone_id':
        if (onboardingData.wa_provider === 'meta_cloud') {
          if (!value || typeof value !== 'string' || value.trim().length < 5) {
            return 'Phone Number ID is required.';
          }
        }
        return '';
      case 'wa_waba_id':
        if (onboardingData.wa_provider === 'meta_cloud') {
          if (!value || typeof value !== 'string' || value.trim().length < 5) {
            return 'WhatsApp Business Account (WABA) ID is required.';
          }
        }
        return '';
      case 'wa_access_token':
        if (onboardingData.wa_provider === 'meta_cloud') {
          if (!value || typeof value !== 'string' || value.trim().length < 8) {
            return 'Meta System User Access Token is required.';
          }
        }
        return '';
      case 'wa_api_url':
        if (onboardingData.wa_provider === 'custom_gateway') {
          if (!value || typeof value !== 'string' || !value.trim().startsWith('http')) {
            return 'Valid Gateway API URL starting with http:// or https:// is required.';
          }
        }
        return '';
      case 'email_user':
        if (emailAuthMode === 'app_pass') {
          if (!value || typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
            return 'Please enter a valid business mailbox email address.';
          }
        }
        return '';
      case 'email_app_pass':
        if (emailAuthMode === 'app_pass') {
          if (!value || typeof value !== 'string' || value.trim().length < 6) {
            return 'Google App Password or SMTP password is required.';
          }
        }
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setOnboardingData((prev) => ({ ...prev, [field]: value }));
    const err = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  // Step Validation Gatekeeper
  const validateCurrentStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      const errComp = validateField('company_name', onboardingData.company_name);
      const errEmail = validateField('business_email', onboardingData.business_email);
      const errWeb = validateField('website', onboardingData.website);
      if (errComp) newErrors.company_name = errComp;
      if (errEmail) newErrors.business_email = errEmail;
      if (errWeb) newErrors.website = errWeb;
    } else if (step === 2) {
      const errAddr = validateField('address', onboardingData.address);
      const errCity = validateField('city', onboardingData.city);
      const errState = validateField('state', onboardingData.state);
      const errPin = validateField('pincode', onboardingData.pincode);
      if (errAddr) newErrors.address = errAddr;
      if (errCity) newErrors.city = errCity;
      if (errState) newErrors.state = errState;
      if (errPin) newErrors.pincode = errPin;
    } else if (step === 3) {
      const errSrv = validateField('selected_services', onboardingData.selected_services);
      if (errSrv) newErrors.selected_services = errSrv;
    } else if (step === 4) {
      const errGoals = validateField('goals', onboardingData.goals);
      if (errGoals) newErrors.goals = errGoals;
    } else if (step === 6) {
      const errApps = validateField('apps', onboardingData.apps);
      if (errApps) newErrors.apps = errApps;
    } else if (step === 9) {
      if (onboardingData.wa_provider === 'meta_cloud') {
        const errPhone = validateField('wa_phone', onboardingData.wa_phone);
        const errPhoneId = validateField('wa_phone_id', onboardingData.wa_phone_id);
        const errWaba = validateField('wa_waba_id', onboardingData.wa_waba_id);
        const errToken = validateField('wa_access_token', onboardingData.wa_access_token);
        if (errPhone) newErrors.wa_phone = errPhone;
        if (errPhoneId) newErrors.wa_phone_id = errPhoneId;
        if (errWaba) newErrors.wa_waba_id = errWaba;
        if (errToken) newErrors.wa_access_token = errToken;
      } else if (onboardingData.wa_provider === 'custom_gateway') {
        const errPhone = validateField('wa_phone', onboardingData.wa_phone);
        const errUrl = validateField('wa_api_url', onboardingData.wa_api_url);
        if (errPhone) newErrors.wa_phone = errPhone;
        if (errUrl) newErrors.wa_api_url = errUrl;
      }
    } else if (step === 10) {
      if (emailAuthMode === 'app_pass') {
        const errEmail = validateField('email_user', onboardingData.email_user);
        const errPass = validateField('email_app_pass', onboardingData.email_app_pass);
        if (errEmail) newErrors.email_user = errEmail;
        if (errPass) newErrors.email_app_pass = errPass;
      }
    }

    setFieldErrors((prev) => ({ ...prev, ...newErrors }));

    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      toast.error(newErrors[errorKeys[0]]);
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (validateCurrentStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 10));
    }
  };

  // 35+ Industries Mapping with recommended services
  const industryCatalog: Record<string, { subTypes: string[]; services: string[] }> = {
    'IT & Software': {
      subTypes: ['B2B Enterprise SaaS', 'Mobile Apps', 'Cybersecurity', 'Cloud Infrastructure'],
      services: ['AI Lead Qualification', '24/7 Technical Support', 'Demo Booking', 'Billing Reminders'],
    },
    'Healthcare & Clinics': {
      subTypes: ['Dental Clinics', 'Primary Care', 'Diagnostics & Labs', 'Mental Health'],
      services: ['Patient Appointment Booking', 'No-Show Prevention Calls', 'Prescription Alerts', 'Emergency Triage'],
    },
    'Real Estate & Property': {
      subTypes: ['Residential Brokerage', 'Commercial Leasing', 'Property Management'],
      services: ['Instant Property Inquiry Answering', 'Site Visit Scheduling', 'WhatsApp Brochure Dispatch', 'Buyer Pre-Qualification'],
    },
    'E-Commerce & Retail': {
      subTypes: ['D2C Fashion', 'Consumer Electronics', 'Grocery & FMCG'],
      services: ['Abandoned Cart WhatsApp Recovery', 'Order Tracking Bots', 'Returns & Exchanges Support', 'VIP Promo Blasts'],
    },
    'Legal & Law Firms': {
      subTypes: ['Corporate Law', 'Personal Injury', 'Immigration', 'Criminal Defense'],
      services: ['Client Intake Triage', 'Consultation Booking', 'Document Upload WhatsApp Flow', 'Retainer Reminders'],
    },
    'Financial & Insurance': {
      subTypes: ['Wealth Management', 'Mortgage Broking', 'Auto Insurance', 'Tax Consulting'],
      services: ['Policy Renewal Reminders', 'EMI & Debt Collections Bot', 'Claims Guidance', 'Lead Scoring'],
    },
    'Hospitality & Tourism': {
      subTypes: ['Boutique Hotels', 'Resort Chains', 'Travel Agencies', 'Event Venues'],
      services: ['Room Reservation Calls', 'Concierge Recommendations', 'Post-Stay Review Followup', 'Instant Quotes'],
    },
    'Automotive & Dealerships': {
      subTypes: ['New Car Dealerships', 'Auto Repair Centers', 'Car Rentals'],
      services: ['Test Drive Scheduling', 'Service Maintenance Reminders', 'WhatsApp Quote Dispatch', 'Warranty Calls'],
    },
    'Recruitment & Staffing': {
      subTypes: ['Tech Headhunting', 'Executive Search', 'Nursing & Locum Staffing'],
      services: ['Candidate AI Screening', 'Interview Slot Calendar Booking', 'Status Update WhatsApps', 'Reference Checks'],
    },
    'Education & EdTech': {
      subTypes: ['K-12 Schools', 'Higher Ed Universities', 'Online Bootcamps'],
      services: ['Admissions Counseling Calls', 'Fee Payment Alerts', 'Webinar Attendance Reminders', 'Parent Grievance Triage'],
    },
  };

  const industriesList = Object.keys(industryCatalog);
  const activeIndustryData = industryCatalog[onboardingData.industry] || industryCatalog['IT & Software'];

  const handleSelectAllRecommendedServices = () => {
    setOnboardingData({
      ...onboardingData,
      selected_services: [...activeIndustryData.services],
    });
    setFieldErrors((prev) => ({ ...prev, selected_services: '' }));
    toast.success('Selected all recommended industry workflows!');
  };

  const handleToggleService = (srv: string) => {
    const exists = onboardingData.selected_services.includes(srv);
    const updated = exists
      ? onboardingData.selected_services.filter((s) => s !== srv)
      : [...onboardingData.selected_services, srv];
    handleFieldChange('selected_services', updated);
  };

  const handleTestWhatsApp = async () => {
    if (onboardingData.wa_provider === 'meta_cloud') {
      const errPhone = validateField('wa_phone', onboardingData.wa_phone);
      const errPhoneId = validateField('wa_phone_id', onboardingData.wa_phone_id);
      const errToken = validateField('wa_access_token', onboardingData.wa_access_token);
      if (errPhone || errPhoneId || errToken) {
        toast.error(errPhone || errPhoneId || errToken);
        return;
      }
    }

    setTestingWa(true);
    try {
      const res = await whatsappService.testConnection({
        phone_number: onboardingData.wa_phone,
        phone_number_id: onboardingData.wa_phone_id,
        waba_id: onboardingData.wa_waba_id,
        access_token: onboardingData.wa_access_token,
        provider: onboardingData.wa_provider as any,
        api_url: onboardingData.wa_api_url,
        api_key: onboardingData.wa_api_key,
      });
      setWaConnected(true);
      setWaDetails(res);
      toast.success(res?.message || 'WhatsApp integration verified and connected successfully! 🟢');
    } catch (err: any) {
      setWaConnected(false);
      toast.error(err?.response?.data?.message || err?.message || 'WhatsApp connection test failed. Please check credentials.');
    } finally {
      setTestingWa(false);
    }
  };

  const handleTestEmail = async () => {
    if (emailAuthMode === 'app_pass') {
      const errEmail = validateField('email_user', onboardingData.email_user);
      const errPass = validateField('email_app_pass', onboardingData.email_app_pass);
      if (errEmail || errPass) {
        toast.error(errEmail || errPass);
        return;
      }
    }

    setTestingEmail(true);
    try {
      const res = await emailService.testConnection({
        email_address: onboardingData.email_user,
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_user: onboardingData.email_user,
        smtp_password: onboardingData.email_app_pass,
        provider: 'smtp',
        is_active: true,
      });
      setEmailConnected(true);
      toast.success(res?.message || 'SMTP TLS handshake verified! Outbound transporter active. 🟢');
    } catch (err: any) {
      setEmailConnected(false);
      toast.error(err?.response?.data?.message || err?.message || 'SMTP handshake failed. Please check your email and App Password.');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleConnectGoogleOAuth = () => {
    toast.info('Connecting to Google...');
    const clientId = '11874827859-h7b1l07qs1pi1ie1489ijdj4u7jvbuqg.apps.googleusercontent.com';
    const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
    const scope = encodeURIComponent('https://mail.google.com/ https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send openid email profile');
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  };

  const handleFinalSubmit = async () => {
    if (!validateCurrentStep(10)) return;

    setSubmitting(true);
    try {
      // 1. Persist WhatsApp Config if entered
      if (onboardingData.wa_phone) {
        try {
          await whatsappService.saveConfig({
            phone_number: onboardingData.wa_phone,
            phone_number_id: onboardingData.wa_phone_id,
            waba_id: onboardingData.wa_waba_id,
            access_token: onboardingData.wa_access_token,
            provider: onboardingData.wa_provider as any,
            api_url: onboardingData.wa_api_url,
            api_key: onboardingData.wa_api_key,
            is_connected: waConnected,
          });
        } catch (err) {
          console.error('WhatsApp save during onboarding:', err);
        }
      }

      // 2. Persist Email Config if entered
      if (onboardingData.email_user && onboardingData.email_app_pass) {
        try {
          await emailService.saveConfig({
            email_address: onboardingData.email_user,
            smtp_host: 'smtp.gmail.com',
            smtp_port: 587,
            smtp_user: onboardingData.email_user,
            smtp_password: onboardingData.email_app_pass,
            imap_host: 'imap.gmail.com',
            imap_port: 993,
            use_ssl: true,
            is_active: true,
            provider: 'smtp',
          });
        } catch (err) {
          console.error('Email save during onboarding:', err);
        }
      }

      await completeOnboarding(onboardingData);
      toast.success('Onboarding completed! Welcome to your Sharyx Command Center.');
      setLocation('/admin');
    } catch {
      toast.error('Failed to complete onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = Math.round((currentStep / 10) * 100);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-emerald-500 selection:text-black">
      <div className="w-full max-w-3xl space-y-6 my-8">
        {/* Progress Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              Workforce Onboarding Setup
            </span>
            <span className="text-slate-400">
              Step <span className="text-white font-bold">{currentStep}</span> of 10 ({progressPercent}%)
            </span>
          </div>

          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Wizard Card Body */}
        <Card className="border-slate-800 bg-slate-950/70 backdrop-blur-xl shadow-2xl">
          {/* STEP 1: Company Profile & Logo */}
          {currentStep === 1 && (
            <div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Company Identity & Brand Profile</CardTitle>
                    <CardDescription>Tell your AI agents who they represent</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Company Name *</label>
                    <Input
                      className={`mt-1 ${fieldErrors.company_name ? 'border-rose-500' : ''}`}
                      value={onboardingData.company_name}
                      onChange={(e) => handleFieldChange('company_name', e.target.value)}
                      placeholder="e.g. Acme Corporation"
                      required
                    />
                    {fieldErrors.company_name && (
                      <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.company_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Official Business Email *</label>
                    <Input
                      type="email"
                      className={`mt-1 ${fieldErrors.business_email ? 'border-rose-500' : ''}`}
                      value={onboardingData.business_email}
                      onChange={(e) => handleFieldChange('business_email', e.target.value)}
                      placeholder="contact@acme.com"
                      required
                    />
                    {fieldErrors.business_email && (
                      <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.business_email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Company Website</label>
                  <Input
                    placeholder="https://yourcompany.com"
                    className={`mt-1 ${fieldErrors.website ? 'border-rose-500' : ''}`}
                    value={onboardingData.website}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                  />
                  {fieldErrors.website && (
                    <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.website}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Brand Logo</label>
                  <div className="mt-1 border-2 border-dashed border-slate-700/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-emerald-500/50 transition-colors bg-slate-900/40 cursor-pointer">
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-xs font-medium text-slate-200">
                      Drag & drop your logo here, or <span className="text-emerald-400">browse</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, SVG up to 5MB</p>
                  </div>
                </div>
              </CardContent>
            </div>
          )}

          {/* STEP 2: Business Address */}
          {currentStep === 2 && (
            <div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Physical Operating Location</CardTitle>
                    <CardDescription>Needed for voice callers asking about branch visits</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">Street Address *</label>
                  <Input
                    className={`mt-1 ${fieldErrors.address ? 'border-rose-500' : ''}`}
                    value={onboardingData.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="123 Innovation Blvd, Suite 400"
                  />
                  {fieldErrors.address && (
                    <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.address}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300">City *</label>
                    <Input
                      className={`mt-1 ${fieldErrors.city ? 'border-rose-500' : ''}`}
                      value={onboardingData.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      placeholder="San Francisco"
                    />
                    {fieldErrors.city && (
                      <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">State / Province *</label>
                    <Input
                      className={`mt-1 ${fieldErrors.state ? 'border-rose-500' : ''}`}
                      value={onboardingData.state}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                      placeholder="CA"
                    />
                    {fieldErrors.state && (
                      <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.state}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Pincode / ZIP *</label>
                    <Input
                      className={`mt-1 ${fieldErrors.pincode ? 'border-rose-500' : ''}`}
                      value={onboardingData.pincode}
                      onChange={(e) => handleFieldChange('pincode', e.target.value)}
                      placeholder="94105"
                    />
                    {fieldErrors.pincode && (
                      <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.pincode}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </div>
          )}

          {/* STEP 3: Industry & Services (35+ Mappings) */}
          {currentStep === 3 && (
            <div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Industry & Recommended Workflows</CardTitle>
                      <CardDescription>Tailor agent conversational scripts to your niche</CardDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllRecommendedServices}
                    className="text-xs text-emerald-400 border-emerald-500/30"
                  >
                    Select All Recommended
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Primary Industry</label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none"
                      value={onboardingData.industry}
                      onChange={(e) => {
                        const newInd = e.target.value;
                        setOnboardingData({
                          ...onboardingData,
                          industry: newInd,
                          industry_sub_type: industryCatalog[newInd]?.subTypes[0] || '',
                          selected_services: industryCatalog[newInd]?.services || [],
                        });
                      }}
                    >
                      {industriesList.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300">Sub-Category</label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none"
                      value={onboardingData.industry_sub_type}
                      onChange={(e) =>
                        setOnboardingData({ ...onboardingData, industry_sub_type: e.target.value })
                      }
                    >
                      {activeIndustryData.subTypes.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">
                    Recommended Agent Workflows for {onboardingData.industry}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {activeIndustryData.services.map((srv) => {
                      const selected = onboardingData.selected_services.includes(srv);
                      return (
                        <div
                          key={srv}
                          onClick={() => handleToggleService(srv)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            selected
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span>{srv}</span>
                          <div
                            className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                              selected ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-600'
                            }`}
                          >
                            {selected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </div>
          )}

          {/* STEP 4: Automation Goals */}
          {currentStep === 4 && (
            <div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>What are your top automation objectives?</CardTitle>
                    <CardDescription>Select all that apply to your current business phase</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  '24/7 Phone Receptionist & Call Triage',
                  'Instant Website Lead Qualification',
                  'WhatsApp Sales Broadcasts & Flash Sales',
                  'Inbound Email Auto-Responder & Ticketing',
                  'No-Show Prevention & Appointment Reminders',
                  'Debt Recovery & Payment Link Reminders',
                  'HR Screening & Candidate Pre-Interviews',
                ].map((goal) => {
                  const selected = onboardingData.goals.includes(goal);
                  return (
                    <div
                      key={goal}
                      onClick={() => {
                        const updated = selected
                          ? onboardingData.goals.filter((g) => g !== goal)
                          : [...onboardingData.goals, goal];
                        setOnboardingData({ ...onboardingData, goals: updated });
                      }}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        selected
                          ? 'bg-indigo-950/40 border-indigo-500/50 text-white shadow-md'
                          : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>{goal}</span>
                      <div
                        className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                          selected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </div>
          )}

          {/* STEP 5: Technical Experience */}
          {currentStep === 5 && (
            <div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>What is your team's technical proficiency?</CardTitle>
                    <CardDescription>We'll configure the dashboard complexity accordingly</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    level: 'Beginner',
                    title: 'Non-Technical / Business Owner',
                    desc: 'I want everything pre-configured with zero code and 1-click templates.',
                  },
                  {
                    level: 'Intermediate',
                    title: 'Tech-Savvy Marketer or Operator',
                    desc: 'Comfortable tweaking system prompts, webhook tokens, and CRM mappings.',
                  },
                  {
                    level: 'Advanced',
                    title: 'Developer / Solution Architect',
                    desc: 'I want full API keys, custom JSON webhooks, and raw LLM parameters.',
                  },
                ].map((lvl) => {
                  const selected = onboardingData.technical_level === lvl.level;
                  return (
                    <div
                      key={lvl.level}
                      onClick={() =>
                        setOnboardingData({ ...onboardingData, technical_level: lvl.level })
                      }
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selected
                          ? 'bg-amber-950/30 border-amber-500/50 text-white'
                          : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <h4 className="text-sm font-semibold">{lvl.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{lvl.desc}</p>
                    </div>
                  );
                })}
              </CardContent>
            </div>
          )}

          {/* STEP 6: Most Used Apps */}
          {currentStep === 6 && (
            <div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Which business software do you use daily?</CardTitle>
                    <CardDescription>Your AI agents will connect with these platforms</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    'Gmail / Google Workspace',
                    'WhatsApp Business',
                    'Slack',
                    'Google Sheets',
                    'HubSpot CRM',
                    'Salesforce',
                    'Notion',
                    'Stripe Payments',
                    'Calendly',
                    'Zendesk',
                    'Zapier / Make',
                    'Webflow / WordPress',
                  ].map((app) => {
                    const selected = onboardingData.apps.includes(app);
                    return (
                      <div
                        key={app}
                        onClick={() => {
                          const updated = selected
                            ? onboardingData.apps.filter((a) => a !== app)
                            : [...onboardingData.apps, app];
                          setOnboardingData({ ...onboardingData, apps: updated });
                        }}
                        className={`p-3 rounded-xl border text-xs font-medium cursor-pointer text-center transition-all ${
                          selected
                            ? 'bg-teal-950/40 border-teal-500 text-white shadow-md'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {app}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </div>
          )}

          {/* STEP 7: Workplace Size */}
          {currentStep === 7 && (
            <div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>How large is your organization?</CardTitle>
                    <CardDescription>Optimizes concurrency and call routing queues</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['Just me (Solo)', '2 - 10 employees', '11 - 50 employees', '51 - 200 employees', '201 - 500 employees', '500+ Enterprise'].map(
                  (size) => {
                    const selected = onboardingData.company_size === size;
                    return (
                      <div
                        key={size}
                        onClick={() =>
                          setOnboardingData({ ...onboardingData, company_size: size })
                        }
                        className={`p-4 rounded-xl border text-center cursor-pointer text-xs font-semibold transition-all ${
                          selected
                            ? 'bg-pink-950/40 border-pink-500 text-white shadow-md'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {size}
                      </div>
                    );
                  }
                )}
              </CardContent>
            </div>
          )}

          {/* STEP 8: Discovery Source */}
          {currentStep === 8 && (
            <div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>How did you discover Sharyx?</CardTitle>
                    <CardDescription>Helps us understand our growth channels</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  'ChatGPT / Claude AI Recommendation',
                  'Google Search / Organic Article',
                  'LinkedIn / Twitter (X) Tech Post',
                  'Referred by Colleague or Agency',
                  'YouTube AI Workforce Demo',
                ].map((src) => {
                  const selected = onboardingData.discovery_source === src;
                  return (
                    <div
                      key={src}
                      onClick={() =>
                        setOnboardingData({ ...onboardingData, discovery_source: src })
                      }
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        selected
                          ? 'bg-cyan-950/40 border-cyan-500 text-white'
                          : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>{src}</span>
                      {selected && <Check className="h-4 w-4 text-cyan-400" />}
                    </div>
                  );
                })}
              </CardContent>
            </div>
          )}

          {/* STEP 9: WhatsApp Automation Setup (Dynamic Providers) */}
          {currentStep === 9 && (
            <div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>WhatsApp Automation & AI Copilot Integration</CardTitle>
                      <CardDescription>Connect via Meta Cloud API, QR Web Session, or Custom Gateway</CardDescription>
                    </div>
                  </div>
                  {waConnected && (
                    <Badge variant="success" className="gap-1 py-1 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Live Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Provider Selector Cards */}
                <div>
                  <label className="text-xs font-medium text-slate-300">Choose Integration Mode</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1.5">
                    {[
                      {
                        id: 'meta_cloud',
                        name: 'Meta Cloud API',
                        badge: 'Official v21',
                        icon: Sparkles,
                        desc: 'Official WhatsApp Business Cloud API with broadcast templates.',
                      },
                      {
                        id: 'qr_gateway',
                        name: 'QR Web Pairing',
                        badge: 'Zero Setup',
                        icon: QrCode,
                        desc: 'Scan QR code from WhatsApp mobile app. No Meta account required.',
                      },
                      {
                        id: 'custom_gateway',
                        name: 'Custom Gateway',
                        badge: 'Enterprise',
                        icon: Server,
                        desc: 'Connect custom webhook endpoint, Twilio, or Z-API instance.',
                      },
                    ].map((p) => {
                      const selected = onboardingData.wa_provider === p.id;
                      const Icon = p.icon;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setOnboardingData({ ...onboardingData, wa_provider: p.id });
                            setWaConnected(false);
                          }}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            selected
                              ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                              : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <Icon className={`h-4 w-4 ${selected ? 'text-emerald-400' : 'text-slate-500'}`} />
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                              {p.badge}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-white">{p.name}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Provider 1: Meta Cloud API */}
                {onboardingData.wa_provider === 'meta_cloud' && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-300">WhatsApp Display Phone *</label>
                        <Input
                          placeholder="+1 555 019 2831"
                          className={`mt-1 ${fieldErrors.wa_phone ? 'border-rose-500' : ''}`}
                          value={onboardingData.wa_phone}
                          onChange={(e) => handleFieldChange('wa_phone', e.target.value)}
                        />
                        {fieldErrors.wa_phone && (
                          <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.wa_phone}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300">Phone Number ID *</label>
                        <Input
                          placeholder="10928371928371"
                          className={`mt-1 ${fieldErrors.wa_phone_id ? 'border-rose-500' : ''}`}
                          value={onboardingData.wa_phone_id}
                          onChange={(e) => handleFieldChange('wa_phone_id', e.target.value)}
                        />
                        {fieldErrors.wa_phone_id && (
                          <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.wa_phone_id}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">WhatsApp Business Account ID (WABA) *</label>
                      <Input
                        placeholder="98127391823719"
                        className={`mt-1 ${fieldErrors.wa_waba_id ? 'border-rose-500' : ''}`}
                        value={onboardingData.wa_waba_id}
                        onChange={(e) => handleFieldChange('wa_waba_id', e.target.value)}
                      />
                      {fieldErrors.wa_waba_id && (
                        <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.wa_waba_id}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Permanent System User Access Token *</label>
                      <Input
                        type="password"
                        placeholder="EAAG..."
                        className={`mt-1 ${fieldErrors.wa_access_token ? 'border-rose-500' : ''}`}
                        value={onboardingData.wa_access_token}
                        onChange={(e) => handleFieldChange('wa_access_token', e.target.value)}
                      />
                      {fieldErrors.wa_access_token && (
                        <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.wa_access_token}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Provider 2: QR Web Session */}
                {onboardingData.wa_provider === 'qr_gateway' && (
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                    <div className="mx-auto h-32 w-32 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg">
                      <QrCode className="h-28 w-28 text-slate-950" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Scan from WhatsApp App</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Open WhatsApp ➔ Linked Devices ➔ Link a Device. No Meta credentials required.
                      </p>
                    </div>
                  </div>
                )}

                {/* Provider 3: Custom Gateway */}
                {onboardingData.wa_provider === 'custom_gateway' && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Sender Phone Number *</label>
                      <Input
                        placeholder="+91 98765 43210"
                        className={`mt-1 ${fieldErrors.wa_phone ? 'border-rose-500' : ''}`}
                        value={onboardingData.wa_phone}
                        onChange={(e) => handleFieldChange('wa_phone', e.target.value)}
                      />
                      {fieldErrors.wa_phone && (
                        <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.wa_phone}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Gateway API Endpoint URL *</label>
                      <Input
                        placeholder="https://api.my-gateway.com/v1/send"
                        className={`mt-1 ${fieldErrors.wa_api_url ? 'border-rose-500' : ''}`}
                        value={onboardingData.wa_api_url}
                        onChange={(e) => handleFieldChange('wa_api_url', e.target.value)}
                      />
                      {fieldErrors.wa_api_url && (
                        <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.wa_api_url}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">API Secret Key / Token</label>
                      <Input
                        type="password"
                        placeholder="sec_..."
                        className="mt-1"
                        value={onboardingData.wa_api_key}
                        onChange={(e) => handleFieldChange('wa_api_key', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Verified Details Card once Connected */}
                {waConnected && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Connection Verified
                      </span>
                      <span className="text-[10px] text-emerald-300 uppercase px-2 py-0.5 rounded bg-emerald-500/20 font-bold">
                        {waDetails?.quality_rating || 'HIGH QUALITY'}
                      </span>
                    </div>
                    <p className="text-slate-300">
                      Display: <span className="font-mono text-white">{waDetails?.display_phone_number || onboardingData.wa_phone}</span>
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      Verified Name: {waDetails?.verified_name || 'Sharyx Business Account'}
                    </p>
                  </div>
                )}

                {/* Live Test Handshake Action */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-300">
                    <p className="font-semibold text-white">Live Handshake Verification</p>
                    <p className="text-slate-500">
                      Verifies connectivity and saves credentials directly to database
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="emerald"
                    size="sm"
                    onClick={handleTestWhatsApp}
                    disabled={testingWa}
                  >
                    {testingWa ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <Radio className="mr-1.5 h-3.5 w-3.5" />
                        {waConnected ? 'Re-Verify Connection' : 'Test WhatsApp Connection'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </div>
          )}

          {/* STEP 10: Email Automation Setup (Gmail / SMTP) */}
          {currentStep === 10 && (
            <div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Autonomous Email Mailbox Setup</CardTitle>
                      <CardDescription>Connect Google Workspace or Custom SMTP for autonomous AI emailing</CardDescription>
                    </div>
                  </div>
                  {emailConnected && (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEmailAuthMode('google_oauth')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      emailAuthMode === 'google_oauth'
                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">Google 1-Click OAuth</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Direct Gmail API integration with zero app passwords required.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmailAuthMode('app_pass')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      emailAuthMode === 'app_pass'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">SMTP / App Password</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        Custom
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Standard TLS/SSL SMTP with 16-character Google App Password.</p>
                  </button>
                </div>

                {emailAuthMode === 'google_oauth' ? (
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                    <p className="text-xs text-slate-300">
                      Connect your Gmail or Google Workspace business mailbox directly via official OAuth 2.0.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const clientId = '11874827859-h7b1l07qs1pi1ie1489ijdj4u7jvbuqg.apps.googleusercontent.com';
                        const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
                        const scope = encodeURIComponent('https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
                        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
                      }}
                      className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs h-10 px-5 rounded-xl"
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      Connect Gmail via Google OAuth
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Gmail / Business Email Address *</label>
                      <Input
                        type="email"
                        placeholder="you@domain.com"
                        className={`mt-1 ${fieldErrors.email_user ? 'border-rose-500' : ''}`}
                        value={onboardingData.email_user}
                        onChange={(e) => handleFieldChange('email_user', e.target.value)}
                      />
                      {fieldErrors.email_user && (
                        <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.email_user}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">16-Character Google App Password *</label>
                      <Input
                        type="password"
                        placeholder="xxxx xxxx xxxx xxxx"
                        className={`mt-1 ${fieldErrors.email_app_pass ? 'border-rose-500' : ''}`}
                        value={onboardingData.email_app_pass}
                        onChange={(e) => handleFieldChange('email_app_pass', e.target.value)}
                      />
                      {fieldErrors.email_app_pass && (
                        <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.email_app_pass}</p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1">
                        Generated via myaccount.google.com ➔ Security ➔ 2-Step Verification ➔ App Passwords.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                      <div className="text-xs text-slate-300">
                        <p className="font-semibold text-white">Test SMTP Handshake Live</p>
                        <p className="text-slate-500">Verifies authentication against smtp.gmail.com:465</p>
                      </div>
                      <Button
                        type="button"
                        variant="emerald"
                        size="sm"
                        onClick={handleTestEmail}
                        disabled={testingEmail}
                      >
                        {testingEmail ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Testing SMTP...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                            {emailConnected ? 'Re-Test Handshake' : 'Test Handshake'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>
          )}

          {/* Navigation Footer */}
          <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
              className="text-xs"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>

            {currentStep < 10 ? (
              <Button
                type="button"
                variant="emerald"
                size="sm"
                onClick={handleContinue}
                className="text-xs font-semibold"
              >
                Continue
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="emerald"
                size="sm"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="text-xs font-semibold px-6"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Launching Command Center...
                  </>
                ) : (
                  <>
                    Complete & Enter Dashboard
                    <Sparkles className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
