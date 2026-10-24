import { useEffect, useState } from "react";
import { destinationsApi } from "../services/api";
import { destinationImage } from "../utils/formatters";
import { travelPhotos } from "./TravelHero";

const photos = new Map<number, Promise<string>>();

export function useDestinationPhoto(id?: number | null) {
  const [photo, setPhoto] = useState<{ id: number; url: string } | null>(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    if (!photos.has(id)) {
      photos.set(
        id,
        destinationsApi
          .get(id)
          .then(destinationImage)
          .catch(() => {
            photos.delete(id);
            return travelPhotos.hills;
          }),
      );
    }
    void photos.get(id)?.then((url) => {
      if (!cancelled) setPhoto({ id, url });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return photo && photo.id === id ? photo.url : travelPhotos.hills;
}
