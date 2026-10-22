import { Link } from "react-router";
import { DISCLAIMER } from "../lib/content";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="grid footer__top">
          <div className="col-1-7 footer__mark">Myoko in <i>Colour</i></div>
          <div className="col-8-12">
            <p className="footer__note">{DISCLAIMER}</p>
            <p className="footer__note" style={{ marginTop: "0.75rem" }}>
              <Link to="/about">Sources &amp; credits</Link>
            </p>
          </div>
        </div>
        <div className="footer__bottom">
          <span>妙高 — Myoko, Niigata</span>
          <span>Prototype · 2026</span>
        </div>
      </div>
    </footer>
  );
}
