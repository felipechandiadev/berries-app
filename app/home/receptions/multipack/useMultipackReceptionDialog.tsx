import React, { useState } from "react";
import ProcessedReceptionDialog from "../simple/ui/ProcessedReceptionDialog";

export function useMultipackReceptionDialog() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const showDialog = (data: any) => {
    setSnapshot(data);
    setOpen(true);
  };
  const hideDialog = () => setOpen(false);
  return {
    open,
    snapshot,
    showDialog,
    hideDialog,
    dialog: (
      <ProcessedReceptionDialog open={open} onClose={hideDialog} data={snapshot} />
    ),
  };
}
