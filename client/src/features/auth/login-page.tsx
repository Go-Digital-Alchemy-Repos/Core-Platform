import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LogIn, Shield, Stethoscope, UserCheck } from "lucide-react";
import { Link } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

const testAccounts = [
  {
    label: "Admin",
    email: "admin@tckwellness.com",
    password: "Admin123!",
    icon: Shield,
    role: "admin",
  },
  {
    label: "Therapist",
    email: "therapist@test.com",
    password: "Therapist123!",
    icon: Stethoscope,
    role: "therapist",
  },
  {
    label: "Client",
    email: "client@test.com",
    password: "Client123!",
    icon: UserCheck,
    role: "client",
  },
];

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [quickLoginPending, setQuickLoginPending] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function redirectByRole(role: string) {
    if (role === "admin") {
      setLocation("/admin");
    } else if (role === "therapist") {
      setLocation("/therapist");
    } else {
      setLocation("/");
    }
  }

  async function onSubmit(values: LoginForm) {
    login.mutate(values, {
      onSuccess: (data: any) => {
        toast({ title: "Welcome back!", description: "You have been logged in." });
        redirectByRole(data.role);
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

  async function handleQuickLogin(account: typeof testAccounts[0]) {
    setQuickLoginPending(account.label);
    form.setValue("email", account.email);
    form.setValue("password", account.password);

    login.mutate(
      { email: account.email, password: account.password },
      {
        onSuccess: (data: any) => {
          toast({ title: "Welcome back!", description: `Logged in as ${account.label}` });
          setQuickLoginPending(null);
          redirectByRole(data.role);
        },
        onError: (error: Error) => {
          setQuickLoginPending(null);
          toast({
            title: "Login failed",
            description: error.message || "Could not log in with test account",
            variant: "destructive",
          });
        },
      }
    );
  }

  const isPending = login.isPending;

  return (
    <PageLayout>
      <div className="flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold" data-testid="text-login-title">
              Welcome Back
            </h1>
            <p className="text-muted-foreground mt-2" data-testid="text-login-subtitle">
              Sign in to your TCK Wellness account
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            data-testid="input-email"
                            {...field}
                          />
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
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            data-testid="input-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isPending}
                    data-testid="button-login"
                  >
                    {isPending && !quickLoginPending ? (
                      <LoadingSpinner className="h-4 w-4 mr-2" />
                    ) : (
                      <LogIn className="h-4 w-4 mr-2" />
                    )}
                    Sign In
                  </Button>
                </form>
              </Form>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/auth/register" className="text-accent underline" data-testid="link-register">
                  Register here
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Accounts</CardTitle>
              <CardDescription>Quick login with pre-configured accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {testAccounts.map((account) => (
                <Button
                  key={account.label}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  disabled={isPending}
                  onClick={() => handleQuickLogin(account)}
                  data-testid={`button-quick-login-${account.role}`}
                >
                  {quickLoginPending === account.label ? (
                    <LoadingSpinner className="h-4 w-4" />
                  ) : (
                    <account.icon className="h-4 w-4" />
                  )}
                  <span>{account.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{account.email}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
