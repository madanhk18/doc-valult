import {
  Award,
  Car,
  CarFront,
  CreditCard,
  Fingerprint,
  FileText,
  GraduationCap,
  HeartPulse,
  House,
  IdCard,
  Landmark,
  Leaf,
  Package,
  Plane,
  ShieldCheck,
  Stethoscope,
  Umbrella,
  Vote,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { DOCUMENT_TYPES } from "@/lib/constants";

export type DocStyle = { icon: LucideIcon; color: string };

const STYLES: Record<(typeof DOCUMENT_TYPES)[number], DocStyle> = {
  "Driving Licence": { icon: Car, color: "#3b82f6" },
  "Registration Certificate": { icon: CarFront, color: "#0ea5e9" },
  Passport: { icon: Plane, color: "#1e40af" },
  "Vehicle Insurance": { icon: ShieldCheck, color: "#14b8a6" },
  "Vehicle Pollution Certificate (PUC)": { icon: Leaf, color: "#65a30d" },
  "Vehicle Fitness Certificate": { icon: Wrench, color: "#f97316" },
  "Aadhaar Card": { icon: Fingerprint, color: "#f59e0b" },
  "PAN Card": { icon: CreditCard, color: "#6366f1" },
  "Voter ID": { icon: Vote, color: "#06b6d4" },
  "Health Insurance": { icon: HeartPulse, color: "#b91c1c" },
  "Life Insurance": { icon: Umbrella, color: "#10b981" },
  "Medical Documents": { icon: Stethoscope, color: "#dc2626" },
  "Education Certificates": { icon: GraduationCap, color: "#0369a1" },
  "Professional Certificates": { icon: Award, color: "#eab308" },
  "Membership Cards": { icon: IdCard, color: "#0f766e" },
  "Government Documents": { icon: Landmark, color: "#64748b" },
  "Rental/Lease Documents": { icon: House, color: "#ea580c" },
  "Warranty Documents": { icon: Package, color: "#a16207" },
  "Other / Custom Document": { icon: FileText, color: "#6b7280" },
};

/** Icon + colour for a document type; custom types share the "Other" look. */
export function docStyle(type: string): DocStyle {
  return STYLES[type as keyof typeof STYLES] ?? STYLES["Other / Custom Document"];
}
