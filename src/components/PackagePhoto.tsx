import type { PackagePhotoInfo } from "../lib/content";
import { asset } from "../lib/asset";

export default function PackagePhoto({ photo, sizes, eager = false }: { photo: PackagePhotoInfo; sizes: string; eager?: boolean }) {
  const set = (ext: string) => [480, 800, 1200].map((x) => `${asset(`media/${photo.dir}/${photo.name}-${x}.${ext}`)} ${x}w`).join(", ");
  return (
    <picture>
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img src={asset(`media/${photo.dir}/${photo.name}-800.jpg`)} srcSet={set("jpg")} sizes={sizes}
        width={photo.w} height={photo.h} alt={photo.alt} loading={eager ? "eager" : "lazy"} decoding="async" />
    </picture>
  );
}
