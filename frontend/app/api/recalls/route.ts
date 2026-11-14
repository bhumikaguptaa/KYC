import type { Recall } from "@/lib/scene-context";

// Open recall campaigns from NHTSA by make / model / year (free, no key).
type NhtsaRecall = {
  NHTSACampaignNumber?: string;
  Component?: string;
  Summary?: string;
  Remedy?: string;
  ReportReceivedDate?: string;
};

async function lookup(make: string, model: string, year: string) {
  const api = new URL("https://api.nhtsa.gov/recalls/recallsByVehicle");
  api.searchParams.set("make", make);
  api.searchParams.set("model", model);
  api.searchParams.set("modelYear", year);
  const res = await fetch(api, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`recalls ${res.status}`);
  const data = (await res.json()) as { results?: NhtsaRecall[] };
  return data.results ?? [];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const make = (url.searchParams.get("make") ?? "").trim();
  const model = (url.searchParams.get("model") ?? "").trim();
  const year = (url.searchParams.get("year") ?? "").trim();

  if (!make || !model || !/^\d{4}$/.test(year)) {
    return Response.json({ error: "make, model and a 4-digit year are required" }, { status: 400 });
  }

  try {
    // NHTSA sometimes files a trim (e.g. "Civic Type R") under the base model ("Civic").
    // When that happens we say so, so the UI never claims a family-wide recall is specific to this car.
    let results = await lookup(make, model, year);
    let filedUnder = model;
    const base = model.split(" ")[0];
    if (!results.length && base !== model) {
      results = await lookup(make, base, year);
      filedUnder = base;
    }

    const recalls: Recall[] = results.map((r) => ({
      campaign: r.NHTSACampaignNumber ?? "",
      component: r.Component ?? "",
      summary: r.Summary ?? "",
      remedy: r.Remedy ?? "",
      date: r.ReportReceivedDate ?? "",
    }));
    return Response.json({ recalls, filedUnder: `${year} ${make} ${filedUnder}`, exact: filedUnder === model });
  } catch {
    return Response.json({ error: "Couldn't reach the NHTSA recalls service." }, { status: 502 });
  }
}
