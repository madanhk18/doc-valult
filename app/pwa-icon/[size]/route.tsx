import { ImageResponse } from "next/og";
import { LogoArt } from "@/components/brand/logo-art";

const SIZES: Record<string, { px: number; rounded: boolean }> = {
  "192": { px: 192, rounded: true },
  "512": { px: 512, rounded: true },
  // Maskable icons get cropped to a circle/squircle by Android, so no corners.
  maskable: { px: 512, rounded: false },
};

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const spec = SIZES[(await params).size];
  if (!spec) return new Response("Not found", { status: 404 });

  return new ImageResponse(<LogoArt size={spec.px} rounded={spec.rounded} />, {
    width: spec.px,
    height: spec.px,
    headers: { "Cache-Control": "public, max-age=604800, immutable" },
  });
}
