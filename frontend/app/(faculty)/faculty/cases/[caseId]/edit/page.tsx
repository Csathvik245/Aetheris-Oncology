"use client";

import { use } from "react";
import { CaseBuilderForm } from "../../CaseBuilderForm";

export default function EditCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  return <CaseBuilderForm caseId={caseId} />;
}
