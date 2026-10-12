/**
 * The app mark as plain JSX + inline SVG, so it renders both in the UI and in
 * `ImageResponse` (home-screen icons), which only understands inline styles.
 */
export function LogoArt({ size, rounded = true }: { size: number; rounded?: boolean }) {
  const glyph = Math.round(size * 0.56);
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #c026d3 100%)",
        borderRadius: rounded ? size * 0.22 : 0,
      }}
    >
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2.5 4.5 5.4v5.9c0 4.6 3.1 8.6 7.5 10.2 4.4-1.6 7.5-5.6 7.5-10.2V5.4L12 2.5Z"
          fill="#ffffff"
          fillOpacity="0.95"
        />
        <path d="m8.6 12.2 2.3 2.3 4.6-4.8" stroke="#6d28d9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
