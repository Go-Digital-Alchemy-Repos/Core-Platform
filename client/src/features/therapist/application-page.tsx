import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { TherapistLayout } from "./therapist-layout";
import {
  ArrowLeft, ArrowRight, Send, CheckCircle2, Loader2, Clock,
  FileText, User, Briefcase, MessageSquare, Users, DollarSign, Shield,
  Plus, X, Save, ExternalLink, AlertCircle, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface FormData {
  feeAcknowledgment?: boolean;
  readyAcknowledgment?: boolean;
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  applyingAs?: string;
  professionalTitle?: string;
  organizationName?: string;
  professionalWebsite?: string;
  corePlatformQuestions?: Record<string, string>;
  accessibilityStartingFee?: string;
  accessibilitySlidingScale?: string;
  accessibilityDetails?: string;
  termsAccepted?: boolean;
  termsSignature?: string;
  termsInsuranceAgreement?: boolean;
  termsLicensureProof?: boolean;
  termsStatementOfFaith?: boolean;
}

interface DirectorySettings {
  applicationFeeAmountCents: number;
  applicationFeeNoticeTitle: string;
  applicationFeeNoticeBody: string;
  applicationFeePolicySummary: string;
  applicationFeeCreditOnApproval: boolean;
  applicationFeeCreditAmountCents: number;
}

const WIZARD_STEPS = [
  { id: "fee-notice", label: "Fee Notice", icon: DollarSign },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "before-you-begin", label: "Before You Begin", icon: FileText },
  { id: "contact", label: "Contact Info", icon: User },
  { id: "professional", label: "Professional Info", icon: Briefcase },
  { id: "corePlatform-questions", label: "Core Platform Questions", icon: MessageSquare },
  { id: "references", label: "References", icon: Users },
  { id: "accessibility", label: "Accessibility", icon: DollarSign },
  { id: "terms", label: "Terms", icon: Shield },
];

const CORE_PLATFORM_QUESTIONS = [
  {
    id: "corePlatform_experience",
    label: "Describe your experience working with Third Culture Kids (Core Platforms) or cross-cultural populations.",
  },
  {
    id: "corePlatform_approach",
    label: "What therapeutic approaches or frameworks do you use when working with Core Platforms or individuals navigating cultural transitions?",
  },
  {
    id: "corePlatform_understanding",
    label: "How would you define or describe the unique challenges faced by Core Platforms, and how does your practice address them?",
  },
  {
    id: "corePlatform_continuing_ed",
    label: "What continuing education, training, or personal experience informs your Core Platform-related work?",
  },
];

