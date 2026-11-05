// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import { useLocation } from 'wouter';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge';
// import { useAuth } from '@/lib/auth';
// import {
//   Building2,
//   MapPin,
//   Briefcase,
//   Target,
//   Cpu,
//   Smartphone,
//   Users,
//   Compass,
//   MessageSquare,
//   Mail,
//   ArrowRight,
//   ArrowLeft,
//   CheckCircle2,
//   Sparkles,
//   Upload,
//   Radio,
//   Loader2,
//   ShieldCheck,
//   Check,
//   QrCode,
//   Server,
//   Key,
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { whatsappService } from '@/service/whatsappService';
// import { emailService } from '@/service/emailService';

// export const OnboardingWizard: React.FC = () => {
//   const [, setLocation] = useLocation();
//   const { user, completeOnboarding } = useAuth();

//   const [currentStep, setCurrentStep] = useState(1);
//   const [hydrated, setHydrated] = useState(false);
//   const [savingStep, setSavingStep] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [testingWa, setTestingWa] = useState(false);
//   const [waConnected, setWaConnected] = useState(false);
//   const [waDetails, setWaDetails] = useState<any>(null);
//   const [testingEmail, setTestingEmail] = useState(false);
//   const [emailConnected, setEmailConnected] = useState(false);
//   const [emailAuthMode, setEmailAuthMode] = useState<'app_pass' | 'google_oauth'>('app_pass');
//   const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
//   //state for connected email 
//   const [oauthEmailStatus, setOauthEmailStatus] = useState<any>(null);
//   // Form State across all 10 steps
//   const [onboardingData, setOnboardingData] = useState({
//     // Step 1 (only what the account already knows about itself)
//     company_name: user?.company_name || '',
//     business_email: user?.email || '',
//     website: '',
//     logo_url: '',
//     // Step 2
//     address: '',
//     city: '',
//     state: '',
//     pincode: '',
//     // Step 3
//     industry: '',
//     industry_sub_type: '',
//     selected_services: [] as string[],
//     // Step 4
//     goals: [] as string[],
//     // Step 5
//     technical_level: '',
//     // Step 6
//     apps: [] as string[],
//     // Step 7
//     company_size: '',
//     // Step 8
//     discovery_source: '',
//     // Step 9: WhatsApp (secrets are typed by the user and sent only to the tenant-scoped WhatsApp API)
//     wa_provider: 'meta_cloud', // 'meta_cloud' | 'qr_gateway' | 'custom_gateway'
//     wa_phone: '',
//     wa_phone_id: '',
//     wa_waba_id: '',
//     wa_access_token: '',
//     wa_api_url: '',
//     wa_api_key: '',
//     // Step 10: Email
//     email_user: user?.email || '',
//     email_app_pass: '',
//   });

//   // Resume where the tenant left off: saved answers + furthest step come from the database.
//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       try {
//         const res = await axios.get('/api/v1/Onboarding/State');
//         const state = res.data;
//         if (cancelled) return;
//         if (state?.onboarding_completed) {
//           setLocation('/admin');
//           return;
//         }
//         const saved = state?.data || {};
//         setOnboardingData((prev) => ({
//           ...prev,
//           ...Object.fromEntries(Object.entries(saved).filter(([, v]) => v !== undefined && v !== null)),
//         }));
//         if (saved.email_auth_mode === 'app_pass' || saved.email_auth_mode === 'google_oauth') {
//           setEmailAuthMode(saved.email_auth_mode);
//         }
//         // Fetch if email is already connected in the database
//         try {
//           const emailStatus = await emailService.getOAuthStatus();
//           if (emailStatus && emailStatus.isConnected) {
//             setEmailConnected(true);
//             setOauthEmailStatus(emailStatus);
//             if (emailStatus.email_address) {
//               setOnboardingData((prev) => ({ ...prev, email_user: emailStatus.email_address }));
//             }
//           }
//         } catch (e) {
//           console.warn('Could not load email status');
//         }
//         setCurrentStep(Math.min(Math.max(Number(state?.onboarding_step) || 1, 1), 10));
//       } catch {
//         toast.error('Could not load your saved onboarding progress. Please refresh.');
//       } finally {
//         if (!cancelled) setHydrated(true);
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Real-time Field Validator
//   const validateField = (field: string, value: any): string => {
//     switch (field) {
//       case 'company_name':
//         if (!value || typeof value !== 'string' || value.trim().length < 2) {
//           return 'Company name must be at least 2 characters.';
//         }
//         return '';
//       case 'business_email':
//         if (!value || typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
//           return 'Please provide a valid official business email (e.g. name@company.com).';
//         }
//         return '';
//       case 'website':
//         if (value && typeof value === 'string' && value.trim()) {
//           const v = value.trim();
//           if (!v.includes('.') || v.length < 4) {
//             return 'Please enter a valid website domain or URL.';
//           }
//         }
//         return '';
//       case 'address':
//         if (!value || typeof value !== 'string' || value.trim().length < 3) {
//           return 'Street address is required.';
//         }
//         return '';
//       case 'city':
//         if (!value || typeof value !== 'string' || value.trim().length < 2) {
//           return 'City is required.';
//         }
//         return '';
//       case 'state':
//         if (!value || typeof value !== 'string' || value.trim().length < 2) {
//           return 'State / Province is required.';
//         }
//         return '';
//       case 'pincode':
//         if (!value || typeof value !== 'string' || value.trim().length < 3) {
//           return 'Postal code / ZIP is required.';
//         }
//         return '';
//       case 'selected_services':
//         if (!Array.isArray(value) || value.length === 0) {
//           return 'Please select at least one recommended workflow.';
//         }
//         return '';
//       case 'goals':
//         if (!Array.isArray(value) || value.length === 0) {
//           return 'Please select at least one automation objective.';
//         }
//         return '';
//       case 'apps':
//         if (!Array.isArray(value) || value.length === 0) {
//           return 'Please select at least one software platform.';
//         }
//         return '';
//       case 'wa_phone':
//         if (onboardingData.wa_provider !== 'qr_gateway') {
//           if (!value || typeof value !== 'string' || value.replace(/[^0-9]/g, '').length < 8) {
//             return 'Please enter a valid WhatsApp phone number with country code.';
//           }
//         }
//         return '';
//       case 'wa_phone_id':
//         if (onboardingData.wa_provider === 'meta_cloud') {
//           if (!value || typeof value !== 'string' || value.trim().length < 5) {
//             return 'Phone Number ID is required.';
//           }
//         }
//         return '';
//       case 'wa_waba_id':
//         if (onboardingData.wa_provider === 'meta_cloud') {
//           if (!value || typeof value !== 'string' || value.trim().length < 5) {
//             return 'WhatsApp Business Account (WABA) ID is required.';
//           }
//         }
//         return '';
//       case 'wa_access_token':
//         if (onboardingData.wa_provider === 'meta_cloud') {
//           if (!value || typeof value !== 'string' || value.trim().length < 8) {
//             return 'Meta System User Access Token is required.';
//           }
//         }
//         return '';
//       case 'wa_api_url':
//         if (onboardingData.wa_provider === 'custom_gateway') {
//           if (!value || typeof value !== 'string' || !value.trim().startsWith('http')) {
//             return 'Valid Gateway API URL starting with http:// or https:// is required.';
//           }
//         }
//         return '';
//       case 'email_user':
//         if (emailAuthMode === 'app_pass') {
//           if (!value || typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
//             return 'Please enter a valid business mailbox email address.';
//           }
//         }
//         return '';
//       case 'email_app_pass':
//         if (emailAuthMode === 'app_pass') {
//           if (!value || typeof value !== 'string' || value.trim().length < 6) {
//             return 'Google App Password or SMTP password is required.';
//           }
//         }
//         return '';
//       default:
//         return '';
//     }
//   };

//   const handleFieldChange = (field: string, value: any) => {
//     setOnboardingData((prev) => ({ ...prev, [field]: value }));
//     const err = validateField(field, value);
//     setFieldErrors((prev) => ({ ...prev, [field]: err }));
//   };

//   // Step Validation Gatekeeper
//   const validateCurrentStep = (step: number): boolean => {
//     const newErrors: Record<string, string> = {};

//     if (step === 1) {
//       const errComp = validateField('company_name', onboardingData.company_name);
//       const errEmail = validateField('business_email', onboardingData.business_email);
//       const errWeb = validateField('website', onboardingData.website);
//       if (errComp) newErrors.company_name = errComp;
//       if (errEmail) newErrors.business_email = errEmail;
//       if (errWeb) newErrors.website = errWeb;
//     } else if (step === 2) {
//       const errAddr = validateField('address', onboardingData.address);
//       const errCity = validateField('city', onboardingData.city);
//       const errState = validateField('state', onboardingData.state);
//       const errPin = validateField('pincode', onboardingData.pincode);
//       if (errAddr) newErrors.address = errAddr;
//       if (errCity) newErrors.city = errCity;
//       if (errState) newErrors.state = errState;
//       if (errPin) newErrors.pincode = errPin;
//     } else if (step === 3) {
//       const errSrv = validateField('selected_services', onboardingData.selected_services);
//       if (errSrv) newErrors.selected_services = errSrv;
//     } else if (step === 4) {
//       const errGoals = validateField('goals', onboardingData.goals);
//       if (errGoals) newErrors.goals = errGoals;
//     } else if (step === 6) {
//       const errApps = validateField('apps', onboardingData.apps);
//       if (errApps) newErrors.apps = errApps;
//     } else if (step === 9) {
//       if (onboardingData.wa_provider === 'meta_cloud') {
//         const errPhone = validateField('wa_phone', onboardingData.wa_phone);
//         const errPhoneId = validateField('wa_phone_id', onboardingData.wa_phone_id);
//         const errWaba = validateField('wa_waba_id', onboardingData.wa_waba_id);
//         const errToken = validateField('wa_access_token', onboardingData.wa_access_token);
//         if (errPhone) newErrors.wa_phone = errPhone;
//         if (errPhoneId) newErrors.wa_phone_id = errPhoneId;
//         if (errWaba) newErrors.wa_waba_id = errWaba;
//         if (errToken) newErrors.wa_access_token = errToken;
//       }
//     } else if (step === 10) {
//       if (emailAuthMode === 'app_pass') {
//         const errEmail = validateField('email_user', onboardingData.email_user);
//         const errPass = validateField('email_app_pass', onboardingData.email_app_pass);
//         if (errEmail) newErrors.email_user = errEmail;
//         if (errPass) newErrors.email_app_pass = errPass;
//       }
//     }

