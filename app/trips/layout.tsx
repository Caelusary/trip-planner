import { Header } from "@/components/Header";

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <div className="flex-1 px-6 pb-10">{children}</div>
    </div>
  );
}
