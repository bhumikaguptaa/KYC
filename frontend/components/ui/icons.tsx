import type { SVGProps } from "react";

/**
 * Line icons drawn for KYC on a 24px grid, 1.6px stroke. The car is always seen side-on with
 * its nose to the left, so hood, doors and hatch read as parts of the same car.
 */
type P = SVGProps<SVGSVGElement>;

function Svg({ children, ...p }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      {children}
    </svg>
  );
}

/** Side-on hatchback, nose left. Gaps in the sill line make room for the wheels. */
const CAR =
  "M2.8 16H4M8 16h7.5M19.5 16H21v-2.7c0-.5-.3-.9-.8-1l-2.3-.6-2.6-3.2a2 2 0 0 0-1.5-.7H9.6a2 2 0 0 0-1.5.7l-2.3 2.8-2.3.5c-.4.1-.7.5-.7 1V16";
const Wheels = () => (
  <>
    <circle cx="6" cy="16" r="2" />
    <circle cx="17.5" cy="16" r="2" />
  </>
);

export const IconCar = (p: P) => (
  <Svg {...p}>
    <path d={CAR} />
    <Wheels />
  </Svg>
);

export const IconHood = (p: P) => (
  <Svg {...p}>
    <path d="M2.8 16H4M8 16h7.5M19.5 16H21v-2.7c0-.5-.3-.9-.8-1l-2.3-.6-2.6-3.2a2 2 0 0 0-1.5-.7H9.6a2 2 0 0 0-1.5.7L6.4 11.2M3 16v-2.7" />
    <path d="M6.6 11.2 2.6 7.6" strokeWidth={1.9} />
    <Wheels />
  </Svg>
);

export const IconDoor = (p: P) => (
  <Svg {...p}>
    <path d={CAR} />
    <path d="M11.6 8.2V16M13.3 12.3h1.4" />
    <Wheels />
  </Svg>
);

export const IconHatch = (p: P) => (
  <Svg {...p}>
    <path d="M2.8 16H4M8 16h7.5M19.5 16H21v-3.4M15.3 8.5a2 2 0 0 0-1.5-.7H9.6a2 2 0 0 0-1.5.7l-2.3 2.8-2.3.5c-.4.1-.7.5-.7 1V16" />
    <path d="M15.3 8.5 21.6 6.3" strokeWidth={1.9} />
    <Wheels />
  </Svg>
);

/** The headlight tell-tale: a lamp with its beams. */
export const IconLights = (p: P) => (
  <Svg {...p}>
    <path d="M12 6.5c-3.6 0-5.5 2.5-5.5 5.5s1.9 5.5 5.5 5.5z" />
    <path d="M15 8.5h5M15 12h5M15 15.5h5" />
  </Svg>
);

export const IconWipers = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 17.5a11 11 0 0 1 17 0" />
    <path d="m12 18-4.6-9" strokeWidth={1.9} />
    <circle cx="12" cy="18" r="1" fill="currentColor" />
  </Svg>
);

/** A scan frame with a line through it: look through the body. */
export const IconXray = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 8V6a2.5 2.5 0 0 1 2.5-2.5h2M16 3.5h2A2.5 2.5 0 0 1 20.5 6v2M20.5 16v2a2.5 2.5 0 0 1-2.5 2.5h-2M8 20.5H6A2.5 2.5 0 0 1 3.5 18v-2" />
    <path d="M3.5 12h17" />
  </Svg>
);

export const IconWrench = (p: P) => (
  <Svg {...p}>
    <path d="M14.8 5.2a4.2 4.2 0 0 0-5.6 5.6l-5.4 5.4a1.6 1.6 0 0 0 2.3 2.3l5.4-5.4a4.2 4.2 0 0 0 5.6-5.6l-2.6 2.6-2.2-.5-.5-2.2z" />
  </Svg>
);

export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="m14.5 18-6-6 6-6" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Svg>
);

export const IconArrow = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </Svg>
);

/** Reset the view: crosshair. */
export const IconRecenter = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5" />
  </Svg>
);

/** Take a part out: arrow lifting out of a tray. */
export const IconLift = (p: P) => (
  <Svg {...p}>
    <path d="M12 14V3.5M8 7.5l4-4 4 4M4.5 13.5V18a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-4.5" />
  </Svg>
);

export const IconDrop = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5V14M8 10l4 4 4-4M4.5 13.5V18a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-4.5" />
  </Svg>
);

/** The amber master-warning tell-tale. */
export const IconWarning = (p: P) => (
  <Svg {...p}>
    <path d="M10.3 4.6a2 2 0 0 1 3.4 0l7.4 12.6a2 2 0 0 1-1.7 3H4.6a2 2 0 0 1-1.7-3z" />
    <path d="M12 9.5v4M12 16.7v.1" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

/** The red battery tell-tale. */
export const IconBattery = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 8.5h17v10h-17zM6.5 8.5v-2h3v2M14.5 8.5v-2h3v2M6.5 13.5h3M14.5 13.5h3M16 12v3" />
  </Svg>
);

/** The green turn-signal tell-tale. */
export const IconSignal = (p: P) => (
  <Svg {...p}>
    <path d="M13 5.5 19.5 12 13 18.5v-4H4.5v-5H13z" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconQuestion = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2.9-1.2 1.7v.3M12 16.6v.1" />
  </Svg>
);

export const IconDownload = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
  </Svg>
);

/** A shop's repair order: a slip with a torn bottom edge and printed lines. */
export const IconReceipt = (p: P) => (
  <Svg {...p}>
    <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4zM9 8h6M9 11.5h6M9 15h3.5" />
  </Svg>
);

export const IconUpload = (p: P) => (
  <Svg {...p}>
    <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M5 19.5h14" />
  </Svg>
);

export const IconPlay = (p: P) => (
  <Svg {...p}>
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

/** An open-end wrench, for the "you need" tool list. */
export const IconSpanner = (p: P) => (
  <Svg {...p}>
    <path d="M14.5 4.2a4.5 4.5 0 0 0-4.8 6L4 15.9a1.8 1.8 0 0 0 2.6 2.6l5.7-5.7a4.5 4.5 0 0 0 6-4.8l-2.6 2.6-2.4-.6-.6-2.4z" />
  </Svg>
);

/** Map pin: a place you can go to. */
export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s-6.5-5.7-6.5-10.6a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21Z" />
    <circle cx="12" cy="10.4" r="2.3" />
  </Svg>
);