//     setFieldErrors((prev) => ({ ...prev, ...newErrors }));

//     const errorKeys = Object.keys(newErrors);
//     if (errorKeys.length > 0) {
//       toast.error(newErrors[errorKeys[0]]);
//       return false;
//     }
//     return true;
//   };

//   const persistStep = async (step: number): Promise<boolean> => {
//     setSavingStep(true);
//     try {
//       await axios.put('/api/v1/Onboarding/Step', {
//         step,
//         data: { ...onboardingData, email_auth_mode: emailAuthMode },
//       });
//       return true;
//     } catch (err: any) {
//       toast.error(err?.response?.data?.message || 'Could not save this step. Please try again.');
//       return false;
//     } finally {
//       setSavingStep(false);
//     }
//   };

//   const handleContinue = async () => {
//     if (!validateCurrentStep(currentStep)) return;
//     // Saved to the database under the signed-in tenant before moving on.
//     if (await persistStep(currentStep)) {
//       setCurrentStep((prev) => Math.min(prev + 1, 10));
//     }
//   };

//   // 35+ Industries Mapping with recommended services
//   const industryCatalog: Record<string, { subTypes: string[]; services: string[] }> = {
//     'IT & Software': {
//       subTypes: ['B2B Enterprise SaaS', 'Mobile Apps', 'Cybersecurity', 'Cloud Infrastructure'],
//       services: ['AI Lead Qualification', '24/7 Technical Support', 'Demo Booking', 'Billing Reminders'],
//     },
//     'Healthcare & Clinics': {
//       subTypes: ['Dental Clinics', 'Primary Care', 'Diagnostics & Labs', 'Mental Health'],
//       services: ['Patient Appointment Booking', 'No-Show Prevention Calls', 'Prescription Alerts', 'Emergency Triage'],
//     },
//     'Real Estate & Property': {
//       subTypes: ['Residential Brokerage', 'Commercial Leasing', 'Property Management'],
//       services: ['Instant Property Inquiry Answering', 'Site Visit Scheduling', 'WhatsApp Brochure Dispatch', 'Buyer Pre-Qualification'],
//     },
//     'E-Commerce & Retail': {
//       subTypes: ['D2C Fashion', 'Consumer Electronics', 'Grocery & FMCG'],
//       services: ['Abandoned Cart WhatsApp Recovery', 'Order Tracking Bots', 'Returns & Exchanges Support', 'VIP Promo Blasts'],
//     },
//     'Legal & Law Firms': {
//       subTypes: ['Corporate Law', 'Personal Injury', 'Immigration', 'Criminal Defense'],
//       services: ['Client Intake Triage', 'Consultation Booking', 'Document Upload WhatsApp Flow', 'Retainer Reminders'],
//     },
//     'Financial & Insurance': {
//       subTypes: ['Wealth Management', 'Mortgage Broking', 'Auto Insurance', 'Tax Consulting'],
//       services: ['Policy Renewal Reminders', 'EMI & Debt Collections Bot', 'Claims Guidance', 'Lead Scoring'],
//     },
//     'Hospitality & Tourism': {
//       subTypes: ['Boutique Hotels', 'Resort Chains', 'Travel Agencies', 'Event Venues'],
//       services: ['Room Reservation Calls', 'Concierge Recommendations', 'Post-Stay Review Followup', 'Instant Quotes'],
//     },
//     'Automotive & Dealerships': {
//       subTypes: ['New Car Dealerships', 'Auto Repair Centers', 'Car Rentals'],
//       services: ['Test Drive Scheduling', 'Service Maintenance Reminders', 'WhatsApp Quote Dispatch', 'Warranty Calls'],
//     },
//     'Recruitment & Staffing': {
//       subTypes: ['Tech Headhunting', 'Executive Search', 'Nursing & Locum Staffing'],
//       services: ['Candidate AI Screening', 'Interview Slot Calendar Booking', 'Status Update WhatsApps', 'Reference Checks'],
//     },
//     'Education & EdTech': {
//       subTypes: ['K-12 Schools', 'Higher Ed Universities', 'Online Bootcamps'],
//       services: ['Admissions Counseling Calls', 'Fee Payment Alerts', 'Webinar Attendance Reminders', 'Parent Grievance Triage'],
//     },
//   };

//   const industriesList = Object.keys(industryCatalog);
//   const activeIndustryData = industryCatalog[onboardingData.industry] || industryCatalog['IT & Software'];

//   const handleSelectAllRecommendedServices = () => {
//     setOnboardingData({
//       ...onboardingData,
//       selected_services: [...activeIndustryData.services],
//     });
//     setFieldErrors((prev) => ({ ...prev, selected_services: '' }));
//     toast.success('Selected all recommended industry workflows!');
//   };

//   const handleToggleService = (srv: string) => {
//     const exists = onboardingData.selected_services.includes(srv);
//     const updated = exists
//       ? onboardingData.selected_services.filter((s) => s !== srv)
//       : [...onboardingData.selected_services, srv];
//     handleFieldChange('selected_services', updated);
//   };

//   const handleTestWhatsApp = async () => {
//     if (onboardingData.wa_provider === 'meta_cloud') {
//       const errPhone = validateField('wa_phone', onboardingData.wa_phone);
//       const errPhoneId = validateField('wa_phone_id', onboardingData.wa_phone_id);
//       const errToken = validateField('wa_access_token', onboardingData.wa_access_token);
//       if (errPhone || errPhoneId || errToken) {
//         toast.error(errPhone || errPhoneId || errToken);
//         return;
//       }
//     }

//     setTestingWa(true);
//     try {
//       const res = await whatsappService.testConnection({
//         phone_number: onboardingData.wa_phone,
//         phone_number_id: onboardingData.wa_phone_id,
//         waba_id: onboardingData.wa_waba_id,
//         access_token: onboardingData.wa_access_token,
//         provider: onboardingData.wa_provider as any,
//         api_url: onboardingData.wa_api_url,
//         api_key: onboardingData.wa_api_key,
//       });
//       setWaConnected(true);
//       setWaDetails(res);
//       toast.success(res?.message || 'WhatsApp integration verified and connected successfully! 🟢');
//     } catch (err: any) {
//       setWaConnected(false);
//       toast.error(err?.response?.data?.message || err?.message || 'WhatsApp connection test failed. Please check credentials.');
//     } finally {
//       setTestingWa(false);
//     }
//   };

//   const handleTestEmail = async () => {
//     if (emailAuthMode === 'app_pass') {
//       const errEmail = validateField('email_user', onboardingData.email_user);
//       const errPass = validateField('email_app_pass', onboardingData.email_app_pass);
//       if (errEmail || errPass) {
//         toast.error(errEmail || errPass);
//         return;
//       }
//     }

//     setTestingEmail(true);
//     try {
//       const res = await emailService.testConnection({
//         email_address: onboardingData.email_user,
//         smtp_host: 'smtp.gmail.com',
//         smtp_port: 587,
//         smtp_user: onboardingData.email_user,
//         smtp_password: onboardingData.email_app_pass,
//         provider: 'smtp',
//         is_active: true,
//       });
//       setEmailConnected(true);
//       toast.success(res?.message || 'SMTP TLS handshake verified! Outbound transporter active. 🟢');
//     } catch (err: any) {
//       setEmailConnected(false);
//       toast.error(err?.response?.data?.message || err?.message || 'SMTP handshake failed. Please check your email and App Password.');
//     } finally {
//       setTestingEmail(false);
//     }
//   };

//   const handleConnectGoogleOAuth = () => {
//     toast.info('Connecting to Google...');
//     const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
//     if (!clientId) {
//       toast.error('Google sign-in is not configured (VITE_GOOGLE_CLIENT_ID).');
//       return;
//     }
//     const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
//     const scope = encodeURIComponent('https://mail.google.com/ https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send openid email profile');
//     window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
//   };

//   const handleFinalSubmit = async () => {
//     if (!validateCurrentStep(10)) return;

//     setSubmitting(true);
//     try {
//       // 1. Persist WhatsApp config (tenant-scoped on the server) if the user entered one
//       if (onboardingData.wa_phone && onboardingData.wa_phone_id) {
//         try {
//           await whatsappService.saveConfig({
//             phone_number: onboardingData.wa_phone,
//             phone_number_id: onboardingData.wa_phone_id,
//             waba_id: onboardingData.wa_waba_id,
//             access_token: onboardingData.wa_access_token,
//             provider: onboardingData.wa_provider as any,
//             api_url: onboardingData.wa_api_url,
//             api_key: onboardingData.wa_api_key,
//             is_connected: waConnected,
//           });
//         } catch (err: any) {
//           toast.warning(err?.response?.data?.message || 'WhatsApp settings were not saved. You can connect it later in Settings.');
//         }
//       }

