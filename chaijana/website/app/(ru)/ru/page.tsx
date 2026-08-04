import { buildMetadata, RestaurantPage } from "../../restaurant-page";

export const generateMetadata = () => buildMetadata("ru");

export default function RussianPage() {
  return <RestaurantPage lang="ru" />;
}
