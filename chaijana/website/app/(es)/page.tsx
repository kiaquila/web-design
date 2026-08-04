import { buildMetadata, RestaurantPage } from "../restaurant-page";
import { permanentRedirect } from "next/navigation";

export const generateMetadata = () => buildMetadata("es");

export default async function SpanishPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const requestedLanguage = (await searchParams)?.lang;
  if (requestedLanguage === "en" || requestedLanguage === "ru") {
    permanentRedirect(`/${requestedLanguage}`);
  }

  return <RestaurantPage lang="es" />;
}
