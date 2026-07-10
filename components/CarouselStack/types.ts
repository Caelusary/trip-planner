import type { Activity } from "@/lib/attractions";

export interface CarouselItem {
  id: string;
  name: string;
  city: string;
  country: string;
  image: string;
  description: string;
  rating: number;
  budgetMin: number;
  budgetMax: number;
  bestTime: string;
  activities: Activity[];
  funFact: string;
  /** Where a tap on the primary card should navigate to. */
  href: string;
}

export interface CarouselStackProps {
  items: CarouselItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}
