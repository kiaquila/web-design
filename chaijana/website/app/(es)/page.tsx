import { buildMetadata, RestaurantPage } from "../restaurant-page";
import { redirect } from "next/navigation";

export const generateMetadata = () => buildMetadata("es");

export default async function SpanishPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const requestedLanguage = (await searchParams)?.lang;
  if (requestedLanguage === "en" || requestedLanguage === "ru") {
    // 307, not 308: a permanent redirect is cached by browsers indefinitely, so
    // returning visitors would keep being bounced even after a revert. Promote
    // this once the URL scheme is settled with the restaurant.
    redirect(`/${requestedLanguage}`);
  }

  return <RestaurantPage lang="es" />;
}
