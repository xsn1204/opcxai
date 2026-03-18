"use client";

import { useEffect } from "react";

export function MarkSubmissionsRead({ requirementId }: { requirementId: string }) {
  useEffect(() => {
    fetch(`/api/corp/requirements/${requirementId}/mark-submissions-read`, { method: "POST" }).catch(() => {});
  }, [requirementId]);
  return null;
}
