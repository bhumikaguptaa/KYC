import type { Vehicle } from "@/lib/scene-context";

// Decodes a VIN with NHTSA vPIC (free, no key). Wildcards (*) are allowed, which is how the
// demo button decodes a Civic Type R pattern without using anyone's real VIN.
const VIN_RE = /^[A-HJ-NPR-Z0-9*]{11,17}$/;

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\bBmw\b/, "BMW");

export async function GET(request: Request) {
  const url = new URL(request.url);
  const vin = (url.searchParams.get("vin") ?? "").trim().toUpperCase();
  const year = (url.searchParams.get("year") ?? "").trim();

  if (!VIN_RE.test(vin)) {
    return Response.json({ error: "A VIN is 17 letters and numbers (no I, O or Q)." }, { status: 400 });
  }

  const api = new URL(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}`);
  api.searchParams.set("format", "json");
  if (/^\d{4}$/.test(year)) api.searchParams.set("modelyear", year);

  let row: Record<string, string>;
  try {
    const res = await fetch(api, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`vPIC ${res.status}`);
    const data = (await res.json()) as { Results?: Record<string, string>[] };
    row = data.Results?.[0] ?? {};
  } catch {
    return Response.json({ error: "Couldn't reach the NHTSA VIN service. Try again." }, { status: 502 });
  }

  if (!row.Make) {
    return Response.json({ error: "NHTSA couldn't decode that VIN. Check it and try again." }, { status: 404 });
  }

  const engine = [
    row.DisplacementL && `${Number(row.DisplacementL).toFixed(1)}L`,
    row.EngineCylinders && `${row.EngineCylinders}-cylinder`,
    row.Turbo === "Yes" && "turbo",
    row.EngineModel,
  ]
    .filter(Boolean)
    .join(" ");

  const vehicle: Vehicle = {
    vin,
    year: row.ModelYear ?? "",
    make: titleCase(row.Make),
    model: row.Model ?? "",
    trim: row.Trim ? titleCase(row.Trim) : "",
    body: row.BodyClass ?? "",
    engine,
    drive: row.DriveType ?? "",
    fuel: row.FuelTypePrimary ?? "",
    plant: row.PlantCountry ? titleCase(row.PlantCountry) : "",
  };

  return Response.json({ vehicle });
}
