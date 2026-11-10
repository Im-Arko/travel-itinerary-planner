import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { fallbackTravelImage } from '../utils/formatters';

export const travelPhotos = {
  lake: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=2000&q=85",
  road: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2000&q=85",
  hills:
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2000&q=85",
  coast:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=85",
  rail: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=2000&q=85",
};

interface TravelHeroProps {
  image: string;
  eyebrow: string;
  title: string;
  script?: string;
  description?: string;
  caption?: string;
  back?: { to: string; label: string };
  children?: ReactNode;
}

export function TravelHero({
  image,
  eyebrow,
  title,
  script,
  description,
  caption,
  back,
  children,
}: TravelHeroProps) {
  return (
    <section className={`travel-hero${back ? " travel-hero-detail" : ""}`}>
      <img
        src={image}
        onError={fallbackTravelImage}
        alt=""
        className="travel-hero-image"
      />
      <div className="travel-hero-shade" />
      <div className="travel-container travel-hero-content">
        {back && (
          <Link to={back.to} className="hero-back">
            <ArrowLeft size={16} />
            {back.label}
          </Link>
        )}
        <p className="travel-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {script && <p className="travel-hero-script">{script}</p>}
        {description && (
          <p className="travel-hero-description">{description}</p>
        )}
        {children && <div className="travel-hero-extra">{children}</div>}
      </div>
      {caption && (
        <span className="travel-photo-caption">
          <ArrowUpRight size={14} />
          {caption}
        </span>
      )}
    </section>
  );
}

export function PageMessage({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="travel-container page-message">
      <p className="travel-eyebrow">A small detour</p>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
