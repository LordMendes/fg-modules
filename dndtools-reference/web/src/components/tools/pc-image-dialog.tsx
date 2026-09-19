"use client";

import { DraggableDialog } from "@/components/draggable-dialog";
import { PcImageSlot } from "@/components/tools/pc-image-slot";

type PatchKeyFn = (key: string | null) => void;

export function PcImageDialog({
  open,
  onClose,
  planId,
  profileImageKey,
  tokenImageKey,
  onProfileKeyChange,
  onTokenKeyChange,
  readOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  planId: string;
  profileImageKey: string | null | undefined;
  tokenImageKey: string | null | undefined;
  onProfileKeyChange: PatchKeyFn;
  onTokenKeyChange: PatchKeyFn;
  readOnly?: boolean;
}) {
  return (
    <DraggableDialog
      open={open}
      title="Character images"
      onClose={onClose}
      panelClassName="pc-image-dialog"
    >
      <p className="pc-image-dialog-intro">
        Choose a square profile portrait and a circular map token.
      </p>
      <div className="pc-image-dialog-slots">
        <PcImageSlot
          planId={planId}
          kind="profile"
          imageKey={profileImageKey}
          readOnly={readOnly}
          variant="dialog"
          onKeyChange={onProfileKeyChange}
        />
        <PcImageSlot
          planId={planId}
          kind="token"
          imageKey={tokenImageKey}
          readOnly={readOnly}
          variant="dialog"
          onKeyChange={onTokenKeyChange}
        />
      </div>
    </DraggableDialog>
  );
}
