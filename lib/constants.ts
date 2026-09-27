export const DOCUMENT_TYPES = [
  "Driving Licence",
  "Registration Certificate",
  "Passport",
  "Vehicle Insurance",
  "Vehicle Pollution Certificate (PUC)",
  "Vehicle Fitness Certificate",
  "Aadhaar Card",
  "PAN Card",
  "Voter ID",
  "Health Insurance",
  "Life Insurance",
  "Medical Documents",
  "Education Certificates",
  "Professional Certificates",
  "Membership Cards",
  "Government Documents",
  "Rental/Lease Documents",
  "Warranty Documents",
  "Other / Custom Document",
] as const;

export const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
