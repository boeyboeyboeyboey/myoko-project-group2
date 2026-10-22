import { useEffect, useState } from "react";
import { bloomFromQuery, getBloom, setBloom } from "../lib/bloom";

/** Dev-only slider (also honours ?bloom=0.5) for previewing the winter → colour interpolation. */
export default function DevBloom() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const q = bloomFromQuery();
    if (q !== null) setBloom(q);
    setValue(getBloom());
  }, []);

  return (
    <label className="dev-bloom">
      BLOOM {value.toFixed(2)}
      <input
        type="range" min={0} max={1} step={0.01} value={value}
        onChange={(e) => { const v = Number(e.target.value); setValue(v); setBloom(v); }}
      />
    </label>
  );
}
