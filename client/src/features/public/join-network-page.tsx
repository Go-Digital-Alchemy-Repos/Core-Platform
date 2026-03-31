import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSpecializations } from "@/hooks/use-specializations";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  UserPlus,
  LogIn,
  ClipboardCheck,
  Users,
  BarChart3,
  Star,
  ArrowRight,
} from "lucide-react";

const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    specializations: z.array(z.string()).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

const membershipBenefits = [
  {
    icon: ClipboardCheck,
    title: "Directory Listing",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    icon: Users,
    title: "Client Connections",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    icon: BarChart3,
    title: "Profile Analytics",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    icon: Star,
    title: "Community Access",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
];

const applicationSteps = [
  {
    step: 1,
    title: "Submit Your Application",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
  },
  {
    step: 2,
    title: "Credential Verification",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
  },
  {
    step: 3,
    title: "TCK Competency Review",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
  },
  {
    step: 4,
    title: "Profile Setup",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
  },
  {
    step: 5,
    title: "Go Live in the Directory",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
  },
];

function ProfessionalRegisterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const { specializations: specList } = useSpecializations();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      specializations: [],
    },
  });

  async function onSubmit(values: RegisterForm) {
    const { confirmPassword, specializations, ...rest } = values;
    const data = {
      ...rest,
      role: "therapist" as const,
      ...(specializations && specializations.length > 0 ? { specializations } : {}),
    };
    register.mutate(data, {
      onSuccess: () => {
        toast({ title: "Application submitted!", description: "Welcome to TCK Wellness." });
        onOpenChange(false);
        setLocation("/therapist");
      },
      onError: (error: Error) => {
        toast({
          title: "Registration failed",
          description: error.message || "Could not create account",
          variant: "destructive",
        });
      },
    });
  }

  const isPending = register.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mental Health Professional Application</DialogTitle>
          <DialogDescription>Fill in your details to apply for membership</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" data-testid="input-professional-first-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" data-testid="input-professional-last-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" data-testid="input-professional-email" {...field} />
                  </FormControl>
                  <FormDescription data-testid="text-email-privacy-note">
                    Your email will remain hidden and private at all times from the public.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specializations"
              render={() => (
                <FormItem>
                  <FormLabel>Specializations</FormLabel>
                  <p className="text-xs text-muted-foreground mb-2">Select all that apply. You can update these later from your profile.</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-48 overflow-y-auto border rounded-md p-3" data-testid="checkbox-group-professional-specializations">
                    {specList.map(({ name: spec }) => {
                      const current = form.getValues("specializations") || [];
                      const isChecked = current.includes(spec);
                      return (
                        <div key={spec} className="flex items-center gap-2">
                          <Checkbox
                            id={`professional-spec-${spec}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const prev = form.getValues("specializations") || [];
                              if (checked) {
                                form.setValue("specializations", [...prev, spec], { shouldDirty: true });
                              } else {
                                form.setValue("specializations", prev.filter((s) => s !== spec), { shouldDirty: true });
                              }
                            }}
                            data-testid={`checkbox-professional-spec-${spec.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                          />
                          <Label htmlFor={`professional-spec-${spec}`} className="text-xs font-normal cursor-pointer leading-tight">
                            {spec}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="At least 8 characters" data-testid="input-professional-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Re-enter your password" data-testid="input-professional-confirm-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-professional-register">
              {isPending ? (
                <LoadingSpinner className="h-4 w-4 mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Submit Application
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function LoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginForm) {
    login.mutate(values, {
      onSuccess: (data: any) => {
        toast({ title: "Welcome back!", description: "You have been logged in." });
        onOpenChange(false);
        if (data.role === "admin") setLocation("/admin");
        else if (data.role === "therapist") setLocation("/therapist");
        else setLocation("/");
      },
      onError: (error: Error) => {
        toast({
          title: "Login failed",
          description: error.message || "Invalid credentials",
          variant: "destructive",
        });
      },
    });
  }

  const isPending = login.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Member Login</DialogTitle>
          <DialogDescription>Sign in to your mental health professional account</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" data-testid="input-login-email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your password" data-testid="input-login-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-login-submit">
              {isPending ? (
                <LoadingSpinner className="h-4 w-4 mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              Sign In
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function JoinNetworkPage() {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <PageLayout>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center" data-testid="section-join-hero">
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6" data-testid="text-join-title">
          Are you a TCK-Informed Mental Health Professional?{" "}
          <span className="text-accent">Join the Network!</span>
        </h1>

        <Button
          size="lg"
          className="bg-accent text-accent-foreground border-accent-border text-base px-8 py-6"
          onClick={() => setRegisterOpen(true)}
          data-testid="button-apply-member"
        >
          <UserPlus className="mr-2 h-5 w-5" />
          Apply to Become a Member
        </Button>

        <p className="text-sm sm:text-base text-muted-foreground mt-6" data-testid="text-login-prompt">
          If you're already a member click here to{" "}
          <button
            onClick={() => setLoginOpen(true)}
            className="text-accent underline underline-offset-2 hover:text-accent/80 font-medium"
            data-testid="button-member-login"
          >
            Log in
          </button>{" "}
          to your profile!
        </p>
      </section>

      <section className="relative bg-muted/30 overflow-hidden" data-testid="section-membership-benefits">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.12) 0%, transparent 70%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-10 sm:mb-14" data-testid="text-membership-heading">
            What Does Membership Include?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {membershipBenefits.map((benefit, idx) => (
              <div key={idx} className="text-center" data-testid={`card-benefit-${idx}`}>
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-semibold text-base mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24" data-testid="section-application-process">
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-10 sm:mb-14" data-testid="text-process-heading">
          The Application Process
        </h2>
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden sm:block" />
          <div className="space-y-8 sm:space-y-10">
            {applicationSteps.map((step, idx) => (
              <div key={idx} className="flex gap-4 sm:gap-6" data-testid={`step-${idx}`}>
                <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg">
                  {step.step}
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-base sm:text-lg mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-muted/30 overflow-hidden" data-testid="section-training-cta">
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 100%, hsl(var(--accent) / 0.12) 0%, transparent 70%)" }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold mb-4" data-testid="text-training-heading">
            Interested in Training but Not a Member?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-8">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          </p>
          <Button size="lg" className="bg-accent text-accent-foreground border-accent-border" data-testid="button-learn-more-training">
            Learn More
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <ProfessionalRegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </PageLayout>
  );
}