//       // 2. Persist Email config if entered
//       if (onboardingData.email_user && onboardingData.email_app_pass) {
//         try {
//           await emailService.saveConfig({
//             email_address: onboardingData.email_user,
//             smtp_host: 'smtp.gmail.com',
//             smtp_port: 587,
//             smtp_user: onboardingData.email_user,
//             smtp_password: onboardingData.email_app_pass,
//             imap_host: 'imap.gmail.com',
//             imap_port: 993,
//             use_ssl: true,
//             is_active: true,
//             provider: 'smtp',
//           });
//         } catch (err: any) {
//           toast.warning(err?.response?.data?.message || 'Email settings were not saved. You can connect it later in Settings.');
//         }
//       }

//       // 3. Save the final step, then mark onboarding complete ON THE SERVER (not just in the browser)
//       if (!(await persistStep(10))) return;
//       const done = await completeOnboarding();
//       if (!done) {
//         toast.error('Onboarding is not complete yet. Please review the earlier steps.');
//         return;
//       }
//       toast.success('Onboarding completed! Welcome to your Sharyx Command Center.');
//       setLocation('/admin');
//     } catch (err: any) {
//       toast.error(err?.response?.data?.message || 'Failed to complete onboarding');
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const progressPercent = Math.round((currentStep / 10) * 100);

//   if (!hydrated) {
//     return (
//       <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
//         <Loader2 className="h-8 w-8 text-primary animate-spin" />
//         <span className="text-xs text-muted-foreground">Loading your saved progress...</span>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-primary selection:text-primary-foreground">
//       <div className="w-full max-w-3xl space-y-6 my-8">
//         {/* Progress Header */}
//         <div className="space-y-3">
//           <div className="flex items-center justify-between text-xs font-semibold">
//             <span className="text-primary flex items-center gap-1.5 uppercase tracking-wider">
//               <Sparkles className="h-3.5 w-3.5" />
//               Workforce Onboarding Setup
//             </span>
//             <span className="text-muted-foreground">
//               Step <span className="text-heading font-bold">{currentStep}</span> of 10 ({progressPercent}%)
//             </span>
//           </div>

//           <div className="h-2 w-full bg-card rounded-full overflow-hidden border border-border">
//             <div
//               className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-300 rounded-full"
//               style={{ width: `${progressPercent}%` }}
//             />
//           </div>
//         </div>

//         {/* Wizard Card Body */}
//         <Card className="border-border bg-muted/70 backdrop-blur-xl shadow-2xl">
//           {/* STEP 1: Company Profile & Logo */}
//           {currentStep === 1 && (
//             <div>
//               <CardHeader>
//                 <div className="flex items-center gap-3">
//                   <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
//                     <Building2 className="h-5 w-5" />
//                   </div>
//                   <div>
//                     <CardTitle>Company Identity & Brand Profile</CardTitle>
//                     <CardDescription>Tell your AI agents who they represent</CardDescription>
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div>
//                     <label className="text-xs font-medium text-foreground">Company Name *</label>
//                     <Input
//                       className={`mt-1 ${fieldErrors.company_name ? 'border-rose-500' : ''}`}
//                       value={onboardingData.company_name}
//                       onChange={(e) => handleFieldChange('company_name', e.target.value)}
//                       placeholder="e.g. Acme Corporation"
//                       required
//                     />
//                     {fieldErrors.company_name && (
//                       <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.company_name}</p>
//                     )}
//                   </div>
//                   <div>
//                     <label className="text-xs font-medium text-foreground">Official Business Email *</label>
//                     <Input
//                       type="email"
//                       className={`mt-1 ${fieldErrors.business_email ? 'border-rose-500' : ''}`}
//                       value={onboardingData.business_email}
//                       onChange={(e) => handleFieldChange('business_email', e.target.value)}
//                       placeholder="contact@acme.com"
//                       required
//                     />
//                     {fieldErrors.business_email && (
//                       <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.business_email}</p>
//                     )}
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-xs font-medium text-foreground">Company Website</label>
//                   <Input
//                     placeholder="https://yourcompany.com"
//                     className={`mt-1 ${fieldErrors.website ? 'border-rose-500' : ''}`}
//                     value={onboardingData.website}
//                     onChange={(e) => handleFieldChange('website', e.target.value)}
//                   />
//                   {fieldErrors.website && (
//                     <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.website}</p>
//                   )}
//                 </div>

//                 <div>
//                   <label className="text-xs font-medium text-foreground">Brand Logo</label>
//                   <div className="mt-1 border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors bg-card/40 cursor-pointer">
//                     <Upload className="h-8 w-8 text-muted-foreground mb-2" />
//                     <p className="text-xs font-medium text-foreground">
//                       Drag & drop your logo here, or <span className="text-primary">browse</span>
//                     </p>
//                     <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, SVG up to 5MB</p>
//                   </div>
//                 </div>
//               </CardContent>
//             </div>
//           )}

//           {/* STEP 2: Business Address */}
//           {currentStep === 2 && (
//             <div>
//               <CardHeader>
//                 <div className="flex items-center gap-3">
//                   <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
//                     <MapPin className="h-5 w-5" />
//                   </div>
//                   <div>
//                     <CardTitle>Physical Operating Location</CardTitle>
//                     <CardDescription>Needed for voice callers asking about branch visits</CardDescription>
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 <div>
//                   <label className="text-xs font-medium text-foreground">Street Address *</label>
//                   <Input
//                     className={`mt-1 ${fieldErrors.address ? 'border-rose-500' : ''}`}
//                     value={onboardingData.address}
//                     onChange={(e) => handleFieldChange('address', e.target.value)}
//                     placeholder="123 Innovation Blvd, Suite 400"
//                   />
//                   {fieldErrors.address && (
//                     <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.address}</p>
//                   )}
//                 </div>
//                 <div className="grid grid-cols-3 gap-3">
//                   <div>
//                     <label className="text-xs font-medium text-foreground">City *</label>
//                     <Input
//                       className={`mt-1 ${fieldErrors.city ? 'border-rose-500' : ''}`}
//                       value={onboardingData.city}
//                       onChange={(e) => handleFieldChange('city', e.target.value)}
//                       placeholder="San Francisco"
//                     />
//                     {fieldErrors.city && (
//                       <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.city}</p>
//                     )}
//                   </div>
//                   <div>
//                     <label className="text-xs font-medium text-foreground">State / Province *</label>
//                     <Input
//                       className={`mt-1 ${fieldErrors.state ? 'border-rose-500' : ''}`}
//                       value={onboardingData.state}
//                       onChange={(e) => handleFieldChange('state', e.target.value)}
//                       placeholder="CA"
//                     />
//                     {fieldErrors.state && (
//                       <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.state}</p>
//                     )}
//                   </div>
//                   <div>
//                     <label className="text-xs font-medium text-foreground">Pincode / ZIP *</label>
//                     <Input
//                       className={`mt-1 ${fieldErrors.pincode ? 'border-rose-500' : ''}`}
//                       value={onboardingData.pincode}
//                       onChange={(e) => handleFieldChange('pincode', e.target.value)}
//                       placeholder="94105"
//                     />
//                     {fieldErrors.pincode && (
//                       <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.pincode}</p>
//                     )}
//                   </div>
//                 </div>
//               </CardContent>
//             </div>
//           )}

//           {/* STEP 3: Industry & Services (35+ Mappings) */}
//           {currentStep === 3 && (
//             <div>
//               <CardHeader>
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-3">
//                     <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
//                       <Briefcase className="h-5 w-5" />
//                     </div>
//                     <div>
//                       <CardTitle>Industry & Recommended Workflows</CardTitle>
//                       <CardDescription>Tailor agent conversational scripts to your niche</CardDescription>
//                     </div>
//                   </div>
//                   <Button
//                     type="button"
//                     variant="outline"
//                     size="sm"
//                     onClick={handleSelectAllRecommendedServices}
//                     className="text-xs text-primary border-primary/30"
//                   >
//                     Select All Recommended
//                   </Button>
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                   <div>
//                     <label className="text-xs font-medium text-foreground">Primary Industry</label>
//                     <select
//                       className="mt-1 flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
//                       value={onboardingData.industry}
//                       onChange={(e) => {
//                         const newInd = e.target.value;
//                         setOnboardingData({
//                           ...onboardingData,
//                           industry: newInd,
//                           industry_sub_type: industryCatalog[newInd]?.subTypes[0] || '',
//                           selected_services: industryCatalog[newInd]?.services || [],
//                         });
//                       }}
//                     >
//                       {industriesList.map((ind) => (
//                         <option key={ind} value={ind}>
//                           {ind}
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   <div>
//                     <label className="text-xs font-medium text-foreground">Sub-Category</label>
//                     <select
//                       className="mt-1 flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
//                       value={onboardingData.industry_sub_type}
//                       onChange={(e) =>
//                         setOnboardingData({ ...onboardingData, industry_sub_type: e.target.value })
//                       }
//                     >
//                       {activeIndustryData.subTypes.map((sub) => (
//                         <option key={sub} value={sub}>
//                           {sub}
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-xs font-medium text-foreground">
//                     Recommended Agent Workflows for {onboardingData.industry}
//                   </label>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
//                     {activeIndustryData.services.map((srv) => {
//                       const selected = onboardingData.selected_services.includes(srv);
//                       return (
//                         <div
//                           key={srv}
//                           onClick={() => handleToggleService(srv)}
//                           className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${selected
//                             ? 'bg-primary/10 border-primary/50 text-heading'
//                             : 'bg-card/60 border-border text-muted-foreground hover:border-primary/40'
//                             }`}
//                         >
//                           <span>{srv}</span>
//                           <div
//                             className={`h-4 w-4 rounded-md border flex items-center justify-center ${selected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
//                               }`}
//                           >
//                             {selected && <Check className="h-3 w-3 stroke-[3]" />}
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 </div>
//               </CardContent>
//             </div>
//           )}

