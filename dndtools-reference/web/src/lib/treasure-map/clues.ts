export const LANDMARK_TYPES: readonly string[] = [
  "a ring of weathered standing stones that hum when the wind shifts",
  "a collapsed watchtower with ivy choking the arrow slits",
  "a ford where the river runs shallow over pale gravel",
  "a stand of lightning-scarred pines on a windy ridge",
  "a salt-stained cove hidden below chalk cliffs",
  "a ruined chapel whose bell still tolls once at dusk",
  "a hunter's blind above a game trail through ferns",
  "a sinkhole pond fed by a cold spring",
  "a caravan rest marked by three carved milestones",
  "a burned farmhouse ringed by blackened fence posts",
  "a natural arch of red rock over a dry wash",
  "a hermit's cave mouth sealed with woven branches",
  "a beacon mound topped with a soot-blackened brazier",
  "a marsh boardwalk sinking into reeds and mist",
  "a quarry face glittering with mica and old pick marks",
  "a grove where every trunk bears pilgrim ribbons",
  "a split boulder said to swallow echoing shouts",
  "a rope bridge swaying over a gorge with a roaring stream",
  "a terraced hillside of abandoned vine rows",
  "a cairn field where each stone marks a forgotten oath",
];

export const TRAVEL_FRAGMENTS: readonly string[] = [
  "Follow the coast two days beyond {prev} to reach {hoard}.",
  "Cross the ridge east of {prev}; the hoard lies at {hoard}.",
  "When the river bends south of {prev}, strike inland toward {hoard}.",
  "Count three ridges after {prev}; dig where the map names {hoard}.",
  "Sail past the cove below {prev} and land below {hoard}.",
  "From {prev}, walk with the prevailing wind until you sight {hoard}.",
  "The old trail from {prev} ends at a cairn pointing to {hoard}.",
  "Two days through pine shadow north of {prev} brings you to {hoard}.",
  "Ford upstream of {prev}, then follow the game path to {hoard}.",
  "At dusk, line up the standing stones of {prev} with {hoard} on the horizon.",
  "Descend the scree slope below {prev}; the cache waits at {hoard}.",
  "Where the marsh reeds thin beyond {prev}, the hoard rests at {hoard}.",
];

export function buildLandmarkClue(placeName: string, landmarkType: string): string {
  return `${placeName}: ${landmarkType}.`;
}

export function buildHoardClue(
  fragment: string,
  previousPlaceName: string,
  hoardPlaceName: string,
): string {
  return fragment.replaceAll("{prev}", previousPlaceName).replaceAll("{hoard}", hoardPlaceName);
}
