import PageHero from "../components/PageHero";

export default function About() {
  return (
    <div className="page">
      <PageHero label="About" jp="道" title={<>Sources &amp; <em>method</em>.</>}
        lede="Photo credits, sustainability footnotes, methodology and disclaimers. Placeholder." />
    </div>
  );
}
