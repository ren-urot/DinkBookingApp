import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { CalendarCheck, FlaskConical, Mail, MapPin, Menu, Phone, Search, Upload, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { facility } from "@/config/facility";
import { services } from "@/config/services";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/courts", label: "Courts" },
  { to: "/rates", label: "Rates" },
  { to: "/contact", label: "Contact" },
];

const secondaryItems = [
  { to: "/pay", label: "Send payment receipt", icon: Upload },
  { to: "/check-booking", label: "Check booking", icon: Search },
];

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${facility.name} home`}>
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  isActive && "bg-secondary text-secondary-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Button asChild className="ml-2">
            <Link to="/book">
              <CalendarCheck /> Book a Court
            </Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Button asChild size="sm">
            <Link to="/book">Book a Court</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="!size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription className="sr-only">Site navigation</SheetDescription>
              <nav aria-label="Mobile" className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "rounded-lg px-3 py-3 text-base font-semibold hover:bg-secondary",
                        isActive && "bg-secondary text-secondary-foreground",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
                <Button asChild size="lg" className="mt-2">
                  <Link to="/book">
                    <CalendarCheck /> Book a Court
                  </Link>
                </Button>
                <div className="mt-4 border-t pt-4">
                  {secondaryItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </NavLink>
                  ))}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">{facility.tagline}</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">Bookings</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" to="/book">Book a court</Link></li>
            <li><Link className="hover:text-foreground" to="/pay">Send payment receipt</Link></li>
            <li><Link className="hover:text-foreground" to="/check-booking">Check booking</Link></li>
            <li><Link className="hover:text-foreground" to="/rates">Rates & hours</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">Policies</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" to="/policies">Cancellation & refunds</Link></li>
            <li><Link className="hover:text-foreground" to="/privacy">Privacy notice</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">Contact</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" /><a className="hover:text-foreground" href={`tel:${facility.contact.phoneHref}`}>{facility.contact.phone}</a></li>
            <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><a className="break-all hover:text-foreground" href={`mailto:${facility.contact.email}`}>{facility.contact.email}</a></li>
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{facility.location.addressLines.join(", ")}</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <p className="container py-4 text-xs text-muted-foreground">
          © {year} {facility.name}. Bookings are requests until confirmed by our staff.
        </p>
      </div>
    </footer>
  );
}

export function Layout() {
  const online = useOnline();
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {services.isDemo && (
        <div className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
          <FlaskConical className="h-3.5 w-3.5 shrink-0" />
          Demo mode - submissions are NOT sent anywhere. Configure a booking service before going live.
        </div>
      )}
      {!online && (
        <div role="status" className="flex items-center justify-center gap-2 bg-foreground px-4 py-1.5 text-center text-xs font-semibold text-background">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          You're offline. You can browse, but booking and receipt submissions need a connection.
        </div>
      )}
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
