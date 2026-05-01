import "./globals.css";

export const metadata = {
  title: "Cave a vin offline-first",
  description: "Gestion de cave a vin avec synchronisation Supabase",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
