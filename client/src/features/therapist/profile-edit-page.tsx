import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TherapistProfile } from "@shared/schema";
import { TherapistLayout } from "./therapist-layout";
import { LANGUAGES, PracticeMode } from "@shared/types";
import { useSpecializations } from "@/hooks/use-specializations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SiInstagram, SiFacebook, SiX, SiLinkedin, SiYoutube, SiTiktok } from "react-icons/si";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import { PhoneInput } from "@/components/shared/phone-input";
import { phoneSchema } from "@/lib/phone-utils";
import { useAuth } from "@/hooks/use-auth";
import { CmsRichTextEditor } from "@/features/admin/cms/builder/cms-rich-text-editor";

const profileFormSchema = z.object({
  title: z.string().optional(),
  bio: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  credentials: z.string().optional(),
  licenseNumber: z.string().optional(),
  practiceMode: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  phone: phoneSchema,
  website: z.string().optional(),
  instagramHandle: z.string().optional(),
  facebookHandle: z.string().optional(),
  twitterHandle: z.string().optional(),
  linkedinHandle: z.string().optional(),
  youtubeHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
  acceptingClients: z.boolean().optional(),
  willingToTravel: z.boolean().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileEditPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { specializations: specList } = useSpecializations();
  const [otherLangOpen, setOtherLangOpen] = useState(false);
  const customLangInputRef = useRef<HTMLInputElement>(null);

  const predefinedNames = useMemo(
    () => new Set(specList.map((s) => s.name)),
    [specList]
  );

  const [otherChecked, setOtherChecked] = useState(false);
  const [otherValue, setOtherValue] = useState("");

  const { data: profile, isLoading } = useQuery<TherapistProfile | null>({
    queryKey: ["/api/therapist/profile"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: profile ? {
      title: profile.title ?? "",
      bio: profile.bio ?? "",
      specializations: profile.specializations ?? [],
      languages: profile.languages ?? [],
      credentials: profile.credentials ?? "",
      licenseNumber: profile.licenseNumber ?? "",
      practiceMode: profile.practiceMode ?? "both",
      addressLine1: profile.addressLine1 ?? "",
      addressLine2: profile.addressLine2 ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      country: profile.country ?? "",
      zipCode: profile.zipCode ?? "",
      phone: profile.phone ?? "",
      website: profile.website ?? "",
      instagramHandle: profile.instagramHandle ?? "",
      facebookHandle: profile.facebookHandle ?? "",
      twitterHandle: profile.twitterHandle ?? "",
      linkedinHandle: profile.linkedinHandle ?? "",
      youtubeHandle: profile.youtubeHandle ?? "",
      tiktokHandle: profile.tiktokHandle ?? "",
      acceptingClients: profile.acceptingClients ?? true,
      willingToTravel: profile.willingToTravel ?? false,
    } : {
      title: "",
      bio: "",
      specializations: [],
      languages: [],
      credentials: "",
      licenseNumber: "",
      practiceMode: "both",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "",
      zipCode: "",
      phone: "",
      website: "",
      instagramHandle: "",
      facebookHandle: "",
      twitterHandle: "",
      linkedinHandle: "",
      youtubeHandle: "",
      tiktokHandle: "",
      acceptingClients: true,
      willingToTravel: false,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PUT", "/api/therapist/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/profile"] });
      toast({ title: "Profile updated", description: "Your profile has been saved successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (profile?.specializations && predefinedNames.size > 0) {
      const customSpecs = profile.specializations.filter((s) => !predefinedNames.has(s));
      if (customSpecs.length > 0) {
        setOtherChecked(true);
        setOtherValue(customSpecs.join(", "));
      } else {
        setOtherChecked(false);
        setOtherValue("");
      }
    }
  }, [profile, predefinedNames]);

  function onSubmit(data: ProfileFormValues) {
    const predefined = (data.specializations ?? []).filter((s) => predefinedNames.has(s));
    if (otherChecked && otherValue.trim()) {
      const customEntries = otherValue
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      predefined.push(...customEntries);
    }
    const unique = Array.from(new Set(predefined));
    updateMutation.mutate({ ...data, specializations: unique });
  }

  if (isLoading) {
    return (
      <TherapistLayout>
        <div className="p-6 space-y-6 max-w-3xl mx-auto" data-testid="profile-edit-loading">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[600px]" />
        </div>
      </TherapistLayout>
    );
  }

  return (
    <TherapistLayout>
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-heading font-semibold mb-6" data-testid="text-profile-edit-title">
        Edit Profile
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <AvatarUpload
                currentImageUrl={user?.profileImageUrl}
                fallbackInitials={`${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`}
                size="lg"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Licensed Clinical Psychologist" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <CmsRichTextEditor
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Tell clients about your practice and approach..."
                        data-testid="input-bio"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="credentials"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credentials</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. PhD, LMFT" {...field} data-testid="input-credentials" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. PSY12345" {...field} data-testid="input-license" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Specializations</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="specializations"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {specList.map(({ name: spec }) => (
                        <div key={spec} className="flex items-center space-x-2">
                          <Checkbox
                            id={`spec-${spec}`}
                            checked={field.value?.includes(spec)}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              field.onChange(
                                checked
                                  ? [...current, spec]
                                  : current.filter((s) => s !== spec)
                              );
                            }}
                            data-testid={`checkbox-spec-${spec}`}
                          />
                          <Label htmlFor={`spec-${spec}`} className="text-sm cursor-pointer">
                            {spec}
                          </Label>
                        </div>
                      ))}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="spec-other"
                          checked={otherChecked}
                          onCheckedChange={(checked) => {
                            const isChecked = !!checked;
                            setOtherChecked(isChecked);
                            if (!isChecked) {
                              setOtherValue("");
                            }
                          }}
                          data-testid="checkbox-spec-other"
                        />
                        <Label htmlFor="spec-other" className="text-sm cursor-pointer">
                          Other
                        </Label>
                      </div>
                    </div>
                    {otherChecked && (
                      <div className="mt-3">
                        <Input
                          placeholder="Enter custom specialty (comma-separated for multiple)"
                          value={otherValue}
                          onChange={(e) => setOtherValue(e.target.value)}
                          data-testid="input-spec-other"
                        />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Languages</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="languages"
                render={({ field }) => {
                  const presetSet = new Set<string>(LANGUAGES);
                  const customLangs = (field.value ?? []).filter((l) => !presetSet.has(l));
                  const showOther = otherLangOpen || customLangs.length > 0;
                  const isDuplicate = (val: string) => {
                    const lower = val.toLowerCase();
                    return (field.value ?? []).some((l) => l.toLowerCase() === lower)
                      || LANGUAGES.some((l) => l.toLowerCase() === lower);
                  };
                  return (
                    <FormItem>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {LANGUAGES.map((lang) => (
                          <div key={lang} className="flex items-center space-x-2">
                            <Checkbox
                              id={`lang-${lang}`}
                              checked={field.value?.includes(lang)}
                              onCheckedChange={(checked) => {
                                const current = field.value ?? [];
                                field.onChange(
                                  checked
                                    ? [...current, lang]
                                    : current.filter((l) => l !== lang)
                                );
                              }}
                              data-testid={`checkbox-lang-${lang}`}
                            />
                            <Label htmlFor={`lang-${lang}`} className="text-sm cursor-pointer">
                              {lang}
                            </Label>
                          </div>
                        ))}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="lang-other"
                            checked={showOther}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setOtherLangOpen(true);
                              } else {
                                setOtherLangOpen(false);
                                field.onChange((field.value ?? []).filter((l) => presetSet.has(l)));
                              }
                            }}
                            data-testid="checkbox-lang-other"
                          />
                          <Label htmlFor="lang-other" className="text-sm cursor-pointer">
                            Other
                          </Label>
                        </div>
                      </div>
                      {showOther && (
                        <div className="mt-3 space-y-2">
                          {customLangs.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {customLangs.map((lang) => (
                                <Badge key={lang} variant="secondary" className="gap-1" data-testid={`badge-custom-lang-${lang}`}>
                                  {lang}
                                  <button
                                    type="button"
                                    onClick={() => field.onChange((field.value ?? []).filter((l) => l !== lang))}
                                    className="ml-0.5 hover:text-destructive"
                                    data-testid={`remove-custom-lang-${lang}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Input
                              ref={customLangInputRef}
                              placeholder="Enter language..."
                              maxLength={50}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val && !isDuplicate(val)) {
                                    field.onChange([...(field.value ?? []), val]);
                                    (e.target as HTMLInputElement).value = "";
                                  }
                                }
                              }}
                              className="max-w-[200px]"
                              data-testid="input-custom-language"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const val = customLangInputRef.current?.value.trim();
                                if (val && !isDuplicate(val)) {
                                  field.onChange([...(field.value ?? []), val]);
                                  if (customLangInputRef.current) customLangInputRef.current.value = "";
                                }
                              }}
                              data-testid="button-add-custom-language"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Practice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="practiceMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Format</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-practice-mode">
                          <SelectValue placeholder="Select session format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={PracticeMode.IN_PERSON}>In-Person</SelectItem>
                        <SelectItem value={PracticeMode.VIRTUAL}>Virtual</SelectItem>
                        <SelectItem value={PracticeMode.BOTH}>Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="acceptingClients"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-2 rounded-md border p-3">
                    <div>
                      <FormLabel>Accepting New Clients</FormLabel>
                      <p className="text-sm text-muted-foreground">Toggle whether you are currently accepting new clients</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-accepting-clients"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="willingToTravel"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-2 rounded-md border p-3">
                    <div>
                      <FormLabel>Willing to Travel</FormLabel>
                      <p className="text-sm text-muted-foreground">Toggle whether you are willing to travel for sessions</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-willing-to-travel"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} data-testid="input-address1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input placeholder="Suite, unit, etc." {...field} data-testid="input-address2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-zip" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <PhoneInput {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} data-testid="input-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter your username or handle only — no need to include the full URL.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="instagramHandle" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><SiInstagram className="h-4 w-4 text-pink-500" />Instagram</FormLabel>
                    <FormControl><Input placeholder="yourhandle" {...field} data-testid="input-instagram" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="facebookHandle" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><SiFacebook className="h-4 w-4 text-blue-600" />Facebook</FormLabel>
                    <FormControl><Input placeholder="yourpage" {...field} data-testid="input-facebook" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="twitterHandle" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><SiX className="h-4 w-4" />X / Twitter</FormLabel>
                    <FormControl><Input placeholder="yourhandle" {...field} data-testid="input-twitter" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="linkedinHandle" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><SiLinkedin className="h-4 w-4 text-blue-700" />LinkedIn</FormLabel>
                    <FormControl><Input placeholder="your-name" {...field} data-testid="input-linkedin" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="youtubeHandle" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><SiYoutube className="h-4 w-4 text-red-600" />YouTube</FormLabel>
                    <FormControl><Input placeholder="yourchannel" {...field} data-testid="input-youtube" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tiktokHandle" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><SiTiktok className="h-4 w-4" />TikTok</FormLabel>
                    <FormControl><Input placeholder="yourhandle" {...field} data-testid="input-tiktok" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={updateMutation.isPending} className="w-full" data-testid="button-save-profile">
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Profile
          </Button>
        </form>
      </Form>
    </div>
    </TherapistLayout>
  );
}
