import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Send, CheckCircle2, Upload, Users, FileCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProviderApplication } from "@shared/schema";

const WIZARD_STEPS = [
  { id: "overview", label: "Overview", icon: FileCheck },
  { id: "credentials", label: "Credentials", icon: Upload },
  { id: "references", label: "References", icon: Users },
  { id: "review", label: "Review & Submit", icon: Send },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-8" data-testid="step-indicator">
      {WIZARD_STEPS.map((step, idx) => {
        const StepIcon = step.icon;
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCompleted
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
                }`}
                data-testid={`step-${step.id}`}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
              </div>
              <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {idx < WIZARD_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mt-[-1rem] ${idx < currentStep ? "bg-primary" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OverviewStep() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" data-testid="text-step-title">Welcome to the Application Process</h3>
      <p className="text-muted-foreground">
        Thank you for your interest in joining the TCK Wellness counselor network. This application will guide you through the process of becoming a listed provider.
      </p>
      <div className="grid gap-3 mt-4">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <div>
              <p className="font-medium">Credentials & Licensing</p>
              <p className="text-sm text-muted-foreground">Upload your professional credentials, licenses, and certifications.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <div>
              <p className="font-medium">Professional References</p>
              <p className="text-sm text-muted-foreground">Provide contact information for professional references who can vouch for your work.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <div>
              <p className="font-medium">Review & Submit</p>
              <p className="text-sm text-muted-foreground">Review your application and submit it for our team to evaluate.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Alert className="mt-4">
        <AlertDescription>
          After submission, our team will review your application, which may include a background check and interview. You'll be notified at each step of the process.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function CredentialsStep({ applicationId }: { applicationId: string }) {
  const { toast } = useToast();
  const [credentialType, setCredentialType] = useState("");
  const [issuer, setIssuer] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [stateOrCountry, setStateOrCountry] = useState("");

  const { data: application } = useQuery<any>({
    queryKey: ["/api/therapist/application"],
  });

  const credentials = application?.credentials ?? [];

  const addCredential = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/therapist/application/credentials", {
        credentialType,
        issuer,
        licenseNumber,
        stateOrCountry,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/application"] });
      setCredentialType("");
      setIssuer("");
      setLicenseNumber("");
      setStateOrCountry("");
      toast({ title: "Credential added" });
    },
    onError: () => {
      toast({ title: "Failed to add credential", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold" data-testid="text-step-title">Professional Credentials</h3>
      <p className="text-muted-foreground">Add your professional licenses, certifications, and educational credentials.</p>

      {credentials.length > 0 && (
        <div className="space-y-2">
          <Label>Added Credentials</Label>
          {credentials.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{c.credentialType}</p>
                  <p className="text-xs text-muted-foreground">{c.issuer} {c.licenseNumber && `— #${c.licenseNumber}`}</p>
                </div>
                <Badge variant="outline">{c.verificationStatus}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Credential</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="credentialType">Credential Type *</Label>
            <Input
              id="credentialType"
              placeholder="e.g., Licensed Professional Counselor (LPC)"
              value={credentialType}
              onChange={(e) => setCredentialType(e.target.value)}
              data-testid="input-credential-type"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="issuer">Issuing Organization</Label>
              <Input
                id="issuer"
                placeholder="e.g., State Board of Counseling"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                data-testid="input-credential-issuer"
              />
            </div>
            <div>
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                placeholder="e.g., LPC-12345"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                data-testid="input-license-number"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="stateOrCountry">State / Country</Label>
            <Input
              id="stateOrCountry"
              placeholder="e.g., California, USA"
              value={stateOrCountry}
              onChange={(e) => setStateOrCountry(e.target.value)}
              data-testid="input-state-country"
            />
          </div>
          <Button
            onClick={() => addCredential.mutate()}
            disabled={!credentialType || addCredential.isPending}
            data-testid="button-add-credential"
          >
            {addCredential.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Credential
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ReferencesStep({ applicationId }: { applicationId: string }) {
  const { toast } = useToast();
  const [refereeName, setRefereeName] = useState("");
  const [refereeEmail, setRefereeEmail] = useState("");
  const [refereePhone, setRefereePhone] = useState("");
  const [relationship, setRelationship] = useState("");

  const { data: application } = useQuery<any>({
    queryKey: ["/api/therapist/application"],
  });

  const references = application?.references ?? [];

  const addReference = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/therapist/application/references", {
        refereeName,
        refereeEmail,
        refereePhone: refereePhone || undefined,
        relationship: relationship || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/application"] });
      setRefereeName("");
      setRefereeEmail("");
      setRefereePhone("");
      setRelationship("");
      toast({ title: "Reference added" });
    },
    onError: () => {
      toast({ title: "Failed to add reference", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold" data-testid="text-step-title">Professional References</h3>
      <p className="text-muted-foreground">Please provide at least two professional references who can speak to your clinical abilities and professional conduct.</p>

      {references.length > 0 && (
        <div className="space-y-2">
          <Label>Added References ({references.length})</Label>
          {references.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{r.refereeName}</p>
                  <p className="text-xs text-muted-foreground">{r.refereeEmail} {r.relationship && `— ${r.relationship}`}</p>
                </div>
                <Badge variant="outline">{r.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="refereeName">Full Name *</Label>
              <Input
                id="refereeName"
                placeholder="Dr. Jane Smith"
                value={refereeName}
                onChange={(e) => setRefereeName(e.target.value)}
                data-testid="input-referee-name"
              />
            </div>
            <div>
              <Label htmlFor="refereeEmail">Email *</Label>
              <Input
                id="refereeEmail"
                type="email"
                placeholder="jane@example.com"
                value={refereeEmail}
                onChange={(e) => setRefereeEmail(e.target.value)}
                data-testid="input-referee-email"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="refereePhone">Phone</Label>
              <Input
                id="refereePhone"
                placeholder="+1 (555) 123-4567"
                value={refereePhone}
                onChange={(e) => setRefereePhone(e.target.value)}
                data-testid="input-referee-phone"
              />
            </div>
            <div>
              <Label htmlFor="relationship">Relationship</Label>
              <Input
                id="relationship"
                placeholder="e.g., Supervisor, Colleague"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                data-testid="input-referee-relationship"
              />
            </div>
          </div>
          <Button
            onClick={() => addReference.mutate()}
            disabled={!refereeName || !refereeEmail || addReference.isPending}
            data-testid="button-add-reference"
          >
            {addReference.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Reference
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewStep({ application }: { application: any }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
    onError: () => {
      toast({ title: "Failed to submit", variant: "destructive" });
    },
  });

  const credentialCount = application?.credentials?.length ?? 0;
  const referenceCount = application?.references?.length ?? 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold" data-testid="text-step-title">Review & Submit</h3>
      <p className="text-muted-foreground">Please review your application before submitting.</p>

      <div className="grid gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Credentials</p>
                <p className="text-sm text-muted-foreground">{credentialCount} credential(s) added</p>
              </div>
              <Badge variant={credentialCount > 0 ? "default" : "destructive"}>
                {credentialCount > 0 ? "Complete" : "Required"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">References</p>
                <p className="text-sm text-muted-foreground">{referenceCount} reference(s) added</p>
              </div>
              <Badge variant={referenceCount >= 2 ? "default" : "destructive"}>
                {referenceCount >= 2 ? "Complete" : "Need at least 2"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertDescription>
          By submitting this application, you confirm that all information provided is accurate and complete. Our team will review your application and may contact you for additional information, a background check, or an interview.
        </AlertDescription>
      </Alert>

      <Button
        onClick={() => submitApplication.mutate()}
        disabled={credentialCount === 0 || referenceCount < 2 || submitApplication.isPending}
        className="w-full"
        size="lg"
        data-testid="button-submit-application"
      >
        {submitApplication.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        <Send className="w-4 h-4 mr-2" />
        Submit Application
      </Button>
    </div>
  );
}

export default function ApplicationPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();

  const { data: application, isLoading } = useQuery<any>({
    queryKey: ["/api/therapist/application"],
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (application && application.status !== "draft") {
    setLocation("/therapist/application/status");
    return null;
  }

  if (!application) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <div className="mb-4">
          <Link href="/therapist">
            <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Apply for Membership</CardTitle>
            <CardDescription>
              Join the TCK Wellness counselor network and connect with Third Culture Kids who need your expertise.
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
              Start Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-4">
        <Link href="/therapist">
          <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-heading font-bold mb-2" data-testid="text-page-title">Membership Application</h1>
      <p className="text-muted-foreground mb-6">Complete each step to submit your application for review.</p>

      <StepIndicator currentStep={currentStep} />

      <Card>
        <CardContent className="p-6">
          {currentStep === 0 && <OverviewStep />}
          {currentStep === 1 && <CredentialsStep applicationId={application.id} />}
          {currentStep === 2 && <ReferencesStep applicationId={application.id} />}
          {currentStep === 3 && <ReviewStep application={application} />}
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={currentStep === 0}
          data-testid="button-prev-step"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        {currentStep < WIZARD_STEPS.length - 1 && (
          <Button
            onClick={() => setCurrentStep((s) => s + 1)}
            data-testid="button-next-step"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
