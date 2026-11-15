import type { Recall, Vehicle } from "./scene-context";

/**
 * The demo car, decoded ahead of time. "Try the demo car" uses this instead of calling NHTSA,
 * so the demo opens instantly, works offline and never fails because a free government API is
 * slow. Captured from our own /api/vin and /api/recalls for DEMO_VIN (lib/car.ts) on 2026-11-14.
 * To refresh it, call those two routes and paste the results here.
 */
export const DEMO_VEHICLE: Vehicle = {
  vin: "SHHFK8G7*JU",
  year: "2018",
  make: "Honda",
  model: "Civic Type R",
  trim: "Touring",
  body: "Hatchback/Liftback/Notchback",
  engine: "2.0L 4-cylinder turbo K20C1",
  drive: "4x2",
  fuel: "Gasoline",
  plant: "United Kingdom (UK)",
};

export const DEMO_RECALLS: { recalls: Recall[]; filedUnder: string; exact: boolean } = {
  recalls: [
    {
      campaign: "23V858000",
      component: "FUEL SYSTEM, GASOLINE:DELIVERY:FUEL PUMP",
      summary:
        "Honda (American Honda Motor Co.) is recalling certain 2013-2023 Honda Accord, Civic Coupe, Civic Sedan, Civic Hatchback, Civic Type R, CR-V, HR-V, Ridgeline, Odyssey, Acura ILX, MDX, MDX Hybrid, RDX, RLX, TLX, 2019-2022 Honda Insight, Passport, 2020 Honda CR-V Hybrid, 2018-2019 Honda Clarity PHEV, Fit, and 2015-2020 Honda Accord Hybrid, Pilot, Acura NSX vehicles.  The fuel pump inside the fuel tank may fail.",
      remedy:
        "Dealers will replace the fuel pump module, free of charge.  Owner letters were mailed September 6, 2024.  Owners may contact Honda customer service at 1-888-234-2138.  Honda's numbers for this recall are KGC and KGD.  This recall is an expansion of NHTSA recall numbers 21V-215 and 20V-314.",
      date: "19/12/2023",
    },
    {
      campaign: "26V332000",
      component: "AIR BAGS:SENSOR:OCCUPANT CLASSIFICATION:FRONT PASSENGER",
      summary:
        "Honda (American Honda Motor Co.) is recalling certain 2018-2021, 2023 Acura TLX, 2019-2024 RDX, 2017-2020, 2022-2026 MDX, 2017-2021, 2023, 2025 Honda Ridgeline, 2017-2022 Pilot, 2019-2021 Passport, 2018-2026 Odyssey, 2019-2022 Insight, 2019-2021 HR-V, 2018-2020 Fit, 2020-2022 CR-V Hybrid, 2017-2022 CR-V, 2017-2018, 2021 Civic Type R, 2017-2021 Civic hatchback, 2016-2020 Civic coupe, 2016-2022 Civic, 2017-2022 Accord Hybrid, and 2016-2022 Accord vehicles. The front passenger seat weight sensor may crack and short circuit, which can cause the air bags to deploy unintentionally during a crash.",
      remedy:
        "Dealers will replace the seat weight sensors, free of charge. Owner notification letters were mailed July 7, 2026. Owners may contact Honda's customer service at 1-888-234-2138. Honda's numbers for this recall are BOL, WO9, OOA, WOM, XOH, NOC, POD, BOE, UOF, POB, EOG, AOI, QO8, TOJ, DO7, and SOK. This recall expands previous NHTSA recall number 24V064. Vehicle Identification Numbers (VINs) involved in this recall will be searchable on NHTSA.gov beginning May 29, 2026.",
      date: "22/05/2026",
    },
  ],
  filedUnder: "2018 Honda Civic Type R",
  exact: true,
};
