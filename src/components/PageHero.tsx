import type { ReactNode } from "react";

interface Props {
  num: string;
  label: string;
  title: ReactNode;
  lede?: string;
  jp: string;
}

/** Shared page opener: numbered label, big serif title, vertical Japanese margin label. */
export default function PageHero({ num, label, title, lede, jp }: Props) {
  return (
    <section className="page-hero container">
      <div className="page-hero__label">
        <span className="numeral" style={{ fontSize: "var(--step-2)" }}>{num}</span>
        <span className="eyebrow">— {label}</span>
      </div>
      <h1>{title}</h1>
      {lede && <p className="page-hero__lede">{lede}</p>}
      <span className="jp-vertical margin-jp" aria-hidden="true">{jp}</span>
    </section>
  );
}
