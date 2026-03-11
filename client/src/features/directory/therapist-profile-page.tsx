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
  MessageSquare,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MapView } from "@/components/directory/map-view";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
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
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  const { data: therapist, isLoading, error } = useQuery<TherapistWithUser>({
    queryKey: ["/api/therapists", id],
    enabled: !!id,
  });

  const startConversationMutation = useMutation({
    mutationFn: async (counselorUserId: string) => {
      const res = await apiRequest("POST", "/api/messages/conversations", { counselorId: counselorUserId });
      return res.json();
    },
    onSuccess: (conv) => {
      navigate(`/messages?conversation=${conv.id}`);
    },
  });

  const handleContact = () => {
    if (!user) {
      setLoginPromptOpen(true);
      return;
    }
    if (!therapist?.userId) return;
    if (user.id === therapist.userId) return;
    startConversationMutation.mutate(therapist.userId);
  };

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
            Counselor not found.
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

  const fullName =
    [therapist.user?.firstName, therapist.user?.lastName].filter(Boolean).join(" ") || "Counselor";
  const initials = `${(therapist.user?.firstName || "")[0] || ""}${(therapist.user?.lastName || "")[0] || ""}`.toUpperCase();
  const specializations = therapist.specializations || [];
  const languages = therapist.languages || [];

  const locationParts = [therapist.city, therapist.state, therapist.country].filter(Boolean);
  const addressParts = [
    therapist.addressLine1,
    therapist.addressLine2,
    therapist.city,
    therapist.state,
    therapist.zipCode,
    therapist.country,
  ].filter(Boolean);

  const hasLocation = therapist.latitude != null && therapist.longitude != null;
  const showMap =
    hasLocation && (therapist.practiceMode === "in_person" || therapist.practiceMode === "both");

  const hasContact = therapist.phone || therapist.website || addressParts.length > 0;
  const isSelf = user?.id === therapist.userId;

  const socialLinks = [
    { key: "instagram", handle: therapist.instagramHandle, url: `https://instagram.com/${therapist.instagramHandle}`, icon: SiInstagram, color: "text-pink-500", label: "Instagram" },
    { key: "facebook", handle: therapist.facebookHandle, url: `https://facebook.com/${therapist.facebookHandle}`, icon: SiFacebook, color: "text-blue-600", label: "Facebook" },
    { key: "twitter", handle: therapist.twitterHandle, url: `https://x.com/${therapist.twitterHandle}`, icon: SiX, color: "text-foreground", label: "X / Twitter" },
    { key: "linkedin", handle: therapist.linkedinHandle, url: `https://linkedin.com/in/${therapist.linkedinHandle}`, icon: SiLinkedin, color: "text-blue-700", label: "LinkedIn" },
    { key: "youtube", handle: therapist.youtubeHandle, url: `https://youtube.com/@${therapist.youtubeHandle}`, icon: SiYoutube, color: "text-red-600", label: "YouTube" },
    { key: "tiktok", handle: therapist.tiktokHandle, url: `https://tiktok.com/@${therapist.tiktokHandle}`, icon: SiTiktok, color: "text-foreground", label: "TikTok" },
  ].filter((s) => !!s.handle);
  const hasSocial = socialLinks.length > 0;

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link href="/directory">
          <Button variant="ghost" className="mb-4" data-testid="link-back-directory">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Directory
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-center sm:items-start gap-4 space-y-0 text-center sm:text-left">
                <Avatar className="h-20 w-20 sm:h-20 sm:w-20 flex-shrink-0">
                  {therapist.user?.profileImageUrl && (
                    <AvatarImage src={therapist.user.profileImageUrl} alt={fullName} />
                  )}
                  <AvatarFallback data-testid="avatar-therapist" className="text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1 min-w-0">
                  <h1
                    className="text-xl sm:text-2xl font-heading font-semibold break-words"
                    data-testid="text-therapist-name"
                  >
                    {fullName}
                  </h1>
                  {therapist.title && (
                    <p className="text-muted-foreground text-sm sm:text-base" data-testid="text-therapist-title">
                      {therapist.title}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1 justify-center sm:justify-start">
                    <Badge variant="outline" data-testid="badge-practice-mode">
                      {therapist.practiceMode === "in_person" || therapist.practiceMode === "both" ? (
                        <Building2 className="h-3 w-3 mr-1" />
                      ) : (
                        <Monitor className="h-3 w-3 mr-1" />
                      )}
                      {getSessionFormatLabel(therapist.practiceMode)}
                    </Badge>
                    {therapist.acceptingClients ? (
                      <Badge variant="secondary" data-testid="badge-accepting">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Accepting Clients
                      </Badge>
                    ) : (
                      <Badge variant="outline" data-testid="badge-not-accepting">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Accepting
                      </Badge>
                    )}
                    {locationParts.length > 0 && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="break-words">{locationParts.join(", ")}</span>
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-6">
                {therapist.bio && (
                  <section>
                    <h2 className="text-lg font-semibold mb-2" data-testid="heading-bio">
                      About
                    </h2>
                    <p className="text-sm leading-relaxed whitespace-pre-line" data-testid="text-bio">
                      {therapist.bio}
                    </p>
                  </section>
                )}

                <Separator />

                {specializations.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold mb-2" data-testid="heading-specializations">
                      Specializations
                    </h2>
                    <div className="flex flex-wrap gap-1.5" data-testid="list-specializations">
                      {specializations.map((spec) => (
                        <Badge key={spec} variant="secondary">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </section>
                )}

                {languages.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold mb-2" data-testid="heading-languages">
                      Languages
                    </h2>
                    <div className="flex flex-wrap gap-1.5" data-testid="list-languages">
                      {languages.map((lang) => (
                        <Badge key={lang} variant="outline">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </section>
                )}

                {therapist.credentials && (
                  <section>
                    <h2 className="text-lg font-semibold mb-2" data-testid="heading-credentials">
                      Credentials
                    </h2>
                    <p className="text-sm" data-testid="text-credentials">
                      {therapist.credentials}
                    </p>
                    {therapist.licenseNumber && (
                      <p className="text-sm text-muted-foreground mt-1" data-testid="text-license">
                        License #: {therapist.licenseNumber}
                      </p>
                    )}
                  </section>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            {!isSelf && (
              <Card data-testid="card-contact-button">
                <CardContent className="pt-6">
                  <Button
                    className="w-full bg-accent text-accent-foreground border-accent-border"
                    size="lg"
                    onClick={handleContact}
                    disabled={startConversationMutation.isPending}
                    data-testid="button-contact-counselor"
                  >
                    {startConversationMutation.isPending ? (
                      <LoadingSpinner className="h-4 w-4 mr-2" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-2" />
                    )}
                    Contact This Counselor
                  </Button>
                  {!user && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Account required to send messages
                    </p>
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
                    This counselor offers sessions online and is available worldwide.
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
                        href={url}
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
      <Dialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
        <DialogContent data-testid="dialog-login-prompt">
          <DialogHeader>
            <DialogTitle>Sign in to send messages</DialogTitle>
            <DialogDescription>
              You need an account to contact counselors. Login or create a free account to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/auth/login">
              <Button className="w-full bg-accent text-accent-foreground border-accent-border" data-testid="button-prompt-login">
                Login
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" className="w-full" data-testid="button-prompt-register">
                Create an Account
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
