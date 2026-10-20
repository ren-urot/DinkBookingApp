import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="container flex flex-col items-center py-20 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-extrabold">Out of bounds</h1>
      <p className="mt-2 text-muted-foreground">We couldn't find that page.</p>
      <div className="mt-6 flex gap-3">
        <Button asChild size="lg"><Link to="/">Go home</Link></Button>
        <Button asChild size="lg" variant="outline"><Link to="/book">Book a Court</Link></Button>
      </div>
    </div>
  );
}
