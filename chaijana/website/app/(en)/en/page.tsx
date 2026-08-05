import { buildMetadata, RestaurantPage } from "../../restaurant-page";

export const generateMetadata = () => buildMetadata("en");

export default function EnglishPage() {
  return <RestaurantPage lang="en" />;
}
