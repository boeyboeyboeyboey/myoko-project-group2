import type { ReactNode } from "react";

interface Props {
  label: string;
  title: ReactNode;
  lede?: string;
  jp: string;
}

/** Shared page opener: label, big serif title, vertical Japanese margin label. */
export default function PageHero({ label, title, lede, jp }: Props) {
  return (
    <section className="page-hero container">
      <div className="page-hero__label">
        <span className="eyebrow">{label}</span>
      </div>
      <h1>{title}</h1>
      {lede && <p className="page-hero__lede">{lede}</p>}
      <span className="jp-vertical margin-jp" aria-hidden="true">{jp}</span>
    </section>
  );
}
