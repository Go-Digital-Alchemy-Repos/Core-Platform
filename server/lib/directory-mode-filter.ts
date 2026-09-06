import { inArray, sql, type SQL } from "drizzle-orm";
import { therapistProfiles } from "@shared/schema";
import {
  DIRECTORY_MODE_PROFILE_ALIASES,
  normalizeDirectoryMode,
  type DirectoryMode,
} from "@shared/types/directory-settings";

function directoryModeAliases(mode?: string): string[] {
  if (!mode) return [];
  const canonical = normalizeDirectoryMode(mode);
  return DIRECTORY_MODE_PROFILE_ALIASES[canonical as DirectoryMode] ?? [canonical];
}

export function directoryModeCondition(mode: string): SQL {
  const aliases = directoryModeAliases(mode);
  return inArray(therapistProfiles.directoryMode, aliases);
}

export function directoryModeSql(mode?: string): SQL {
  const aliases = directoryModeAliases(mode);
  return aliases.length ? sql`AND ${inArray(therapistProfiles.directoryMode, aliases)}` : sql``;
}