function StepIndicator({ currentStep, onStepClick, completedSteps }: {
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: Set<number>;
}) {
  return (
    <div className="mb-8" data-testid="step-indicator">
      <div className="hidden md:flex items-center justify-between">
        {WIZARD_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = idx === currentStep;
          const isCompleted = completedSteps.has(idx);
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-initial">
              <button
                type="button"
                onClick={() => onStepClick(idx)}
                className="flex flex-col items-center gap-1 group cursor-pointer"
                data-testid={`step-${step.id}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground group-hover:border-muted-foreground/50"
                  }`}
                >
                  {isCompleted && !isActive ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight max-w-[70px] ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </button>
              {idx < WIZARD_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mt-[-1rem] ${isCompleted ? "bg-primary" : "bg-muted-foreground/20"}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
          <span className="text-sm text-muted-foreground">{WIZARD_STEPS[currentStep].label}</span>
        </div>
        <div className="flex gap-1">
          {WIZARD_STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onStepClick(idx)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                idx === currentStep ? "bg-primary" : idx < currentStep || completedSteps.has(idx) ? "bg-primary/40" : "bg-muted-foreground/20"
              }`}
              data-testid={`step-bar-${idx}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AutosaveIndicator({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  return (
    <div className="flex items-center gap-1.5 text-xs" data-testid="autosave-indicator">
      {status === "saving" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <CheckCircle2 className="w-3 h-3 text-green-600" />
          <span className="text-green-600">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="w-3 h-3 text-red-500" />
          <span className="text-red-500">Save failed</span>
        </>
      )}
    </div>
  );
}

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function ApplicationFeeNoticeStep({
  directorySettings,
  formData,
  onChange,
}: {
  directorySettings: DirectorySettings;
  formData: FormData;
  onChange: (data: Partial<FormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-step-title">
          {directorySettings.applicationFeeNoticeTitle}
        </h3>
        <p className="text-muted-foreground mt-1">
          Review the fee policy before moving into payment and the remainder of your membership application.
        </p>
      </div>

      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Application Fee: {formatUsd(directorySettings.applicationFeeAmountCents)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {directorySettings.applicationFeeNoticeBody}
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">{directorySettings.applicationFeePolicySummary}</p>
            {directorySettings.applicationFeeCreditOnApproval && (
              <p className="text-sm text-muted-foreground mt-2">
                If approved, up to {formatUsd(directorySettings.applicationFeeCreditAmountCents)} can be applied to your first membership invoice.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border hover:bg-muted/50 transition-colors">
        <input
          type="checkbox"
          checked={!!formData.feeAcknowledgment}
          onChange={(e) => onChange({ feeAcknowledgment: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-gray-300"
          data-testid="checkbox-fee-acknowledgment"
        />
        <span className="text-sm font-medium leading-snug">
          I understand the application fee policy and I am ready to continue to payment.
        </span>
      </label>
    </div>
  );
}

function ApplicationPaymentStep({
  directorySettings,
  isPaid,
  paymentPending,
  paymentProcessing,
  onPayNow,
}: {
  directorySettings: DirectorySettings;
  isPaid: boolean;
  paymentPending: boolean;
  paymentProcessing: boolean;
  onPayNow: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-step-title">Application Payment</h3>
        <p className="text-muted-foreground mt-1">
          Secure your place in the review queue by paying the application fee before continuing.
        </p>
      </div>

      <Card className="border-primary/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="font-medium">Fee due now: {formatUsd(directorySettings.applicationFeeAmountCents)}</p>
              <p className="text-sm text-muted-foreground">{directorySettings.applicationFeePolicySummary}</p>
              {isPaid ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                  Your application fee has been processed. You can continue with the rest of the application.
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground italic">
                    You will be redirected to Stripe to complete payment securely.
                  </p>
                  <Button
                    type="button"
                    onClick={onPayNow}
                    disabled={paymentPending || paymentProcessing}
                    data-testid="button-pay-application-fee"
                  >
                    {paymentPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Pay {formatUsd(directorySettings.applicationFeeAmountCents)}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BeforeYouBeginStep({ formData, onChange }: { formData: FormData; onChange: (data: Partial<FormData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-step-title">Before You Begin</h3>
        <p className="text-muted-foreground mt-1">Please review the following information before starting your application.</p>
      </div>

      <div className="grid gap-4">
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Estimated Time: 50–60 minutes</p>
              <p className="text-sm text-muted-foreground">We recommend completing this application in one sitting for the best experience. Your progress is automatically saved if you need to step away.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex items-start gap-3">
            <Users className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Have 3 References Ready</p>
              <p className="text-sm text-muted-foreground">You will need to provide contact information for 3 professional references. They will receive a confidential reference form after your application is submitted.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Vetting Criteria</p>
              <p className="text-sm text-muted-foreground">Review our vetting criteria to understand what we look for in Core Platform providers.</p>
              <Button variant="ghost" size="sm" className="p-0 h-auto mt-1 text-primary" data-testid="link-vetting-criteria" disabled>
                <ExternalLink className="w-3 h-3 mr-1" />
                Preview vetting criteria (PDF coming soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border hover:bg-muted/50 transition-colors">
        <input
          type="checkbox"
          checked={!!formData.readyAcknowledgment}
          onChange={(e) => onChange({ readyAcknowledgment: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-gray-300"
          data-testid="checkbox-ready-acknowledgment"
        />
        <span className="text-sm font-medium leading-snug">
          I have reviewed the information above and am ready to begin.
        </span>
      </label>
    </div>
  );
}

function ContactInfoStep({ formData, onChange }: { formData: FormData; onChange: (data: Partial<FormData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-step-title">Contact Information</h3>
        <p className="text-muted-foreground mt-1">Provide your contact details for the application.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            value={formData.fullName || ""}
            onChange={(e) => onChange({ fullName: e.target.value })}
            placeholder="Dr. Jane Smith"
            data-testid="input-full-name"
          />
        </div>
        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="jane@example.com"
            data-testid="input-email"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            value={formData.phone || ""}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
            data-testid="input-phone"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city || ""}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="San Francisco"
              data-testid="input-city"
            />
          </div>
          <div>
            <Label htmlFor="country">Country *</Label>
            <Input
              id="country"
              value={formData.country || ""}
              onChange={(e) => onChange({ country: e.target.value })}
              placeholder="United States"
              data-testid="input-country"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfessionalInfoStep({
  formData, onChange, application
}: {
  formData: FormData;
  onChange: (data: Partial<FormData>) => void;
  application: any;
}) {
  const { toast } = useToast();
  const [credForm, setCredForm] = useState({
    credentialType: "", licenseNumber: "", stateOrCountry: "", middleName: "", verificationUrl: ""
  });

  const credentials = application?.credentials ?? [];

  const addCredential = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/therapist/application/credentials", credForm);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/application"] });
      setCredForm({ credentialType: "", licenseNumber: "", stateOrCountry: "", middleName: "", verificationUrl: "" });
      toast({ title: "Credential added" });
    },
    onError: () => toast({ title: "Failed to add credential", variant: "destructive" }),
  });

  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/therapist/application/credentials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/application"] });
      toast({ title: "Credential removed" });
    },
    onError: () => toast({ title: "Failed to remove credential", variant: "destructive" }),
  });

  const roleOptions = [
    { value: "mental_health_professional", label: "Mental Health Professional" },
    { value: "debriefer", label: "Debriefer" },
    { value: "coach", label: "Coach" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-step-title">Professional Information</h3>
        <p className="text-muted-foreground mt-1">Tell us about your professional background.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>I am applying as a Core Platform-informed: *</Label>
          <div className="grid gap-2 mt-2">
            {roleOptions.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.applyingAs === opt.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="applyingAs"
                  value={opt.value}
                  checked={formData.applyingAs === opt.value}
                  onChange={(e) => onChange({ applyingAs: e.target.value })}
                  className="h-4 w-4"
                  data-testid={`radio-applying-as-${opt.value}`}
                />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="professionalTitle">Professional Title *</Label>
          <Input
            id="professionalTitle"
            value={formData.professionalTitle || ""}
            onChange={(e) => onChange({ professionalTitle: e.target.value })}
            placeholder="e.g., Licensed Professional Counselor"
            data-testid="input-professional-title"
          />
        </div>

        <div>
          <Label htmlFor="organizationName">Organization / Practice Name</Label>
          <Input
            id="organizationName"
            value={formData.organizationName || ""}
            onChange={(e) => onChange({ organizationName: e.target.value })}
            placeholder="e.g., Crossroads Counseling Center"
            data-testid="input-organization-name"
          />
        </div>

        <div>
          <Label htmlFor="professionalWebsite">Professional Website (optional)</Label>
          <Input
            id="professionalWebsite"
            value={formData.professionalWebsite || ""}
            onChange={(e) => onChange({ professionalWebsite: e.target.value })}
            placeholder="https://www.example.com"
            data-testid="input-professional-website"
          />
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label className="text-base">Credentials & Licenses</Label>
            <p className="text-sm text-muted-foreground">Add your professional credentials, licenses, and certifications.</p>
          </div>
          <Badge variant="outline">{credentials.length} added</Badge>
        </div>

        {credentials.length > 0 && (
          <div className="space-y-2 mb-4">
            {credentials.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{c.credentialType}</p>
                  <p className="text-xs text-muted-foreground">
                    {[c.licenseNumber && `#${c.licenseNumber}`, c.stateOrCountry].filter(Boolean).join(" — ")}
                  </p>
                  {c.verificationUrl && (
                    <a href={c.verificationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5">
                      <ExternalLink className="w-3 h-3" /> Verification link
                    </a>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCredential.mutate(c.id)}
                  disabled={deleteCredential.isPending}
                  data-testid={`button-delete-credential-${c.id}`}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <Label htmlFor="credentialType">Credential Type *</Label>
              <Input
                id="credentialType"
                value={credForm.credentialType}
                onChange={(e) => setCredForm((f) => ({ ...f, credentialType: e.target.value }))}
                placeholder="e.g., Licensed Professional Counselor (LPC)"
                data-testid="input-credential-type"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="licenseNumber">License / Certification Number</Label>
                <Input
                  id="licenseNumber"
                  value={credForm.licenseNumber}
                  onChange={(e) => setCredForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                  placeholder="e.g., LPC-12345"
                  data-testid="input-license-number"
                />
              </div>
              <div>
                <Label htmlFor="stateOrCountry">State or Country of Issuance</Label>
                <Input
                  id="stateOrCountry"
                  value={credForm.stateOrCountry}
                  onChange={(e) => setCredForm((f) => ({ ...f, stateOrCountry: e.target.value }))}
                  placeholder="e.g., California, USA"
                  data-testid="input-state-country"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="middleName">Middle Name (for verification)</Label>
                <Input
                  id="middleName"
                  value={credForm.middleName}
                  onChange={(e) => setCredForm((f) => ({ ...f, middleName: e.target.value }))}
                  placeholder="Middle name as it appears on license"
                  data-testid="input-middle-name"
                />
              </div>
              <div>
                <Label htmlFor="verificationUrl">Verification Page / Certificate Link</Label>
                <Input
                  id="verificationUrl"
                  value={credForm.verificationUrl}
                  onChange={(e) => setCredForm((f) => ({ ...f, verificationUrl: e.target.value }))}
                  placeholder="https://verify.example.com/..."
                  data-testid="input-verification-url"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">Document upload support will be available in a future update.</p>
            <Button
              onClick={() => addCredential.mutate()}
              disabled={!credForm.credentialType || addCredential.isPending}
              size="sm"
              data-testid="button-add-credential"
            >
              {addCredential.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Credential
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TckQuestionsStep({ formData, onChange }: { formData: FormData; onChange: (data: Partial<FormData>) => void }) {
  const questions = formData.corePlatformQuestions || {};
  const updateQuestion = (id: string, value: string) => {
    onChange({ corePlatformQuestions: { ...questions, [id]: value } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-step-title">Core Platform-Informed Practice</h3>
        <p className="text-muted-foreground mt-1">
          Help us understand your experience and approach to working with Third Culture Kids and cross-cultural populations.
        </p>
      </div>

      <div className="space-y-6">
        {CORE_PLATFORM_QUESTIONS.map((q, idx) => (
          <div key={q.id}>
            <Label htmlFor={q.id} className="text-sm font-medium leading-snug">
              {idx + 1}. {q.label}
            </Label>
            <Textarea
              id={q.id}
              value={questions[q.id] || ""}
              onChange={(e) => updateQuestion(q.id, e.target.value)}
              placeholder="Share your thoughts here..."
              rows={4}
              className="mt-2"
              data-testid={`textarea-${q.id}`}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {(questions[q.id] || "").length} characters
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferencesStep({ application }: { application: any }) {
  const { toast } = useToast();
  const [refForm, setRefForm] = useState({ refereeName: "", refereeEmail: "", relationship: "" });

  const references = application?.references ?? [];

  const addReference = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/therapist/application/references", refForm);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/application"] });
      setRefForm({ refereeName: "", refereeEmail: "", relationship: "" });
      toast({ title: "Reference added" });
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to add reference", variant: "destructive" }),
  });

  const deleteReference = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/therapist/application/references/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/application"] });
      toast({ title: "Reference removed" });
    },
    onError: () => toast({ title: "Failed to remove reference", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-step-title">Professional References</h3>
        <p className="text-muted-foreground mt-1">
          Please provide exactly 3 professional references who can speak to your qualifications.
        </p>
      </div>

      <Alert className="border-blue-200 dark:border-blue-800">
        <Users className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm">
          <strong>Who to include:</strong> Supervisors, colleagues, mentors, or other professionals who can attest to your clinical competence, ethical conduct, and experience with cross-cultural populations. After you submit your application, each reference will receive a confidential reference form via email.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <Label className="text-base">References ({references.length}/3)</Label>
        <Badge variant={references.length === 3 ? "default" : "outline"}>
          {references.length === 3 ? "Complete" : `${3 - references.length} remaining`}
        </Badge>
      </div>

      {references.length > 0 && (
        <div className="space-y-2">
          {references.map((r: any, idx: number) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">Reference {idx + 1}: {r.refereeName}</p>
                <p className="text-xs text-muted-foreground">{r.refereeEmail}{r.relationship && ` — ${r.relationship}`}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteReference.mutate(r.id)}
                disabled={deleteReference.isPending}
                data-testid={`button-delete-reference-${r.id}`}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {references.length < 3 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Add Reference {references.length + 1} of 3</p>
            <div>
              <Label htmlFor="refereeName">Full Name *</Label>
              <Input
                id="refereeName"
                value={refForm.refereeName}
                onChange={(e) => setRefForm((f) => ({ ...f, refereeName: e.target.value }))}
                placeholder="Dr. John Doe"
                data-testid="input-referee-name"
              />
            </div>
            <div>
              <Label htmlFor="refereeEmail">Email Address *</Label>
              <Input
                id="refereeEmail"
                type="email"
                value={refForm.refereeEmail}
                onChange={(e) => setRefForm((f) => ({ ...f, refereeEmail: e.target.value }))}
                placeholder="john@example.com"
                data-testid="input-referee-email"
              />
            </div>
            <div>
              <Label htmlFor="relationship">Relationship to You</Label>
              <Input
                id="relationship"
                value={refForm.relationship}
                onChange={(e) => setRefForm((f) => ({ ...f, relationship: e.target.value }))}
                placeholder="e.g., Clinical Supervisor, Colleague"
                data-testid="input-referee-relationship"
              />
            </div>
            <Button
              onClick={() => addReference.mutate()}
              disabled={!refForm.refereeName || !refForm.refereeEmail || addReference.isPending}
              size="sm"
              data-testid="button-add-reference"
            >
              {addReference.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Reference
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AccessibilityStep({ formData, onChange }: { formData: FormData; onChange: (data: Partial<FormData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-step-title">Accessibility & Pricing</h3>
        <p className="text-muted-foreground mt-1">
          Help us understand your fee structure. This information is used to identify providers who may qualify for an accessibility discount program.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="accessibilityStartingFee">What is your starting fee per appointment? *</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="accessibilityStartingFee"
              value={formData.accessibilityStartingFee || ""}
              onChange={(e) => onChange({ accessibilityStartingFee: e.target.value })}
              placeholder="150"
              className="pl-8"
              data-testid="input-starting-fee"
            />
          </div>
        </div>

        <div>
          <Label>Do you offer sliding-scale or reduced-fee sessions for Core Platforms? *</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors text-sm font-medium ${
                  formData.accessibilitySlidingScale === opt.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="slidingScale"
                  value={opt.value}
                  checked={formData.accessibilitySlidingScale === opt.value}
                  onChange={(e) => onChange({ accessibilitySlidingScale: e.target.value })}
                  className="h-4 w-4"
                  data-testid={`radio-sliding-scale-${opt.value}`}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {formData.accessibilitySlidingScale === "yes" && (
          <div>
            <Label htmlFor="accessibilityDetails">Please describe your sliding-scale or reduced-fee structure</Label>
            <Textarea
              id="accessibilityDetails"
              value={formData.accessibilityDetails || ""}
              onChange={(e) => onChange({ accessibilityDetails: e.target.value })}
              placeholder="Describe your reduced fee range, criteria, and availability..."
              rows={4}
              className="mt-1"
              data-testid="textarea-accessibility-details"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TermsStep({ formData, onChange }: { formData: FormData; onChange: (data: Partial<FormData>) => void }) {
  const termsItems = [
    "I acknowledge that I am an independent professional and not an employee, agent, or representative of Core Platform.",
    "I understand that listing on the Core Platform directory does not constitute an endorsement by Core Platform of my services, qualifications, or methods.",
    "I accept sole professional responsibility for the services I provide to clients.",
    "I am responsible for maintaining all necessary licenses, credentials, certifications, and professional liability insurance required to practice in my jurisdiction(s).",
    "I will accurately represent my qualifications, experience, and services in my directory profile and in all interactions facilitated through the platform.",
    "I will promptly notify Core Platform of any disciplinary actions, licensure issues, or changes to my professional standing.",
    "I agree to indemnify and hold harmless Core Platform, its founders, staff, and affiliates from any claims, damages, or liabilities arising from my professional services.",
    "I understand that Core Platform reserves the right to remove my listing from the directory at its discretion, with or without cause.",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-step-title">Terms & Conditions</h3>
        <p className="text-muted-foreground mt-1">
          Please read and accept the following terms to complete your application.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
            {termsItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 text-sm">
                <span className="text-muted-foreground font-mono text-xs mt-0.5 flex-shrink-0">{idx + 1}.</span>
                <p className="text-foreground/90">{item}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border hover:bg-muted/50 transition-colors">
          <input
            type="checkbox"
            checked={!!formData.termsInsuranceAgreement}
            onChange={(e) => onChange({ termsInsuranceAgreement: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
            data-testid="checkbox-insurance-agreement"
          />
          <span className="text-sm">I agree to maintain professional liability insurance for as long as I am listed on the Core Platform directory.</span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border hover:bg-muted/50 transition-colors">
          <input
            type="checkbox"
            checked={!!formData.termsLicensureProof}
            onChange={(e) => onChange({ termsLicensureProof: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
            data-testid="checkbox-licensure-proof"
          />
          <span className="text-sm">I agree to provide proof of licensure or certification upon request.</span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border hover:bg-muted/50 transition-colors">
          <input
            type="checkbox"
            checked={!!formData.termsAccepted}
            onChange={(e) => onChange({ termsAccepted: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
            data-testid="checkbox-terms-accepted"
          />
          <span className="text-sm font-medium">I have read and agree to all terms and conditions listed above.</span>
        </label>
      </div>

      <Separator />

      <div>
        <Label htmlFor="termsSignature">Type your full legal name as your electronic signature *</Label>
        <Input
          id="termsSignature"
          value={formData.termsSignature || ""}
          onChange={(e) => onChange({ termsSignature: e.target.value })}
          placeholder="Your full legal name"
          className="mt-1 font-serif text-lg"
          data-testid="input-terms-signature"
        />
        <p className="text-xs text-muted-foreground mt-1">By typing your name, you acknowledge this serves as your legally binding electronic signature.</p>
      </div>
    </div>
  );
}

function getStepValidation(step: number, formData: FormData, application: any): { valid: boolean; message?: string } {
  switch (step) {
    case 0:
      if (!formData.feeAcknowledgment) return { valid: false, message: "Please acknowledge the application fee policy." };
      return { valid: true };
    case 1:
      if (application?.paymentStatus !== "paid") return { valid: false, message: "Please complete payment before continuing." };
      return { valid: true };
    case 2:
      if (!formData.readyAcknowledgment) return { valid: false, message: "Please acknowledge you have reviewed the information." };
      return { valid: true };
    case 3:
      if (!formData.fullName) return { valid: false, message: "Full name is required." };
      if (!formData.email) return { valid: false, message: "Email is required." };
      if (!formData.phone) return { valid: false, message: "Phone number is required." };
      if (!formData.city) return { valid: false, message: "City is required." };
      if (!formData.country) return { valid: false, message: "Country is required." };
      return { valid: true };
    case 4:
      if (!formData.applyingAs) return { valid: false, message: "Please select what you're applying as." };
      if (!formData.professionalTitle) return { valid: false, message: "Professional title is required." };
      if ((application?.credentials?.length ?? 0) === 0) return { valid: false, message: "At least one credential is required." };
      return { valid: true };
    case 5: {
      const questions = formData.corePlatformQuestions || {};
      const answered = CORE_PLATFORM_QUESTIONS.filter((q) => (questions[q.id] || "").trim().length > 0);
      if (answered.length < CORE_PLATFORM_QUESTIONS.length) return { valid: false, message: `Please answer all ${CORE_PLATFORM_QUESTIONS.length} questions.` };
      return { valid: true };
    }
    case 6:
      if ((application?.references?.length ?? 0) < 3) return { valid: false, message: "Please add all 3 references." };
      return { valid: true };
    case 7:
      if (!formData.accessibilityStartingFee) return { valid: false, message: "Starting fee is required." };
      if (!formData.accessibilitySlidingScale) return { valid: false, message: "Please indicate if you offer sliding-scale sessions." };
      return { valid: true };
    case 8:
      if (!formData.termsAccepted) return { valid: false, message: "You must accept the terms and conditions." };
      if (!formData.termsInsuranceAgreement) return { valid: false, message: "Insurance agreement is required." };
      if (!formData.termsLicensureProof) return { valid: false, message: "Licensure proof agreement is required." };
      if (!formData.termsSignature) return { valid: false, message: "Electronic signature is required." };
      return { valid: true };
    default:
      return { valid: true };
  }
}

export default function ApplicationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [initialized, setInitialized] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paymentChecked = useRef(false);

  const { data: application, isLoading } = useQuery<any>({
    queryKey: ["/api/therapist/application"],
  });

  const { data: directorySettings } = useQuery<DirectorySettings>({
    queryKey: ["/api/directory-settings"],
  });

  const createApplication = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/therapist/application");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/application"] });
    },
  });

  const autosaveMutation = useMutation({
    mutationFn: async (data: { formData: FormData; currentStep: number }) => {
      const res = await apiRequest("PATCH", "/api/therapist/application/autosave", data);
      return res.json();
    },
    onSuccess: () => {
      setAutosaveStatus("saved");
      setTimeout(() => setAutosaveStatus("idle"), 2000);
    },
    onError: () => {
      setAutosaveStatus("error");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/therapist/application/create-payment-session");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({ title: "Payment failed", description: err?.message || "Could not initiate payment.", variant: "destructive" });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/therapist/application/confirm-payment");
      return res.json();
    },
    onSuccess: (data: { paid: boolean }) => {
      if (data.paid) {
        queryClient.invalidateQueries({ queryKey: ["/api/therapist/application"] });
        toast({ title: "Payment confirmed!", description: "Your application fee has been processed. You can continue with the remaining application steps." });
        setPaymentProcessing(false);
      } else {
        toast({ title: "Payment not confirmed", description: "We couldn't verify your payment. Please try again.", variant: "destructive" });
        setPaymentProcessing(false);
      }
    },
    onError: (err: any) => {
      setPaymentProcessing(false);
      toast({ title: "Payment verification failed", description: err?.message || "Please contact support if you were charged.", variant: "destructive" });
    },
  });

  const submitApplication = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/therapist/application/submit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/application"] });
      toast({ title: "Application submitted!", description: "We'll review your application and get back to you soon." });
      setLocation("/therapist/application/status");
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err?.message || "Please check all required fields.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (application && !initialized) {
      setFormData((application.formData as FormData) || {});
      const savedStep = application.currentStep || 0;
      const clampedStep =
        application.paymentStatus === "paid"
          ? savedStep
          : savedStep > 1
            ? 1
            : savedStep;
      setCurrentStep(clampedStep);
      setInitialized(true);
    }
  }, [application, initialized]);

  useEffect(() => {
    if (application && application.status === "draft" && user) {
      if (!formData.fullName && !formData.email) {
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
        if (name || user.email) {
          setFormData((prev) => ({
            ...prev,
            fullName: prev.fullName || name,
            email: prev.email || user.email,
          }));
        }
      }
    }
  }, [application, user]);

  useEffect(() => {
    if (!searchString || paymentChecked.current) return;
    const params = new URLSearchParams(searchString);
    if (params.get("payment") === "success") {
      paymentChecked.current = true;
      setPaymentProcessing(true);
      setCurrentStep(1);
      confirmPaymentMutation.mutate();
      window.history.replaceState({}, "", "/therapist/apply");
    } else if (params.get("payment") === "canceled") {
      paymentChecked.current = true;
      toast({ title: "Payment canceled", description: "You can try again when you're ready." });
      setCurrentStep(1);
      window.history.replaceState({}, "", "/therapist/apply");
    }
  }, [searchString]);

  const triggerAutosave = useCallback((newFormData: FormData, step: number) => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setAutosaveStatus("saving");
    autosaveTimer.current = setTimeout(() => {
      autosaveMutation.mutate({ formData: newFormData, currentStep: step });
    }, 1000);
  }, []);

  const handleFormChange = useCallback((updates: Partial<FormData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...updates };
      triggerAutosave(next, currentStep);
      return next;
    });
    setValidationError(null);
  }, [currentStep, triggerAutosave]);

  const handleStepChange = useCallback((step: number) => {
    if (step > currentStep) {
      for (let i = 0; i < step; i++) {
        const validation = getStepValidation(i, formData, application);
        if (!validation.valid) {
          setCurrentStep(i);
          setValidationError(validation.message || "Please complete this step before continuing.");
          return;
        }
      }
    }
    setCurrentStep(step);
    setValidationError(null);
    triggerAutosave(formData, step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [application, currentStep, formData, triggerAutosave]);

  const handleNext = useCallback(() => {
    const validation = getStepValidation(currentStep, formData, application);
    if (!validation.valid) {
      setValidationError(validation.message || "Please complete this step before continuing.");
      return;
    }
    if (currentStep < WIZARD_STEPS.length - 1) {
      handleStepChange(currentStep + 1);
    }
  }, [currentStep, formData, application, handleStepChange]);

  const submittingRef = useRef(false);

  const handleSubmitApplication = useCallback(() => {
    if (submittingRef.current) return;

    for (let i = 0; i < WIZARD_STEPS.length; i++) {
      const v = getStepValidation(i, formData, application);
      if (!v.valid) {
        setCurrentStep(i);
        setValidationError(v.message || "Please complete this step.");
        return;
      }
    }

    submittingRef.current = true;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveMutation.mutate({ formData, currentStep }, {
      onSuccess: () => submitApplication.mutate(undefined, {
        onSettled: () => { submittingRef.current = false; },
      }),
      onError: () => { submittingRef.current = false; },
    });
  }, [formData, application, currentStep]);

  const completedSteps = new Set<number>();
  for (let i = 0; i < WIZARD_STEPS.length; i++) {
    if (getStepValidation(i, formData, application).valid) {
      completedSteps.add(i);
    }
  }

  const isPaid = application?.paymentStatus === "paid";
  const effectiveDirectorySettings = directorySettings ?? {
    applicationFeeAmountCents: 15000,
    applicationFeeNoticeTitle: "Application Fee",
    applicationFeeNoticeBody:
      "Before your application can move into review, the application fee must be paid.",
    applicationFeePolicySummary:
      "If approved, the application fee can be credited toward your first membership invoice. If denied, the fee is non-refundable.",
    applicationFeeCreditOnApproval: true,
    applicationFeeCreditAmountCents: 15000,
  };

  useEffect(() => {
    if (application && application.status !== "draft") {
      setLocation("/therapist/application/status");
    }
  }, [application, setLocation]);

  if (isLoading) {
    return (
      <TherapistLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </TherapistLayout>
    );
  }

  if (application && application.status !== "draft") {
    return null;
  }

  if (!application) {
    return (
      <TherapistLayout>
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-heading">Apply for Membership</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              Join the Core Platform counselor network and connect with Third Culture Kids who need your expertise.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              onClick={() => createApplication.mutate()}
              disabled={createApplication.isPending}
              size="lg"
              data-testid="button-start-application"
            >
              {createApplication.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Begin Application
            </Button>
          </CardContent>
        </Card>
      </div>
      </TherapistLayout>
    );
  }

  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const allComplete = Array.from({ length: WIZARD_STEPS.length }, (_, i) => i).every((i) => completedSteps.has(i));

  return (
    <TherapistLayout>
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-4">
        <div />
        <AutosaveIndicator status={autosaveStatus} />
      </div>

      <h1 className="text-2xl font-heading font-bold mb-1" data-testid="text-page-title">Membership Application</h1>
      <p className="text-muted-foreground mb-6 text-sm">Complete each step to submit your application for review.</p>

      <StepIndicator currentStep={currentStep} onStepClick={handleStepChange} completedSteps={completedSteps} />

      {paymentProcessing && (
        <Alert className="mb-4 border-blue-200 dark:border-blue-800">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <AlertDescription>Confirming your payment... Please wait.</AlertDescription>
        </Alert>
      )}

      {validationError && (
        <Alert variant="destructive" className="mb-4" data-testid="alert-validation-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          {currentStep === 0 && (
            <ApplicationFeeNoticeStep
              directorySettings={effectiveDirectorySettings}
              formData={formData}
              onChange={handleFormChange}
            />
          )}
          {currentStep === 1 && (
            <ApplicationPaymentStep
              directorySettings={effectiveDirectorySettings}
              isPaid={isPaid}
              paymentPending={paymentMutation.isPending}
              paymentProcessing={paymentProcessing}
              onPayNow={() => paymentMutation.mutate()}
            />
          )}
          {currentStep === 2 && <BeforeYouBeginStep formData={formData} onChange={handleFormChange} />}
          {currentStep === 3 && <ContactInfoStep formData={formData} onChange={handleFormChange} />}
          {currentStep === 4 && <ProfessionalInfoStep formData={formData} onChange={handleFormChange} application={application} />}
          {currentStep === 5 && <TckQuestionsStep formData={formData} onChange={handleFormChange} />}
          {currentStep === 6 && <ReferencesStep application={application} />}
          {currentStep === 7 && <AccessibilityStep formData={formData} onChange={handleFormChange} />}
          {currentStep === 8 && <TermsStep formData={formData} onChange={handleFormChange} />}
        </CardContent>
      </Card>

      {isLastStep && allComplete && (
        <Card className="mt-4 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Send className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Ready to submit for review</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your payment has been completed and all required application steps are filled in. Submit now to send your application into the review workflow.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => handleStepChange(currentStep - 1)}
          disabled={currentStep === 0}
          data-testid="button-prev-step"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <div className="flex gap-2">
          {isLastStep && allComplete ? (
            <Button
              onClick={handleSubmitApplication}
              disabled={submitApplication.isPending || autosaveMutation.isPending || paymentProcessing}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-submit-application"
            >
              {submitApplication.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Application
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={currentStep >= WIZARD_STEPS.length - 1 && !allComplete}
              data-testid="button-next-step"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {isLastStep && !allComplete && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">Complete all steps to enable payment and submission.</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {WIZARD_STEPS.map((step, idx) => {
              if (completedSteps.has(idx)) return null;
              return (
                <Button
                  key={step.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStepChange(idx)}
                  className="text-xs"
                >
                  {step.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </TherapistLayout>
  );
}
