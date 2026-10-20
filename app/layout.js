import "./globals.css";
export const metadata = {
  title: "Patchwork — See what changed",
  description:
    "Compare JSON by structure, review field-level changes, and export an RFC 6902 JSON Patch. Runs in your browser.",
};
export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
