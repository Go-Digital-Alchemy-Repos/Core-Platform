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
import { LogIn } from "lucide-react";
import { Link } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
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
                    {isPending ? (
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
        </div>
      </div>
    </PageLayout>
  );
}
