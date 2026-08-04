import type { SpellCastDetails } from "@/lib/spell-cast-details";

export function SpellCastDetailsView({ details }: { details: SpellCastDetails }) {
  if (!details.save && !details.damage && !details.effect) {
    return <p className="pc-spell-cast-empty">No cast details available.</p>;
  }

  return (
    <dl className="pc-spell-cast-details">
      {details.save ? (
        <div>
          <dt>Save</dt>
          <dd>{details.save}</dd>
        </div>
      ) : null}
      {details.damage ? (
        <div>
          <dt>Dmg</dt>
          <dd>{details.damage}</dd>
        </div>
      ) : null}
      {details.effect ? (
        <div>
          <dt>Effect</dt>
          <dd>{details.effect}</dd>
        </div>
      ) : null}
    </dl>
  );
}
