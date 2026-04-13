import { Link } from "wouter";
import { MapPin, Monitor, Building2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { TherapistProfile } from "@shared/schema/therapist-profiles";
import type { User } from "@shared/schema/users";

interface TherapistCardProps {
  profile: TherapistProfile;
  user: Pick<User, "firstName" | "lastName" | "profileImageUrl">;
}

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

function getPracticeModeIcon(mode: string | null) {
  switch (mode) {
    case "in_person":
      return Building2;
    case "virtual":
      return Monitor;
    case "both":
      return Monitor;
    default:
      return Monitor;
  }
}

export function TherapistCard({ profile, user }: TherapistCardProps) {
  const initials = `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Therapist";
  const specializations = profile.specializations || [];
  const displayedSpecs = specializations.slice(0, 3);
  const remainingCount = specializations.length - 3;

  const locationText = profile.city && profile.country
    ? `${profile.city}, ${profile.country}`
    : profile.country || null;

  const PracticeModeIcon = getPracticeModeIcon(profile.practiceMode);

  return (
    <Card
      data-testid={`card-therapist-${profile.id}`}
      className="flex flex-col h-full"
    >
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <Avatar className="h-12 w-12">
          {user.profileImageUrl && (
            <AvatarImage src={user.profileImageUrl} alt={fullName} />
          )}
          <AvatarFallback data-testid={`avatar-therapist-${profile.id}`}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1 min-w-0">
          <h3
            className="font-semibold text-base leading-tight truncate"
            data-testid={`text-name-${profile.id}`}
          >
            {fullName}
          </h3>
          {profile.title && (
            <p
              className="text-sm public-supporting-copy truncate"
              data-testid={`text-title-${profile.id}`}
            >
              {profile.title}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3">
        {displayedSpecs.length > 0 && (
          <div className="flex flex-wrap gap-1.5" data-testid={`specs-${profile.id}`}>
            {displayedSpecs.map((spec) => (
              <Badge key={spec} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
            {remainingCount > 0 && (
              <Badge variant="outline" className="text-xs">
                +{remainingCount}
              </Badge>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm public-meta-text">
          {locationText ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span data-testid={`text-location-${profile.id}`}>{locationText}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Monitor className="h-3.5 w-3.5 shrink-0" />
              <span data-testid={`text-location-${profile.id}`}>Virtual</span>
            </span>
          )}

          <Badge variant="outline" className="text-xs">
            <PracticeModeIcon className="h-3 w-3 mr-1" />
            {getSessionFormatLabel(profile.practiceMode)}
          </Badge>
        </div>
      </CardContent>

      <CardFooter>
        <Link href={`/directory/${profile.id}`} className="w-full">
          <Button
            variant="outline"
            className="w-full"
            data-testid={`link-view-profile-${profile.id}`}
          >
            View Profile
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