//           {/* STEP 4: Automation Goals */}
//           {currentStep === 4 && (
//             <div>
//               <CardHeader>
//                 <div className="flex items-center gap-3">
//                   <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
//                     <Target className="h-5 w-5" />
//                   </div>
//                   <div>
//                     <CardTitle>What are your top automation objectives?</CardTitle>
//                     <CardDescription>Select all that apply to your current business phase</CardDescription>
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-2">
//                 {[
//                   '24/7 Phone Receptionist & Call Triage',
//                   'Instant Website Lead Qualification',
//                   'WhatsApp Sales Broadcasts & Flash Sales',
//                   'Inbound Email Auto-Responder & Ticketing',
//                   'No-Show Prevention & Appointment Reminders',
//                   'Debt Recovery & Payment Link Reminders',
//                   'HR Screening & Candidate Pre-Interviews',
//                 ].map((goal) => {
//                   const selected = onboardingData.goals.includes(goal);
//                   return (
//                     <div
//                       key={goal}
//                       onClick={() => {
//                         const updated = selected
//                           ? onboardingData.goals.filter((g) => g !== goal)
//                           : [...onboardingData.goals, goal];
//                         setOnboardingData({ ...onboardingData, goals: updated });
//                       }}
//                       className={`p-3.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${selected
//                         ? 'bg-indigo-500/10 border-indigo-500/50 text-heading shadow-md'
//                         : 'bg-card/40 border-border text-foreground hover:border-primary/40'
//                         }`}
//                     >
//                       <span>{goal}</span>
//                       <div
//                         className={`h-4 w-4 rounded-md border flex items-center justify-center ${selected ? 'bg-indigo-500 border-indigo-500 text-heading' : 'border-border'
//                           }`}
//                       >
//                         {selected && <Check className="h-3 w-3 stroke-[3]" />}
//                       </div>
//                     </div>
//                   );
//                 })}
//               </CardContent>
//             </div>
//           )}

//           {/* STEP 5: Technical Experience */}
//           {currentStep === 5 && (
//             <div>
//               <CardHeader>
//                 <div className="flex items-center gap-3">
//                   <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
//                     <Cpu className="h-5 w-5" />
//                   </div>
//                   <div>
//                     <CardTitle>What is your team's technical proficiency?</CardTitle>
//                     <CardDescription>We'll configure the dashboard complexity accordingly</CardDescription>
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-3">
//                 {[
//                   {
//                     level: 'Beginner',
//                     title: 'Non-Technical / Business Owner',
//                     desc: 'I want everything pre-configured with zero code and 1-click templates.',
//                   },
//                   {
//                     level: 'Intermediate',
//                     title: 'Tech-Savvy Marketer or Operator',
//                     desc: 'Comfortable tweaking system prompts, webhook tokens, and CRM mappings.',
//                   },
//                   {
//                     level: 'Advanced',
//                     title: 'Developer / Solution Architect',
//                     desc: 'I want full API keys, custom JSON webhooks, and raw LLM parameters.',
//                   },
//                 ].map((lvl) => {
//                   const selected = onboardingData.technical_level === lvl.level;
//                   return (
//                     <div
//                       key={lvl.level}
//                       onClick={() =>
//                         setOnboardingData({ ...onboardingData, technical_level: lvl.level })
//                       }
//                       className={`p-4 rounded-xl border cursor-pointer transition-all ${selected
//                         ? 'bg-amber-500/10 border-amber-500/50 text-heading'
//                         : 'bg-card/40 border-border text-foreground hover:border-primary/40'
//                         }`}
//                     >
//                       <h4 className="text-sm font-semibold">{lvl.title}</h4>
//                       <p className="text-xs text-muted-foreground mt-1">{lvl.desc}</p>
//                     </div>
//                   );
//                 })}
//               </CardContent>
//             </div>
//           )}

//           {/* STEP 6: Most Used Apps */}
//           {currentStep === 6 && (
//             <div>
//               <CardHeader>
//                 <div className="flex items-center gap-3">
//                   <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
//                     <Smartphone className="h-5 w-5" />
//                   </div>
//                   <div>
//                     <CardTitle>Which business software do you use daily?</CardTitle>
//                     <CardDescription>Your AI agents will connect with these platforms</CardDescription>
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
//                   {[
//                     'Gmail / Google Workspace',
//                     'WhatsApp Business',
//                     'Slack',
//                     'Google Sheets',
//                     'HubSpot CRM',
//                     'Salesforce',
//                     'Notion',
//                     'Stripe Payments',
//                     'Calendly',
//                     'Zendesk',
//                     'Zapier / Make',
//                     'Webflow / WordPress',
//                   ].map((app) => {
//                     const selected = onboardingData.apps.includes(app);
//                     return (
//                       <div
//                         key={app}
//                         onClick={() => {
//                           const updated = selected
//                             ? onboardingData.apps.filter((a) => a !== app)
//                             : [...onboardingData.apps, app];
//                           setOnboardingData({ ...onboardingData, apps: updated });
//                         }}
//                         className={`p-3 rounded-xl border text-xs font-medium cursor-pointer text-center transition-all ${selected
//                           ? 'bg-teal-500/10 border-teal-500 text-heading shadow-md'
//                           : 'bg-card/40 border-border text-muted-foreground hover:border-primary/40'
//                           }`}
//                       >
//                         {app}
//                       </div>
//                     );
//                   })}
//                 </div>
//               </CardContent>
//             </div>
//           )}

//           {/* STEP 7: Workplace Size */}
//           {currentStep === 7 && (
//             <div>
//               <CardHeader>
//                 <div className="flex items-center gap-3">
//                   <div className="h-10 w-10 rounded-xl bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center">
//                     <Users className="h-5 w-5" />
//                   </div>
//                   <div>
//                     <CardTitle>How large is your organization?</CardTitle>
//                     <CardDescription>Optimizes concurrency and call routing queues</CardDescription>
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
//                 {['Just me (Solo)', '2 - 10 employees', '11 - 50 employees', '51 - 200 employees', '201 - 500 employees', '500+ Enterprise'].map(
//                   (size) => {
//                     const selected = onboardingData.company_size === size;
//                     return (
//                       <div
//                         key={size}
//                         onClick={() =>
//                           setOnboardingData({ ...onboardingData, company_size: size })
//                         }
//                         className={`p-4 rounded-xl border text-center cursor-pointer text-xs font-semibold transition-all ${selected
//                           ? 'bg-pink-500/10 border-pink-500 text-heading shadow-md'
//                           : 'bg-card/40 border-border text-muted-foreground hover:border-primary/40'
//                           }`}
//                       >
//                         {size}
//                       </div>
//                     );
//                   }
//                 )}
//               </CardContent>
//             </div>
//           )}

//           {/* STEP 8: Discovery Source */}
//           {currentStep === 8 && (
//             <div>
//               <CardHeader>
//                 <div className="flex items-center gap-3">
//                   <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
//                     <Compass className="h-5 w-5" />
//                   </div>
//                   <div>
//                     <CardTitle>How did you discover Sharyx?</CardTitle>
//                     <CardDescription>Helps us understand our growth channels</CardDescription>
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-2">
//                 {[
//                   'ChatGPT / Claude AI Recommendation',
//                   'Google Search / Organic Article',
//                   'LinkedIn / Twitter (X) Tech Post',
//                   'Referred by Colleague or Agency',
//                   'YouTube AI Workforce Demo',
//                 ].map((src) => {
//                   const selected = onboardingData.discovery_source === src;
//                   return (
//                     <div
//                       key={src}
//                       onClick={() =>
//                         setOnboardingData({ ...onboardingData, discovery_source: src })
//                       }
//                       className={`p-3.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${selected
//                         ? 'bg-cyan-500/10 border-cyan-500 text-heading'
//                         : 'bg-card/40 border-border text-foreground hover:border-primary/40'
//                         }`}
//                     >
//                       <span>{src}</span>
//                       {selected && <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
//                     </div>
//                   );
//                 })}
//               </CardContent>
//             </div>
//           )}

//           {/* STEP 9: WhatsApp Automation Setup (Dynamic Providers) */}
//           {currentStep === 9 && (
//             <div>
//               <CardHeader>
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-3">
//                     <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
//                       <MessageSquare className="h-5 w-5" />
//                     </div>
//                     <div>
//                       <CardTitle>WhatsApp Automation & AI Copilot Integration</CardTitle>
//                       <CardDescription>Connect via Meta Cloud API, QR Web Session, or Custom Gateway</CardDescription>
//                     </div>
//                   </div>
//                   {waConnected && (
//                     <Badge variant="success" className="gap-1 py-1 text-xs">
//                       <CheckCircle2 className="h-3.5 w-3.5" />
//                       Live Connected
//                     </Badge>
//                   )}
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 {/* Provider Selector Cards */}
//                 <div>
//                   <label className="text-xs font-medium text-foreground">Choose Integration Mode</label>
//                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1.5">
//                     {[
//                       {
//                         id: 'meta_cloud',
//                         name: 'Meta Cloud API',
//                         badge: 'Official v21',
//                         icon: Sparkles,
//                         desc: 'Official WhatsApp Business Cloud API with broadcast templates.',
//                       },

