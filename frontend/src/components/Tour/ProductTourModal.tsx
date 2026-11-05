import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    PhoneCall,
    MessageSquare,
    Mail,
    Bot,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    ShieldCheck,
    Zap,
    Layers,
    Settings,
} from 'lucide-react';

interface ProductTourModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface TourStep {
    title: string;
    subtitle: string;
    badge: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    description: string;
    features: string[];
}

const TOUR_STEPS: TourStep[] = [
    {
        title: 'Welcome to Sharyx Workforce AI',
        subtitle: 'Deploy 8 Specialized Autonomous Digital Agents',
        badge: 'Step 1 of 5',
        icon: Sparkles,
        iconBg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
        iconColor: 'text-blue-600 dark:text-blue-400',
        description:
            'Sharyx provides an enterprise autonomous workforce that operates 24/7 across Phone Calls, WhatsApp, and Email without human intervention.',
        features: [
            'Receptionist & Call Screener for incoming calls',
            'Inbound Sales Closer & Payment Collection',
            '24/7 Customer Support & Multi-Tenant Data Isolation',
        ],
    },
    {
        title: 'WhatsApp Automation Cloud',
        subtitle: 'Meta Cloud API v21.0 & AI Copilot',
        badge: 'Step 2 of 5',
        icon: MessageSquare,
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        description:
            'Automate candidate and customer messaging using Meta-approved templates and autonomous LLM brain in Tamil, Tanglish, and English.',
        features: [
            'Two-way WhatsApp live chat inbox',
            'Outcome-triggered marketing broadcasts',
            'Autonomous Brain answering customer questions instantly',
        ],
    },
    {
        title: 'Voice AI & Phone Receptionist',
        subtitle: 'Natural Dialogue Powered by Vapi',
        badge: 'Step 3 of 5',
        icon: PhoneCall,
        iconBg: 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800',
        iconColor: 'text-cyan-600 dark:text-cyan-400',
        description:
            'Answer customer calls in real-time with human-like voices, gather details, check calendar availability, and log full call transcripts.',
        features: [
            'Real-time low latency phone answering',
            'Call recording and automatic outcome classification',
            'Automated WhatsApp brochure & email follow-up dispatch',
        ],
    },
    {
        title: 'Autonomous Email Responder',
        subtitle: 'Two-Way IMAP & SMTP Communication',
        badge: 'Step 4 of 5',
        icon: Mail,
        iconBg: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
        iconColor: 'text-purple-600 dark:text-purple-400',
        description:
            'Connect any custom email account (Gmail, Outlook, Zoho, or private SMTP) to draft and send intelligent, personalized replies.',
        features: [
            'Background IMAP listener for instant customer detection',
            'LLM drafted response approvals or autonomous mode',
            'PDF attachment generation & sequence broadcasting',
        ],
    },
    {
        title: 'Get Started with the Setup Checklist',
        subtitle: 'You are ready to configure your integrations!',
        badge: 'Step 5 of 5',
        icon: ShieldCheck,
        iconBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
        iconColor: 'text-amber-600 dark:text-amber-400',
        description:
            'Head to your dashboard to complete the connection checklist for WhatsApp, Email, and Voice credentials.',
        features: [
            'Live health diagnostics and connection test buttons',
            'Company Profile & API Keys management under Settings',
            '24/7 telemetry monitoring and SLA tracking',
        ],
    },
];

export const ProductTourModal: React.FC<ProductTourModalProps> = ({ open, onOpenChange }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const step = TOUR_STEPS[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === TOUR_STEPS.length - 1;
    const StepIcon = step.icon;

    const handleFinish = () => {
        localStorage.setItem('sharyx_tour_seen', 'true');
        onOpenChange(false);
    };

    const handleNext = () => {
        if (isLast) {
            handleFinish();
        } else {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handlePrev = () => {
        if (!isFirst) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
                {/* Top Header Banner */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white relative">
                    <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-white/20 hover:bg-white/25 text-white border-0 text-[10px] font-bold px-2 py-0.5">
                            {step.badge}
                        </Badge>
                        <button
                            onClick={handleFinish}
                            className="text-xs text-white/80 hover:text-white underline cursor-pointer"
                        >
                            Skip Tour
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 text-white shrink-0`}>
                            <StepIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-white">{step.title}</h2>
                            <p className="text-xs text-blue-100 mt-0.5">{step.subtitle}</p>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-6 space-y-4">
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {step.description}
                    </p>

                    <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Key Capabilities:
                        </span>
                        <div className="space-y-1.5">
                            {step.features.map((feature, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer with Step Dots & Navigation */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    {/* Progress Dots */}
                    <div className="flex items-center gap-1.5">
                        {TOUR_STEPS.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentStep(idx)}
                                className={`h-2 rounded-full transition-all ${idx === currentStep
                                    ? 'w-6 bg-blue-600 dark:bg-blue-400'
                                    : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                                    }`}
                                title={`Go to step ${idx + 1}`}
                            />
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {!isFirst && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrev}
                                className="h-8 text-xs font-semibold gap-1 border-slate-300 dark:border-slate-700"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                <span>Back</span>
                            </Button>
                        )}

                        <Button
                            size="sm"
                            onClick={handleNext}
                            className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm shadow-blue-600/30"
                        >
                            <span>{isLast ? 'Get Started' : 'Next'}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};