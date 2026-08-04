import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("x-forwarded-host") ?? incomingHeaders.get("host") ?? "localhost:3000";
  const protocol = incomingHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);

  return {
    metadataBase: base,
    title: "Chaijaná — Sabores de Oriente",
    description: "Carta de Chaijaná: cocina de Asia Central en Palermo Hollywood.",
    icons: {
      icon: "/images/chaijana-logo.png",
      shortcut: "/images/chaijana-logo.png",
    },
    openGraph: {
      title: "Chaijaná — Sabores de Oriente",
      description: "La carta de Chaijaná en Bonpland 1965, Palermo.",
      type: "website",
      images: [{ url: new URL("/og.png", base).toString(), width: 1760, height: 920, alt: "Chaijaná — Sabores de Oriente" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Chaijaná — Sabores de Oriente",
      description: "La carta de Chaijaná en Bonpland 1965, Palermo.",
      images: [new URL("/og.png", base).toString()],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