//                     ].map((p) => {
//                       const selected = onboardingData.wa_provider === p.id;
//                       const Icon = p.icon;
//                       return (
//                         <div
//                           key={p.id}
//                           onClick={() => {
//                             setOnboardingData({ ...onboardingData, wa_provider: p.id });
//                             setWaConnected(false);
//                           }}
//                           className={`p-3.5 rounded-xl border cursor-pointer transition-all ${selected
//                             ? 'bg-primary/10 border-primary text-heading shadow-md'
//                             : 'bg-card/40 border-border text-muted-foreground hover:border-primary/40'
//                             }`}
//                         >
//                           <div className="flex items-center justify-between mb-1.5">
//                             <Icon className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
//                             <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground">
//                               {p.badge}
//                             </span>
//                           </div>
//                           <h4 className="text-xs font-semibold text-heading">{p.name}</h4>
//                           <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.desc}</p>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 </div>

//                 {/* Provider 1: Meta Cloud API */}
//                 {onboardingData.wa_provider === 'meta_cloud' && (
//                   <div className="space-y-3 pt-1">
//                     <div className="grid grid-cols-2 gap-3">
//                       <div>
//                         <label className="text-xs font-medium text-foreground">WhatsApp Display Phone *</label>
//                         <Input
//                           placeholder="+1 555 019 2831"
//                           className={`mt-1 ${fieldErrors.wa_phone ? 'border-rose-500' : ''}`}
//                           value={onboardingData.wa_phone}
//                           onChange={(e) => handleFieldChange('wa_phone', e.target.value)}
//                         />
//                         {fieldErrors.wa_phone && (
//                           <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.wa_phone}</p>
//                         )}
//                       </div>
//                       <div>
//                         <label className="text-xs font-medium text-foreground">Phone Number ID *</label>
//                         <Input
//                           placeholder="10928371928371"
//                           className={`mt-1 ${fieldErrors.wa_phone_id ? 'border-rose-500' : ''}`}
//                           value={onboardingData.wa_phone_id}
//                           onChange={(e) => handleFieldChange('wa_phone_id', e.target.value)}
//                         />
//                         {fieldErrors.wa_phone_id && (
//                           <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.wa_phone_id}</p>
//                         )}
//                       </div>
//                     </div>

//                     <div>
//                       <label className="text-xs font-medium text-foreground">WhatsApp Business Account ID (WABA) *</label>
//                       <Input
//                         placeholder="98127391823719"
//                         className={`mt-1 ${fieldErrors.wa_waba_id ? 'border-rose-500' : ''}`}
//                         value={onboardingData.wa_waba_id}
//                         onChange={(e) => handleFieldChange('wa_waba_id', e.target.value)}
//                       />
//                       {fieldErrors.wa_waba_id && (
//                         <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.wa_waba_id}</p>
//                       )}
//                     </div>

//                     <div>
//                       <label className="text-xs font-medium text-foreground">Permanent System User Access Token *</label>
//                       <Input
//                         type="password"
//                         placeholder="EAAG..."
//                         className={`mt-1 ${fieldErrors.wa_access_token ? 'border-rose-500' : ''}`}
//                         value={onboardingData.wa_access_token}
//                         onChange={(e) => handleFieldChange('wa_access_token', e.target.value)}
//                       />
//                       {fieldErrors.wa_access_token && (
//                         <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.wa_access_token}</p>
//                       )}
//                     </div>
//                   </div>
//                 )}

//                 {/* Provider 2: QR Web Session */}
//                 {onboardingData.wa_provider === 'qr_gateway' && (
//                   <div className="p-5 rounded-2xl bg-card/60 border border-border text-center space-y-3">
//                     <div className="mx-auto h-32 w-32 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg">
//                       <QrCode className="h-28 w-28 text-slate-950" />
//                     </div>
//                     <div>
//                       <h4 className="text-xs font-bold text-heading">Scan from WhatsApp App</h4>
//                       <p className="text-[11px] text-muted-foreground mt-0.5">
//                         Open WhatsApp ➔ Linked Devices ➔ Link a Device. No Meta credentials required.
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 {/* Provider 3: Custom Gateway */}
//                 {onboardingData.wa_provider === 'custom_gateway' && (
//                   <div className="space-y-3 pt-1">
//                     <div>
//                       <label className="text-xs font-medium text-foreground">Sender Phone Number *</label>
//                       <Input
//                         placeholder="+91 98765 43210"
//                         className={`mt-1 ${fieldErrors.wa_phone ? 'border-rose-500' : ''}`}
//                         value={onboardingData.wa_phone}
//                         onChange={(e) => handleFieldChange('wa_phone', e.target.value)}
//                       />
//                       {fieldErrors.wa_phone && (
//                         <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.wa_phone}</p>
//                       )}
//                     </div>
//                     <div>
//                       <label className="text-xs font-medium text-foreground">Gateway API Endpoint URL *</label>
//                       <Input
//                         placeholder="https://api.my-gateway.com/v1/send"
//                         className={`mt-1 ${fieldErrors.wa_api_url ? 'border-rose-500' : ''}`}
//                         value={onboardingData.wa_api_url}
//                         onChange={(e) => handleFieldChange('wa_api_url', e.target.value)}
//                       />
//                       {fieldErrors.wa_api_url && (
//                         <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.wa_api_url}</p>
//                       )}
//                     </div>
//                     <div>
//                       <label className="text-xs font-medium text-foreground">API Secret Key / Token</label>
//                       <Input
//                         type="password"
//                         placeholder="sec_..."
//                         className="mt-1"
//                         value={onboardingData.wa_api_key}
//                         onChange={(e) => handleFieldChange('wa_api_key', e.target.value)}
//                       />
//                     </div>
//                   </div>
//                 )}

//                 {/* Verified Details Card once Connected */}
//                 {waConnected && (
//                   <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/40 text-xs space-y-1">
//                     <div className="flex items-center justify-between">
//                       <span className="font-semibold text-primary flex items-center gap-1.5">
//                         <CheckCircle2 className="h-4 w-4" /> Connection Verified
//                       </span>
//                       <span className="text-[10px] text-primary uppercase px-2 py-0.5 rounded bg-primary/20 font-bold">
//                         {waDetails?.quality_rating || 'HIGH QUALITY'}
//                       </span>
//                     </div>
//                     <p className="text-foreground">
//                       Display: <span className="font-mono text-heading">{waDetails?.display_phone_number || onboardingData.wa_phone}</span>
//                     </p>
//                     <p className="text-muted-foreground text-[11px]">
//                       Verified Name: {waDetails?.verified_name || 'Sharyx Business Account'}
//                     </p>
//                   </div>
//                 )}

//                 {/* Live Test Handshake Action */}
//                 <div className="p-4 rounded-xl bg-card/80 border border-border flex items-center justify-between">
//                   <div className="text-xs text-foreground">
//                     <p className="font-semibold text-heading">Live Handshake Verification</p>
//                     <p className="text-muted-foreground">
//                       Verifies connectivity and saves credentials directly to database
//                     </p>
//                   </div>
//                   <Button
//                     type="button"
//                     variant="emerald"
//                     size="sm"
//                     onClick={handleTestWhatsApp}
//                     disabled={testingWa}
//                   >
//                     {testingWa ? (
//                       <>
//                         <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
//                         Testing Connection...
//                       </>
//                     ) : (
//                       <>
//                         <Radio className="mr-1.5 h-3.5 w-3.5" />
//                         {waConnected ? 'Re-Verify Connection' : 'Test WhatsApp Connection'}
//                       </>
//                     )}
//                   </Button>
//                 </div>
//               </CardContent>
//             </div>
//           )}

//           {/* STEP 10: Email Automation Setup (Gmail / SMTP) */}
//           {currentStep === 10 && (
//             <div>
//               <CardHeader>
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-3">
//                     <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
//                       <Mail className="h-5 w-5" />
//                     </div>
//                     <div>
//                       <CardTitle>Autonomous Email Mailbox Setup</CardTitle>
//                       <CardDescription>Connect Google Workspace or Custom SMTP for autonomous AI emailing</CardDescription>
//                     </div>
//                   </div>
//                   {emailConnected && (
//                     <Badge variant="success" className="gap-1">
//                       <CheckCircle2 className="h-3 w-3" />
//                       Active
//                     </Badge>
//                   )}
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 {/* Mode Selector Tabs */}
//                 <div className="grid grid-cols-2 gap-3">
//                   <button
//                     type="button"
//                     onClick={() => setEmailAuthMode('google_oauth')}
//                     className={`p-3.5 rounded-xl border text-left transition-all ${emailAuthMode === 'google_oauth'
//                       ? 'bg-indigo-500/10 border-indigo-500 text-heading shadow-md'
//                       : 'bg-card/40 border-border text-muted-foreground hover:border-primary/40'
//                       }`}
//                   >
//                     <div className="flex items-center justify-between mb-1">
//                       <span className="text-xs font-bold text-heading">Google 1-Click OAuth</span>
//                       <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
//                         Recommended
//                       </span>
//                     </div>
//                     <p className="text-[11px] text-muted-foreground">Direct Gmail API integration with zero app passwords required.</p>
//                   </button>

