import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  Monitor,
  Building2,
  CheckCircle2,
  XCircle,
  Video,
  Mail,
  Send,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapView } from "@/components/directory/map-view";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { TherapistProfile } from "@shared/schema/therapist-profiles";
import { SiInstagram, SiFacebook, SiX, SiLinkedin, SiYoutube, SiTiktok } from "react-icons/si";

type TherapistWithUser = TherapistProfile & {
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
};

function getSessionFormatLabel(mode: string | null) {
  switch (mode) {
    case "in_person":
      return "In-Person";
    case "virtual":
      return "Virtual";
    case "both":
      return "In-Person & Virtual";
    default:
      return "Virtual";
  }
}

export default function TherapistProfilePage() {
  const [, params] = useRoute("/directory/:id");
  const id = params?.id;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "", preferredContact: "email" as "email" | "phone" | "text", phone: "" });
  const [showContactForm, setShowContactForm] = useState(false);

  const { data: therapist, isLoading, error } = useQuery<TherapistWithUser>({
    queryKey: ["/api/therapists", id],
    enabled: !!id,
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { professionalUserId: string; senderName: string; senderEmail: string; message: string; preferredContact: string; phone?: string }) => {
      const res = await fetch("/api/contact-professional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
            ? payload.message
            : null) || "Something went wrong. Please try again.",
        );
      }
      return payload;
    },
    onSuccess: () => {
      toast({ title: "Message sent", description: "Your message has been emailed to this mental health professional." });
      setContactForm({ name: "", email: "", message: "", preferredContact: "email", phone: "" });
      setShowContactForm(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to send", description: err.message || "Something went wrong. Please try again.", variant: "destructive" });
    },
  });

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!therapist?.userId) return;
    const payload: { professionalUserId: string; senderName: string; senderEmail: string; message: string; preferredContact: string; phone?: string } = {
      professionalUserId: therapist.userId,
      senderName: contactForm.name,
      senderEmail: contactForm.email,
      message: contactForm.message,
      preferredContact: contactForm.preferredContact,
    };
    if (contactForm.preferredContact !== "email" && contactForm.phone) {
      payload.phone = contactForm.phone;
    }
    sendEmailMutation.mutate(payload);
  };

  const isSelf = user && therapist?.userId === user.id;

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      </PageLayout>
    );
  }

  if (error || !therapist) {
    return (
      <PageLayout>
        <div className="container mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
          <p className="text-lg text-muted-foreground" data-testid="text-not-found">
            Mental health professional not found.
          </p>
          <Link href="/directory">
            <Button variant="outline" data-testid="link-back-directory">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Directory
            </Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const displayName = [therapist.user?.firstName, therapist.user?.lastName].filter(Boolean).join(" ") || "Mental Health Professional";
  const initials = [therapist.user?.firstName?.[0], therapist.user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";
  const addressParts = [therapist.addressLine1, therapist.addressLine2, therapist.city, therapist.state, therapist.zipCode, therapist.country].filter(Boolean);
  const hasContact = addressParts.length > 0 || therapist.phone || therapist.website;
  const showMap = therapist.latitude != null && therapist.longitude != null;

  function socialUrl(platform: string, handle: string | null): string | null {
    if (!handle) return null;
    if (/^https?:\/\//i.test(handle)) return handle;
    const clean = handle.replace(/^@/, "");
    const bases: Record<string, string> = {
      instagram: "https://instagram.com/",
      facebook: "https://facebook.com/",
      twitter: "https://x.com/",
      linkedin: "https://linkedin.com/in/",
      youtube: "https://youtube.com/@",
      tiktok: "https://tiktok.com/@",
    };
    return bases[platform] ? `${bases[platform]}${clean}` : null;
  }

  const socialLinks = [
    { key: "instagram", url: socialUrl("instagram", therapist.instagramHandle), icon: SiInstagram, color: "text-pink-600", label: "Instagram" },
    { key: "facebook", url: socialUrl("facebook", therapist.facebookHandle), icon: SiFacebook, color: "text-blue-600", label: "Facebook" },
    { key: "twitter", url: socialUrl("twitter", therapist.twitterHandle), icon: SiX, color: "text-foreground", label: "X (Twitter)" },
    { key: "linkedin", url: socialUrl("linkedin", therapist.linkedinHandle), icon: SiLinkedin, color: "text-blue-700", label: "LinkedIn" },
    { key: "youtube", url: socialUrl("youtube", therapist.youtubeHandle), icon: SiYoutube, color: "text-red-600", label: "YouTube" },
    { key: "tiktok", url: socialUrl("tiktok", therapist.tiktokHandle), icon: SiTiktok, color: "text-foreground", label: "TikTok" },
  ].filter((s) => s.url);
  const hasSocial = socialLinks.length > 0;

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link href="/directory">
          <Button variant="ghost" className="mb-6 -ml-2" data-testid="link-back-directory-top">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Directory
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="flex flex-col gap-6">
            <Card data-testid="card-profile-header">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <Avatar className="h-24 w-24 shrink-0 border">
                    <AvatarImage src={therapist.user?.profileImageUrl ?? undefined} alt={displayName} />
                    <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight" data-testid="text-professional-name">
                      {displayName}
                    </h1>
                    {therapist.title && (
                      <p className="text-muted-foreground mt-1" data-testid="text-title">{therapist.title}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Badge variant="secondary" data-testid="badge-session-format">
                        {therapist.practiceMode === "virtual" ? (
                          <Monitor className="h-3 w-3 mr-1" />
                        ) : (
                          <Building2 className="h-3 w-3 mr-1" />
                        )}
                        {getSessionFormatLabel(therapist.practiceMode)}
                      </Badge>
                      {therapist.acceptingClients ? (
                        <Badge variant="outline" className="text-green-700 border-green-300" data-testid="badge-accepting">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Accepting Clients
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-700 border-red-300" data-testid="badge-not-accepting">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Accepting Clients
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {therapist.bio && (
              <Card data-testid="card-bio">
                <CardHeader>
                  <h2 className="text-lg font-semibold">About</h2>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
                    data-testid="text-bio"
                    dangerouslySetInnerHTML={{ __html: therapist.bio }}
                  />
                </CardContent>
              </Card>
            )}

            {(therapist.specializations as string[] | null)?.length ? (
              <Card data-testid="card-specializations">
                <CardHeader>
                  <h2 className="text-lg font-semibold">Specializations</h2>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(therapist.specializations as string[]).map((s) => (
                      <Badge key={s} variant="secondary" data-testid={`badge-specialization-${s}`}>{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {(therapist.languages as string[] | null)?.length ? (
              <Card data-testid="card-languages">
                <CardHeader>
                  <h2 className="text-lg font-semibold">Languages</h2>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(therapist.languages as string[]).map((l) => (
                      <Badge key={l} variant="outline" data-testid={`badge-language-${l}`}>{l}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {therapist.credentials && (
              <Card data-testid="card-education">
                <CardHeader>
                  <h2 className="text-lg font-semibold">Credentials</h2>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-muted-foreground" data-testid="text-credentials">
                    {therapist.credentials}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {!isSelf && (
              <Card data-testid="card-contact-form">
                <CardContent className="pt-6">
                  {!showContactForm ? (
                    <>
                      <Button
                        className="w-full bg-accent text-accent-foreground border-accent-border"
                        size="lg"
                        onClick={() => setShowContactForm(true)}
                        data-testid="button-contact-professional"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Contact {displayName}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Send a message — no account required
                      </p>
                    </>
                  ) : (
                    <form onSubmit={handleSendEmail} className="flex flex-col gap-4">
                      <h3 className="font-semibold text-base" data-testid="heading-contact-form">
                        Send a Message
                      </h3>
                      <div className="space-y-1.5">
                        <Label htmlFor="sender-name">Your Name</Label>
                        <Input
                          id="sender-name"
                          value={contactForm.name}
                          onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                          required
                          maxLength={100}
                          placeholder="Your full name"
                          data-testid="input-sender-name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sender-email">Your Email</Label>
                        <Input
                          id="sender-email"
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                          required
                          maxLength={255}
                          placeholder="you@example.com"
                          data-testid="input-sender-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preferred Method of Contact</Label>
                        <div className="flex flex-col gap-2">
                          {([
                            { value: "email", label: "Email" },
                            { value: "phone", label: "Phone Call" },
                            { value: "text", label: "Text Message" },
                          ] as const).map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center gap-2 cursor-pointer text-sm"
                              data-testid={`radio-contact-${option.value}`}
                            >
                              <input
                                type="radio"
                                name="preferredContact"
                                value={option.value}
                                checked={contactForm.preferredContact === option.value}
                                onChange={() => setContactForm((f) => ({ ...f, preferredContact: option.value }))}
                                className="accent-primary h-4 w-4"
                              />
                              {option.label}
                            </label>
                          ))}
                        </div>
                      </div>
                      {(contactForm.preferredContact === "phone" || contactForm.preferredContact === "text") && (
                        <div className="space-y-1.5">
                          <Label htmlFor="sender-phone">Your Phone Number</Label>
                          <Input
                            id="sender-phone"
                            type="tel"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                            required
                            maxLength={30}
                            placeholder="(555) 123-4567"
                            data-testid="input-sender-phone"
                          />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label htmlFor="sender-message">Message</Label>
                        <Textarea
                          id="sender-message"
                          value={contactForm.message}
                          onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                          required
                          minLength={10}
                          maxLength={5000}
                          rows={5}
                          placeholder="Write your message here..."
                          data-testid="input-sender-message"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          className="flex-1 bg-accent text-accent-foreground border-accent-border"
                          disabled={sendEmailMutation.isPending}
                          data-testid="button-send-email"
                        >
                          {sendEmailMutation.isPending ? (
                            <LoadingSpinner className="h-4 w-4 mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Send Message
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowContactForm(false)}
                          disabled={sendEmailMutation.isPending}
                          data-testid="button-cancel-contact"
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your message will be emailed directly to this mental health professional. They will reply to you at the email address you provide.
                      </p>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {showMap && (
              <Card className="overflow-hidden" data-testid="card-map">
                <div className="aspect-video lg:aspect-square">
                  <MapView
                    therapists={[
                      {
                        profile: therapist,
                        user: {
                          firstName: therapist.user?.firstName ?? null,
                          lastName: therapist.user?.lastName ?? null,
                        },
                      },
                    ]}
                    height="100%"
                    interactive={false}
                  />
                </div>
              </Card>
            )}

            {!showMap && therapist.practiceMode === "virtual" && (
              <Card data-testid="card-virtual-notice">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
                    <Video className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium">Virtual Practice</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This mental health professional offers sessions online and is available worldwide.
                  </p>
                </CardContent>
              </Card>
            )}

            {hasContact && (
              <Card data-testid="card-contact">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4" data-testid="heading-contact">
                    Contact Information
                  </h3>
                  <div className="flex flex-col gap-3 text-sm">
                    {addressParts.length > 0 && (
                      <div className="flex items-start gap-3" data-testid="text-address">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground break-words min-w-0">{addressParts.join(", ")}</span>
                      </div>
                    )}
                    {therapist.phone && (
                      <div className="flex items-center gap-3" data-testid="text-phone">
                        <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <a href={`tel:${therapist.phone}`} className="hover:underline break-all min-w-0">
                          {therapist.phone}
                        </a>
                      </div>
                    )}
                    {therapist.website && (
                      <div className="flex items-center gap-3 min-w-0" data-testid="text-website">
                        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <a
                          href={therapist.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline break-all min-w-0"
                        >
                          {therapist.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {hasSocial && (
              <Card data-testid="card-social">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4" data-testid="heading-social">
                    Connect
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {socialLinks.map(({ key, url, icon: Icon, color, label }) => (
                      <a
                        key={key}
                        href={url ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={label}
                        className={`inline-flex items-center justify-center h-9 w-9 rounded-full bg-muted hover:bg-muted/70 transition-colors ${color}`}
                        data-testid={`link-social-${key}`}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
