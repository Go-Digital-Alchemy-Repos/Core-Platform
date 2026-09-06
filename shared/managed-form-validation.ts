import type { CmsForm, CmsFormField } from "./schema/forms";
export class ManagedFormValidationError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
  }
}
export function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === "on" || value === 1;
}

function stringArrayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => stringValue(item)).filter(Boolean);
  }

  const single = stringValue(value);
  return single ? [single] : [];
}

export function objectValue(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeUrl(value: string) {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function validateField(field: CmsFormField, raw: unknown) {
  const config = (typeof field.config === "object" && field.config ? field.config : {}) as Record<
    string,
    unknown
  >;
  const selectionMode = config.selectionMode === "multiple" ? "multiple" : "single";

  if (field.type === "html" || field.type === "section" || field.type === "page") {
    return { value: null };
  }

  if (field.type === "hidden") {
    const value =
      stringValue(raw) || (typeof config.defaultValue === "string" ? config.defaultValue : "");
    if (field.required && !value) {
      return { error: `${field.label} is required` };
    }
    return { value };
  }

  if (field.type === "consent") {
    const checked = booleanValue(raw);
    if (field.required && !checked) {
      return { error: `${field.label} is required` };
    }
    return { value: checked };
  }

  if (
    field.type === "checkbox" ||
    field.type === "multiselect" ||
    (field.type === "image-choice" && selectionMode === "multiple")
  ) {
    const values = stringArrayValue(raw);
    if (field.required && values.length === 0) {
      return { error: `${field.label} is required` };
    }
    if (Array.isArray(field.options) && field.options.length > 0) {
      const validValues = new Set(field.options.map((option) => option.value));
      const hasInvalid = values.some((value) => !validValues.has(value));
      if (hasInvalid) {
        return { error: `${field.label} has an invalid value` };
      }
    }
    return { value: values };
  }

  if (field.type === "select" || field.type === "radio" || field.type === "image-choice") {
    const value = stringValue(raw);
    if (field.required && !value) {
      return { error: `${field.label} is required` };
    }
    if (!value) return { value: "" };
    if (Array.isArray(field.options) && field.options.length > 0) {
      const validValues = new Set(field.options.map((option) => option.value));
      if (!validValues.has(value)) {
        return { error: `${field.label} has an invalid value` };
      }
    }
    return { value };
  }

  if (field.type === "name") {
    if (config.nameFormat === "split") {
      const value = objectValue(raw);
      const firstName = stringValue(value.firstName);
      const lastName = stringValue(value.lastName);
      if (field.required && !firstName && !lastName) {
        return { error: `${field.label} is required` };
      }
      return { value: { firstName, lastName } };
    }

    const fullName = stringValue(
      typeof raw === "object" && raw !== null ? objectValue(raw).fullName : raw,
    );
    if (field.required && !fullName) {
      return { error: `${field.label} is required` };
    }
    return { value: { fullName } };
  }

  if (field.type === "address") {
    const value = objectValue(raw);
    const normalized = {
      street: stringValue(value.street),
      street2: stringValue(value.street2),
      city: stringValue(value.city),
      state: stringValue(value.state),
      postalCode: stringValue(value.postalCode),
      country: stringValue(value.country),
    };

    if (
      field.required &&
      !normalized.street &&
      !normalized.city &&
      !normalized.state &&
      !normalized.postalCode &&
      !normalized.country
    ) {
      return { error: `${field.label} is required` };
    }

    return { value: normalized };
  }

  if (field.type === "list") {
    const rows = Array.isArray(raw)
      ? raw
          .map((row) => {
            const record = objectValue(row);
            return Object.fromEntries(
              Object.entries(record).map(([key, value]) => [key, stringValue(value)]),
            );
          })
          .filter((row) => Object.values(row).some(Boolean))
      : [];

    if (field.required && rows.length === 0) {
      return { error: `${field.label} is required` };
    }

    return { value: rows };
  }

  if (field.type === "number") {
    const value = stringValue(raw);
    if (field.required && !value) {
      return { error: `${field.label} is required` };
    }
    if (!value) return { value: "" };
    if (Number.isNaN(Number(value))) {
      return { error: `${field.label} must be a valid number` };
    }
    return { value: Number(value) };
  }

  let value = stringValue(raw);

  if (field.required && !value) {
    return { error: `${field.label} is required` };
  }

  if (!value) {
    return { value: "" };
  }

  if (field.type === "email") {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!isValid) {
      return { error: `${field.label} must be a valid email address` };
    }
  }

  if (field.type === "website") {
    try {
      value = normalizeUrl(value);
      new URL(value);
    } catch {
      return { error: `${field.label} must be a valid URL` };
    }
  }

  return { value };
}

export function validateSubmissionData(form: Pick<CmsForm, "fields">, data: unknown) {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new ManagedFormValidationError("Form submission must be an object", 400);
  }

  const input = data as Record<string, unknown>;
  const validated: Record<string, unknown> = {};

  for (const field of Array.isArray(form.fields) ? form.fields : []) {
    const result = validateField(field, input[field.key]);
    if (result.error) {
      throw new ManagedFormValidationError(result.error, 400);
    }
    validated[field.key] = result.value ?? "";
  }

  return validated;
}