//                   <button
//                     type="button"
//                     onClick={() => setEmailAuthMode('app_pass')}
//                     className={`p-3.5 rounded-xl border text-left transition-all ${emailAuthMode === 'app_pass'
//                       ? 'bg-primary/10 border-primary text-heading shadow-md'
//                       : 'bg-card/40 border-border text-muted-foreground hover:border-primary/40'
//                       }`}
//                   >
//                     <div className="flex items-center justify-between mb-1">
//                       <span className="text-xs font-bold text-heading">SMTP / App Password</span>
//                       <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground">
//                         Custom
//                       </span>
//                     </div>
//                     <p className="text-[11px] text-muted-foreground">Standard TLS/SSL SMTP with 16-character Google App Password.</p>
//                   </button>
//                 </div>

//                 {emailAuthMode === 'google_oauth' ? (
//                   <div className="p-5 rounded-2xl bg-card/60 border border-border text-center space-y-3">
//                     <p className="text-xs text-foreground">
//                       Connect your Gmail or Google Workspace business mailbox directly via official OAuth 2.0.
//                     </p>
//                     <Button
//                       type="button"
//                       variant="outline"
//                       onClick={() => {
//                         const clientId = '11874827859-h7b1l07qs1pi1ie1489ijdj4u7jvbuqg.apps.googleusercontent.com';
//                         const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
//                         const scope = encodeURIComponent('https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
//                         window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
//                       }}
//                       className="border-border bg-muted hover:bg-muted/70 text-heading text-xs h-10 px-5 rounded-xl"
//                     >
//                       <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
//                         <path
//                           fill="#4285F4"
//                           d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
//                         />
//                         <path
//                           fill="#34A853"
//                           d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
//                         />
//                         <path
//                           fill="#FBBC05"
//                           d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
//                         />
//                         <path
//                           fill="#EA4335"
//                           d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
//                         />
//                       </svg>
//                       Connect Gmail via Google OAuth
//                     </Button>
//                   </div>
//                 ) : (
//                   <div className="space-y-4">
//                     <div>
//                       <label className="text-xs font-medium text-foreground">Gmail / Business Email Address *</label>
//                       <Input
//                         type="email"
//                         placeholder="you@domain.com"
//                         className={`mt-1 ${fieldErrors.email_user ? 'border-rose-500' : ''}`}
//                         value={onboardingData.email_user}
//                         onChange={(e) => handleFieldChange('email_user', e.target.value)}
//                       />
//                       {fieldErrors.email_user && (
//                         <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.email_user}</p>
//                       )}
//                     </div>

//                     <div>
//                       <label className="text-xs font-medium text-foreground">16-Character Google App Password *</label>
//                       <Input
//                         type="password"
//                         placeholder="xxxx xxxx xxxx xxxx"
//                         className={`mt-1 ${fieldErrors.email_app_pass ? 'border-rose-500' : ''}`}
//                         value={onboardingData.email_app_pass}
//                         onChange={(e) => handleFieldChange('email_app_pass', e.target.value)}
//                       />
//                       {fieldErrors.email_app_pass && (
//                         <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.email_app_pass}</p>
//                       )}
//                       <p className="text-[11px] text-muted-foreground mt-1">
//                         Generated via myaccount.google.com ➔ Security ➔ 2-Step Verification ➔ App Passwords.
//                       </p>
//                     </div>

//                     <div className="p-4 rounded-xl bg-card/80 border border-border flex items-center justify-between">
//                       <div className="text-xs text-foreground">
//                         <p className="font-semibold text-heading">Test SMTP Handshake Live</p>
//                         <p className="text-muted-foreground">Verifies authentication against smtp.gmail.com:465</p>
//                       </div>
//                       <Button
//                         type="button"
//                         variant="emerald"
//                         size="sm"
//                         onClick={handleTestEmail}
//                         disabled={testingEmail}
//                       >
//                         {testingEmail ? (
//                           <>
//                             <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
//                             Testing SMTP...
//                           </>
//                         ) : (
//                           <>
//                             <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
//                             {emailConnected ? 'Re-Test Handshake' : 'Test Handshake'}
//                           </>
//                         )}
//                       </Button>
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </div>
//           )}

//           {/* Navigation Footer */}
//           <div className="p-6 border-t border-border flex items-center justify-between bg-muted/40">
//             <Button
//               type="button"
//               variant="ghost"
//               size="sm"
//               disabled={currentStep === 1}
//               onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
//               className="text-xs"
//             >
//               <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
//               Back
//             </Button>

//             {currentStep < 10 ? (
//               <Button
//                 type="button"
//                 variant="emerald"
//                 size="sm"
//                 onClick={handleContinue}
//                 disabled={savingStep}
//                 className="text-xs font-semibold"
//               >
//                 Continue
//                 <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
//               </Button>
//             ) : (
//               <Button
//                 type="button"
//                 variant="emerald"
//                 size="sm"
//                 onClick={handleFinalSubmit}
//                 disabled={submitting}
//                 className="text-xs font-semibold px-6"
//               >
//                 {submitting ? (
//                   <>
//                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                     Launching Command Center...
//                   </>
//                 ) : (
//                   <>
//                     Complete & Enter Dashboard
//                     <Sparkles className="ml-2 h-4 w-4" />
//                   </>
//                 )}
//               </Button>
//             )}
//           </div>
//         </Card>
//       </div>
//     </div>
//   );
// };
import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { whatsappService } from '@/service/whatsappService';
import { emailService } from '@/service/emailService';
import { byType, integrationsService, timeAgo, type IntegrationItem } from '@/service/integrationsService';
import { StatusBadge } from '@/components/integrations/StatusBadge';

/** The SAVED backend status of an integration (never a local guess): badge, who/what, last check and the plain-language reason. */
const SavedStatus: React.FC<{ item: IntegrationItem | null; label: string }> = ({ item, label }) => {
  if (!item || (!item.configured && item.status === 'not_configured')) return null;
  return (
    <div data-testid="wizard-saved-status" data-state={item.status} className="p-3 rounded-xl border border-border bg-card/60 text-xs space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-heading">{label}{item.display_name ? ` · ${item.display_name}` : ''}</span>
        <StatusBadge state={item.status} checking={item.checking} />
      </div>
      {item.configured && <p className="text-muted-foreground">Saved status · last checked {timeAgo(item.last_checked_at)}</p>}
      {item.error_message && item.configured && <p role="alert" className={item.status === 'failed' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}>{item.error_message}</p>}
    </div>
  );
};

