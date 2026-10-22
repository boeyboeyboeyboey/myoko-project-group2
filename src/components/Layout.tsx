import { Outlet } from "react-router";
import Nav from "./Nav";
import Footer from "./Footer";
import ScrollManager from "./ScrollManager";
import DevBloom from "./DevBloom";

export default function Layout() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <ScrollManager />
      <Nav />
      <main id="main"><Outlet /></main>
      <Footer />
      {import.meta.env.DEV && <DevBloom />}
    </>
  );
}
