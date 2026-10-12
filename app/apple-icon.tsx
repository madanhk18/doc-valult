import { ImageResponse } from "next/og";
import { LogoArt } from "@/components/brand/logo-art";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so the art fills the whole square.
export default function AppleIcon() {
  return new ImageResponse(<LogoArt size={180} rounded={false} />, size);
}
