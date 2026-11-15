/**
 * Places that sell or lend the tools and supplies a do-it-yourself guide asks for.
 *
 * MADE-UP DATA for the demo: the names, addresses, distances and hours are invented, and the list
 * is the same for every tool. A real version looks these up by tool and by the user's location.
 */
export type Store = {
  id: string;
  name: string;
  /** what kind of place it is, in a few words */
  kind: string;
  distance: string;
  address: string;
  hours: string;
  /** how you get the tool there: buy, borrow, rent */
  offer: string;
  /** a paid placement: listed first and marked "Sponsored" */
  sponsored?: boolean;
};

const STORES: Store[] = [
  {
    id: "autozone",
    name: "AutoZone",
    kind: "Auto parts store",
    distance: "0.8 mi",
    address: "1420 Monroe Street",
    hours: "Open until 9 PM",
    offer: "Buy it, or borrow it with a refundable deposit",
    sponsored: true,
  },
  {
    id: "meineke",
    name: "Meineke",
    kind: "Car repair shop",
    distance: "1.3 mi",
    address: "208 Maple Street",
    hours: "Open until 6 PM",
    offer: "Ask the shop to do the job for you",
  },
  {
    id: "midas",
    name: "Midas",
    kind: "Car repair shop",
    distance: "1.9 mi",
    address: "55 Sherman Avenue",
    hours: "Open until 6 PM",
    offer: "Ask the shop to do the job for you",
  },
  {
    id: "walmart-auto",
    name: "Walmart Auto Care Center",
    kind: "Store with an auto center",
    distance: "2.6 mi",
    address: "3900 East Washington Avenue",
    hours: "Open until 8 PM",
    offer: "Buy in store or pick up an online order",
  },
  {
    id: "costco-auto",
    name: "Costco Tire Center",
    kind: "Warehouse store with a tire center",
    distance: "4.2 mi",
    address: "2150 Deming Way",
    hours: "Open until 7 PM",
    offer: "Buy in store, membership needed",
  },
];

/** Where to get a tool. Sponsored places come first, then the nearest. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the demo list does not depend on the tool yet
export function storesForTool(tool: string): Store[] {
  return [...STORES].sort((a, b) => Number(b.sponsored ?? false) - Number(a.sponsored ?? false));
}