export const OnboardingWizard: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user, completeOnboarding } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const [waDetails, setWaDetails] = useState<any>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailConnected, setEmailConnected] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<'app_pass' | 'google_oauth'>('app_pass');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // State for the connected Google mailbox
  const [oauthEmailStatus, setOauthEmailStatus] = useState<any>(null);
  // true when the server already holds a WhatsApp token for this tenant (never the token itself): an empty box then means "keep it"
  const [waSavedToken, setWaSavedToken] = useState(false);
  // Saved backend status of the integrations (R2): what the wizard SHOWS comes from the database, not from local state.
  const [intStatus, setIntStatus] = useState<Awaited<ReturnType<typeof integrationsService.fetch>> | null>(null);
  // Form State across all 10 steps
  const [onboardingData, setOnboardingData] = useState({
    // Step 1 (only what the account already knows about itself)
    company_name: user?.company_name || '',
    business_email: user?.email || '',
    website: '',
    logo_url: '',
    // Step 2
    address: '',
    city: '',
    state: '',
    pincode: '',
    // Step 3
    industry: '',
    industry_sub_type: '',
    selected_services: [] as string[],
    // Step 4
    goals: [] as string[],
    // Step 5
    technical_level: '',
    // Step 6
    apps: [] as string[],
    // Step 7
    company_size: '',
    // Step 8
    discovery_source: '',
    // Step 9: WhatsApp (secrets are typed by the user and sent only to the tenant-scoped WhatsApp API)
    wa_provider: 'meta_cloud',
    wa_phone: '',
    wa_phone_id: '',
    wa_waba_id: '',
    wa_access_token: '',
    wa_api_url: '',
    wa_api_key: '',
    // Step 10: Email
    email_user: user?.email || '',
    email_app_pass: '',
  });

  // Resume where the tenant left off: saved answers + furthest step come from the database.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get('/api/v1/Onboarding/State');
        const state = res.data;
        if (cancelled) return;
        if (state?.onboarding_completed) {
          setLocation('/admin');
          return;
        }
        const saved = state?.data || {};
        setOnboardingData((prev) => ({
          ...prev,
          ...Object.fromEntries(Object.entries(saved).filter(([, v]) => v !== undefined && v !== null)),
        }));
        if (saved.email_auth_mode === 'app_pass' || saved.email_auth_mode === 'google_oauth') {
          setEmailAuthMode(saved.email_auth_mode);
        }
        // What is ALREADY connected comes from the saved backend status (survives reload / re-login / another browser)
        try {
          const s = await integrationsService.fetch();
          if (!cancelled) {
            setIntStatus(s);
            setWaConnected(byType(s, 'whatsapp')?.status === 'connected');
            setEmailConnected(byType(s, 'email_smtp')?.status === 'connected');
            // restore the NON-secret WhatsApp fields from what is saved, so a reload does not make the user retype them
            const d = byType(s, 'whatsapp')?.detail || {};
            setWaSavedToken(!!d.has_access_token);
            setOnboardingData((prev) => ({
              ...prev,
              wa_phone: prev.wa_phone || d.phone_number || '',
              wa_phone_id: prev.wa_phone_id || d.phone_number_id || '',
              wa_waba_id: prev.wa_waba_id || d.waba_id || '',
            }));
          }
        } catch (e) {
          console.warn('Could not load integration status');
        }
        try {
          const emailStatus = await emailService.getOAuthStatus();
          if (emailStatus && emailStatus.isConnected) {
            setOauthEmailStatus(emailStatus);
            // Show the green connected card after returning from Google
            setEmailAuthMode('google_oauth');
            const addr = emailStatus.email_address as string | undefined;
            if (addr) {
              setOnboardingData((prev) => ({ ...prev, email_user: addr }));
            }
          }
        } catch (e) {
          console.warn('Could not load email status');
        }
        // ?step=9 / ?step=10 (dashboard checklist "Connect WhatsApp/Email") opens exactly that step
        const wanted = Number(new URLSearchParams(window.location.search).get('step'));
        setCurrentStep(
          Number.isInteger(wanted) && wanted >= 1 && wanted <= 10
            ? wanted
            : Math.min(Math.max(Number(state?.onboarding_step) || 1, 1), 10)
        );
      } catch {
        toast.error('Could not load your saved onboarding progress. Please refresh.');
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        if (!value || typeof value !== 'string' || value.replace(/[^0-9]/g, '').length < 8) {
          return 'Please enter a valid WhatsApp phone number with country code.';
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
        if (onboardingData.wa_provider === 'meta_cloud' && !(waSavedToken && !value)) {
          if (!value || typeof value !== 'string' || value.trim().length < 8) {
            return 'Meta System User Access Token is required.';
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

  const persistStep = async (step: number, extra: Record<string, any> = {}): Promise<boolean> => {
    setSavingStep(true);
    try {
      await axios.put('/api/v1/Onboarding/Step', {
        step,
        data: { ...onboardingData, email_auth_mode: emailAuthMode, ...extra },
      });
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save this step. Please try again.');
      return false;
    } finally {
      setSavingStep(false);
    }
  };

  const handleContinue = async () => {
    if (!validateCurrentStep(currentStep)) return;
    // Saved to the database under the signed-in tenant before moving on.
    if (await persistStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 10));
    }
  };

  // Skip WhatsApp (Step 9) without validation
  const handleSkipWhatsApp = async () => {
    setFieldErrors({});
    // recorded on the server: the dashboard checklist then shows WhatsApp as Pending (skipped), not as done
    if (await persistStep(9, { whatsapp_skipped: true })) {
      setCurrentStep(10);
    }
  };

  // Skip Email (Step 10) and enter the dashboard
  const handleSkipEmail = async () => {
    setSubmitting(true);
    try {
      if (!(await persistStep(10, { email_skipped: true }))) return;
      const done = await completeOnboarding();
      if (!done) {
        toast.error('Onboarding is not complete yet. Please review the earlier steps.');
        return;
      }
      setLocation('/admin');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to complete onboarding');
    } finally {
      setSubmitting(false);
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
      setWaDetails(res);
      toast.success(res?.message || 'WhatsApp integration verified and connected successfully! 🟢');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'WhatsApp connection test failed. Please check credentials.');
    } finally {
      // the server saved the result (pass OR fail): show exactly what it saved
      try {
        const s = await integrationsService.refresh();
        setIntStatus(s);
        setWaConnected(byType(s, 'whatsapp')?.status === 'connected');
        setWaSavedToken(!!byType(s, 'whatsapp')?.detail?.has_access_token);
      } catch {
        /* keep the previous saved view */
      }
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
      toast.success(res?.message || 'Email connected: sending and inbox both work. 🟢');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'SMTP handshake failed. Please check your email and App Password.');
    } finally {
      try {
        const s = await integrationsService.refresh();
        setIntStatus(s);
        setEmailConnected(byType(s, 'email_smtp')?.status === 'connected');
      } catch {
        /* keep the previous saved view */
      }
      setTestingEmail(false);
    }
  };

  const handleConnectGoogleOAuth = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      toast.error('Google sign-in isn’t set up for this environment yet. Use the App Password option, or ask your administrator to configure it.');
      return;
    }
    toast.info('Connecting to Google...');
    try {
      sessionStorage.setItem('sharyx_oauth_return', '/onboarding?step=10');
    } catch {
      /* private mode: the callback falls back to /admin */
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
    const scope = encodeURIComponent('https://mail.google.com/ https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send openid email profile');
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  };

  const handleFinalSubmit = async () => {
    if (!validateCurrentStep(10)) return;

    setSubmitting(true);
    try {
      // 1. Persist WhatsApp config (tenant-scoped on the server) if the user entered one
      if (onboardingData.wa_phone && onboardingData.wa_phone_id) {
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
        } catch (err: any) {
          toast.warning(err?.response?.data?.message || 'WhatsApp settings were not saved. You can connect it later in Settings.');
        }
      }

      // 2. Persist Email config if entered
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
        } catch (err: any) {
          toast.warning(err?.response?.data?.message || 'Email settings were not saved. You can connect it later in Settings.');
        }
      }

      // 3. Save the final step, then mark onboarding complete ON THE SERVER (not just in the browser)
      if (!(await persistStep(10))) return;
      const done = await completeOnboarding();
      if (!done) {
        toast.error('Onboarding is not complete yet. Please review the earlier steps.');
        return;
      }
      toast.success('Onboarding completed! Welcome to your Sharyx Command Center.');
      setLocation('/admin');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to complete onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = Math.round((currentStep / 10) * 100);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground">Loading your saved progress...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-primary selection:text-primary-foreground">
      <div className="w-full max-w-3xl space-y-6 my-8">
        {/* Progress Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              Workforce Onboarding Setup
            </span>
            <span className="text-muted-foreground">
              Step <span className="text-heading font-bold">{currentStep}</span> of 10 ({progressPercent}%)
            </span>
          </div>

          <div className="h-2 w-full bg-card rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Wizard Card Body */}
        <Card className="border-border bg-muted/70 backdrop-blur-xl shadow-2xl">
          {/* STEP 1: Company Profile & Logo */}
          {currentStep === 1 && (
            <div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
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
                    <label className="text-xs font-medium text-foreground">Company Name *</label>
                    <Input
                      className={`mt-1 ${fieldErrors.company_name ? 'border-rose-500' : ''}`}
                      value={onboardingData.company_name}
                      onChange={(e) => handleFieldChange('company_name', e.target.value)}
                      placeholder="e.g. Acme Corporation"
                      required
                    />
                    {fieldErrors.company_name && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.company_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Official Business Email *</label>
                    <Input
                      type="email"
                      className={`mt-1 ${fieldErrors.business_email ? 'border-rose-500' : ''}`}
                      value={onboardingData.business_email}
                      onChange={(e) => handleFieldChange('business_email', e.target.value)}
                      placeholder="contact@acme.com"
                      required
                    />
                    {fieldErrors.business_email && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.business_email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Company Website</label>
                  <Input
                    placeholder="https://yourcompany.com"
                    className={`mt-1 ${fieldErrors.website ? 'border-rose-500' : ''}`}
                    value={onboardingData.website}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                  />
                  {fieldErrors.website && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.website}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Brand Logo</label>
                  <div className="mt-1 border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors bg-card/40 cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs font-medium text-foreground">
                      Drag & drop your logo here, or <span className="text-primary">browse</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, SVG up to 5MB</p>
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
                  <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
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
                  <label className="text-xs font-medium text-foreground">Street Address *</label>
                  <Input
                    className={`mt-1 ${fieldErrors.address ? 'border-rose-500' : ''}`}
                    value={onboardingData.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="123 Innovation Blvd, Suite 400"
                  />
                  {fieldErrors.address && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.address}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">City *</label>
                    <Input
                      className={`mt-1 ${fieldErrors.city ? 'border-rose-500' : ''}`}
                      value={onboardingData.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      placeholder="San Francisco"
                    />
                    {fieldErrors.city && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">State / Province *</label>
                    <Input
                      className={`mt-1 ${fieldErrors.state ? 'border-rose-500' : ''}`}
                      value={onboardingData.state}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                      placeholder="CA"
                    />
                    {fieldErrors.state && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.state}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Pincode / ZIP *</label>
                    <Input
                      className={`mt-1 ${fieldErrors.pincode ? 'border-rose-500' : ''}`}
                      value={onboardingData.pincode}
                      onChange={(e) => handleFieldChange('pincode', e.target.value)}
                      placeholder="94105"
                    />
                    {fieldErrors.pincode && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.pincode}</p>
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
                    <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
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
                    className="text-xs text-primary border-primary/30"
                  >
                    Select All Recommended
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Primary Industry</label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
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
                    <label className="text-xs font-medium text-foreground">Sub-Category</label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
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
                  <label className="text-xs font-medium text-foreground">
                    Recommended Agent Workflows for {onboardingData.industry}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {activeIndustryData.services.map((srv) => {
                      const selected = onboardingData.selected_services.includes(srv);
                      return (
                        <div
                          key={srv}
                          onClick={() => handleToggleService(srv)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${selected
                            ? 'bg-primary/10 border-primary/50 text-heading'
                            : 'bg-card/60 border-border text-muted-foreground hover:border-primary/40'
                            }`}
                        >
                          <span>{srv}</span>
                          <div
                            className={`h-4 w-4 rounded-md border flex items-center justify-center ${selected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
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
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
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
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${selected
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-heading shadow-md'
                        : 'bg-card/40 border-border text-foreground hover:border-primary/40'
                        }`}
                    >
                      <span>{goal}</span>
                      <div
                        className={`h-4 w-4 rounded-md border flex items-center justify-center ${selected ? 'bg-indigo-500 border-indigo-500 text-heading' : 'border-border'
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
                  <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
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
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${selected
                        ? 'bg-amber-500/10 border-amber-500/50 text-heading'
                        : 'bg-card/40 border-border text-foreground hover:border-primary/40'
                        }`}
                    >
                      <h4 className="text-sm font-semibold">{lvl.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{lvl.desc}</p>
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
                  <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
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
                        className={`p-3 rounded-xl border text-xs font-medium cursor-pointer text-center transition-all ${selected
                          ? 'bg-teal-500/10 border-teal-500 text-heading shadow-md'
                          : 'bg-card/40 border-border text-muted-foreground hover:border-primary/40'
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
                  <div className="h-10 w-10 rounded-xl bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center">
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
                        className={`p-4 rounded-xl border text-center cursor-pointer text-xs font-semibold transition-all ${selected
                          ? 'bg-pink-500/10 border-pink-500 text-heading shadow-md'
                          : 'bg-card/40 border-border text-muted-foreground hover:border-primary/40'
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
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
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
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${selected
                        ? 'bg-cyan-500/10 border-cyan-500 text-heading'
                        : 'bg-card/40 border-border text-foreground hover:border-primary/40'
                        }`}
                    >
                      <span>{src}</span>
                      {selected && <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
                    </div>
                  );
                })}
              </CardContent>
            </div>
          )}

          {/* STEP 9: WhatsApp Automation Setup */}
          {currentStep === 9 && (
            <div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>WhatsApp Automation & AI Copilot Integration</CardTitle>
                      <CardDescription>Connect your official WhatsApp Business Cloud API number</CardDescription>
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
                  <label className="text-xs font-medium text-foreground">Choose Integration Mode</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1.5">
                    {[
                      {
                        id: 'meta_cloud',
                        name: 'Meta Cloud API',
                        badge: 'Official v21',
                        icon: Sparkles,
                        desc: 'Official WhatsApp Business Cloud API with broadcast templates.',
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
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${selected
                            ? 'bg-primary/10 border-primary text-heading shadow-md'
                            : 'bg-card/40 border-border text-muted-foreground hover:border-primary/40'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <Icon className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground">
                              {p.badge}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-heading">{p.name}</h4>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Meta Cloud API fields */}
                {onboardingData.wa_provider === 'meta_cloud' && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-foreground">WhatsApp Display Phone *</label>
                        <Input
                          placeholder="+1 555 019 2831"
                          className={`mt-1 ${fieldErrors.wa_phone ? 'border-rose-500' : ''}`}
                          value={onboardingData.wa_phone}
                          onChange={(e) => handleFieldChange('wa_phone', e.target.value)}
                        />
                        {fieldErrors.wa_phone && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.wa_phone}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground">Phone Number ID *</label>
                        <Input
                          placeholder="10928371928371"
                          className={`mt-1 ${fieldErrors.wa_phone_id ? 'border-rose-500' : ''}`}
                          value={onboardingData.wa_phone_id}
                          onChange={(e) => handleFieldChange('wa_phone_id', e.target.value)}
                        />
                        {fieldErrors.wa_phone_id && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.wa_phone_id}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">WhatsApp Business Account ID (WABA) *</label>
                      <Input
                        placeholder="98127391823719"
                        className={`mt-1 ${fieldErrors.wa_waba_id ? 'border-rose-500' : ''}`}
                        value={onboardingData.wa_waba_id}
                        onChange={(e) => handleFieldChange('wa_waba_id', e.target.value)}
                      />
                      {fieldErrors.wa_waba_id && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.wa_waba_id}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">Permanent System User Access Token {waSavedToken ? '(saved)' : '*'}</label>
                      <Input
                        type="password"
                        data-testid="wa-token"
                        autoComplete="off"
                        placeholder={waSavedToken ? '•••••••• saved - leave empty to keep it' : 'EAAG...'}
                        className={`mt-1 ${fieldErrors.wa_access_token ? 'border-rose-500' : ''}`}
                        value={onboardingData.wa_access_token}
                        onChange={(e) => handleFieldChange('wa_access_token', e.target.value)}
                      />
                      {fieldErrors.wa_access_token && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.wa_access_token}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Verified Details Card once Connected */}
                {waConnected && (
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/40 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Connection Verified
                      </span>
                      <span className="text-[10px] text-primary uppercase px-2 py-0.5 rounded bg-primary/20 font-bold">
                        {waDetails?.quality_rating || 'HIGH QUALITY'}
                      </span>
                    </div>
                    <p className="text-foreground">
                      Display: <span className="font-mono text-heading">{waDetails?.display_phone_number || onboardingData.wa_phone}</span>
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Verified Name: {waDetails?.verified_name || 'Sharyx Business Account'}
                    </p>
                  </div>
                )}

                <SavedStatus item={byType(intStatus, 'whatsapp')} label="WhatsApp" />
                {byType(intStatus, 'whatsapp')?.configured && <SavedStatus item={byType(intStatus, 'whatsapp_webhook')} label="Incoming-message webhook" />}

                {/* Live Test Handshake Action */}
                <div className="p-4 rounded-xl bg-card/80 border border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-foreground">
                    <p className="font-semibold text-heading">Live Handshake Verification</p>
                    <p className="text-muted-foreground">
                      Verifies connectivity and saves credentials directly to database
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="emerald"
                    size="sm"
                    className="w-full sm:w-auto shrink-0" onClick={handleTestWhatsApp}
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
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
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
                    className={`p-3.5 rounded-xl border text-left transition-all ${emailAuthMode === 'google_oauth'
                      ? 'bg-indigo-500/10 border-indigo-500 text-heading shadow-md'
                      : 'bg-card/40 border-border text-muted-foreground hover:border-primary/40'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-heading">Google 1-Click OAuth</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Direct Gmail API integration with zero app passwords required.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmailAuthMode('app_pass')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${emailAuthMode === 'app_pass'
                      ? 'bg-primary/10 border-primary text-heading shadow-md'
                      : 'bg-card/40 border-border text-muted-foreground hover:border-primary/40'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-heading">SMTP / App Password</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground">
                        Custom
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Standard TLS/SSL SMTP with 16-character Google App Password.</p>
                  </button>
                </div>

                {emailAuthMode === 'google_oauth' ? (
                  <div className="p-5 rounded-2xl bg-card/60 border border-border text-center space-y-3">
                    {oauthEmailStatus?.isConnected ? (
                      /* Connected Mailbox Green Card */
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-left">
                        <div>
                          <div className="flex items-center gap-1.5 text-emerald-500 font-semibold text-xs">
                            <CheckCircle2 className="h-4 w-4" /> Connected Google Mailbox
                          </div>
                          <p className="font-mono text-sm font-bold text-foreground mt-1">
                            {oauthEmailStatus.email_address || onboardingData.email_user}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Autonomous AI Dispatch & Sync is Active 🟢
                          </p>
                        </div>
                        <Badge variant="success" className="px-2.5 py-1 text-xs">
                          Active
                        </Badge>
                      </div>
                    ) : (
                      /* Connect Button if not yet connected */
                      <>
                        <p className="text-xs text-foreground">
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
                          className="border-border bg-muted hover:bg-muted/70 text-heading text-xs h-10 px-5 rounded-xl"
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
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-foreground">Gmail / Business Email Address *</label>
                      <Input
                        type="email"
                        placeholder="you@domain.com"
                        className={`mt-1 ${fieldErrors.email_user ? 'border-rose-500' : ''}`}
                        value={onboardingData.email_user}
                        onChange={(e) => handleFieldChange('email_user', e.target.value)}
                      />
                      {fieldErrors.email_user && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.email_user}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">16-Character Google App Password *</label>
                      <Input
                        type="password"
                        placeholder="xxxx xxxx xxxx xxxx"
                        className={`mt-1 ${fieldErrors.email_app_pass ? 'border-rose-500' : ''}`}
                        value={onboardingData.email_app_pass}
                        onChange={(e) => handleFieldChange('email_app_pass', e.target.value)}
                      />
                      {fieldErrors.email_app_pass && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.email_app_pass}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Generated via myaccount.google.com ➔ Security ➔ 2-Step Verification ➔ App Passwords.
                      </p>
                    </div>

                    <SavedStatus item={byType(intStatus, 'email_smtp')} label="Sending (SMTP)" />
                    <SavedStatus item={byType(intStatus, 'email_imap')} label="Inbox (IMAP)" />

                    <div className="p-4 rounded-xl bg-card/80 border border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-foreground">
                        <p className="font-semibold text-heading">Test SMTP Handshake Live</p>
                        <p className="text-muted-foreground">Verifies authentication against smtp.gmail.com:465</p>
                      </div>
                      <Button
                        type="button"
                        variant="emerald"
                        size="sm"
                        className="w-full sm:w-auto shrink-0" onClick={handleTestEmail}
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
          <div className="p-6 border-t border-border flex items-center justify-between bg-muted/40">
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

            <div className="flex items-center gap-2">
              {/* Skip button on WhatsApp Step 9 */}
              {currentStep === 9 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipWhatsApp}
                  disabled={savingStep}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Skip for now
                </Button>
              )}

              {/* Skip button on Email Step 10 */}
              {currentStep === 10 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipEmail}
                  disabled={submitting}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Skip & Enter Dashboard
                </Button>
              )}

              {currentStep < 10 ? (
                <Button
                  type="button"
                  variant="emerald"
                  size="sm"
                  onClick={handleContinue}
                  disabled={savingStep}
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
          </div>
        </Card>
      </div>
    </div>
  );
};
