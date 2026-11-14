import type { PartId } from "./quote";

/** A short how-to for a do-it-yourself job, shown on the part sheet (/garage?part=<id>&guide=1). */
export type Guide = {
  title: string;
  minutes: number;
  tools: string[];
  steps: string[];
  /**
   * YouTube video ID, picked by a person who has watched the video. Never taken from the AI: a
   * model can invent an ID that does not exist. null until someone has picked one; the guide
   * then shows the steps without a video.
   */
  youtubeId: string | null;
};

/** One guide for each part with status "diy" in lib/car.ts. */
export const GUIDES: Partial<Record<PartId, Guide>> = {
  air_filter_box: {
    title: "Replace the engine air filter",
    minutes: 10,
    tools: ["New air filter for your car", "A screwdriver, in case the lid has screws"],
    steps: [
      "Turn the engine off and open the hood.",
      "Find the black air box and undo the clips (or screws) that hold its lid.",
      "Lift the lid and take out the old filter. Note which way round it sits.",
      "Wipe out any leaves or dust in the bottom of the box.",
      "Fit the new filter the same way round, with the rubber edge seated all the way around.",
      "Put the lid back and close every clip. A gap lets dirty air into the engine.",
    ],
    youtubeId: null,
  },
  battery: {
    title: "Replace the 12V battery",
    minutes: 30,
    tools: ["10 mm wrench", "Wrench extension, for the hold-down", "Gloves and eye protection", "Terminal brush (optional)"],
    steps: [
      "Turn the engine off and take the key out. Turn off the lights and the radio.",
      "Undo the negative (−, black) terminal first and move the cable away from the battery.",
      "Then undo the positive (+, red) terminal.",
      "Undo the hold-down bracket that clamps the battery in place.",
      "Lift the battery out. It is heavy: bend your knees and keep it upright.",
      "Clean any white or green crust off the cable ends.",
      "Set the new battery in the same way round and fit the hold-down. It must not move.",
      "Connect positive (+) first, then negative (−). Tighten both until they do not turn.",
      "Start the car. Take the old battery back to the store: they recycle it, and you often get a core refund.",
    ],
    youtubeId: null,
  },
  washer_fluid_cap: {
    title: "Top up the washer fluid",
    minutes: 2,
    tools: ["Windshield washer fluid", "A funnel (optional)"],
    steps: [
      "Open the hood and find the cap with the windshield-and-spray symbol.",
      "Flip the cap open.",
      "Pour washer fluid in until you can see it near the top of the filler neck.",
      "Close the cap, then try the washers from inside the car.",
    ],
    youtubeId: null,
  },
  wiper: {
    title: "Replace a wiper blade",
    minutes: 10,
    tools: ["New wiper blades (the two sides are different lengths)", "A towel"],
    steps: [
      "Lay a folded towel on the windshield, under the wiper arm.",
      "Lift the arm away from the glass until it stays up by itself.",
      "Press the release tab where the blade meets the hook at the end of the arm.",
      "Slide the old blade down and off the hook.",
      "Slide the new blade onto the hook until it clicks.",
      "Lower the arm gently onto the glass. Do not let it snap back: it can crack the windshield.",
      "Do the other side, then test the wipers with some washer fluid.",
    ],
    youtubeId: null,
  },
  coolant_reservoir: {
    title: "Check and top up the coolant",
    minutes: 10,
    tools: ["Honda Type 2 coolant (blue, pre-mixed)", "A funnel", "A rag"],
    steps: [
      "Park, turn the engine off and wait until it is cold. A few hours is safest.",
      "Find the see-through coolant tank and read the level against the MIN and MAX marks.",
      "If it is low, open the cap of the tank. Never open the radiator cap on a warm engine.",
      "Pour in pre-mixed coolant until the level reaches MAX.",
      "Close the cap and wipe up any spills. Coolant is poisonous to pets.",
      "If the level keeps dropping, there is a leak. Have a mechanic look.",
    ],
    youtubeId: null,
  },
  oil_dipstick: {
    title: "Check the engine oil",
    minutes: 5,
    tools: ["A rag or paper towel"],
    steps: [
      "Park on level ground. Run the engine until it is warm, turn it off and wait a few minutes.",
      "Pull out the dipstick (the loop handle) and wipe it clean.",
      "Push it all the way back in, then pull it out again.",
      "The oil should sit between the two marks near the tip.",
      "If it is near the lower mark, add a little oil through the oil fill cap, then check again.",
      "Push the dipstick fully back in when you are done.",
    ],
    youtubeId: null,
  },
  oil_fill_cap: {
    title: "Top up the engine oil",
    minutes: 10,
    tools: ["0W-20 engine oil", "A funnel", "A rag"],
    steps: [
      "Check the level with the dipstick first, so you know how much is missing.",
      "Twist the oil fill cap anticlockwise and lift it off.",
      "Pour in a little oil at a time, about half a quart, through a funnel.",
      "Wait a minute for it to drain down, then check the dipstick again.",
      "Stop at the upper mark. Too much oil is as bad as too little.",
      "Twist the cap back on, snug by hand, and wipe up any drips.",
    ],
    youtubeId: null,
  },
};
