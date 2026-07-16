import type { PatientPacket } from "./mock";

const NON_ACTIONABLE = /^(mutation|neg|negative|pos|positive|loss|amplification|fusion|rearrangement)s?$/i;

function parseGenomicMarker(raw: string): { gene: string; variant: string } | null {
  const cleaned = raw.replace(/[()]/g, " ").replace(/[–—]/g, "-").trim();
  const m = cleaned.match(/^([A-Za-z0-9]+)\s+(.+)$/);
  if (!m) return null;
  const gene = m[1].toUpperCase();
  const variant = m[2].replace(/-\s*\(?(NEG|POS)\)?/gi, "").trim();
  if (!variant || NON_ACTIONABLE.test(variant)) return null;
  return { gene, variant };
}

/** Builds a minimal VCF from a case's genomic profile so the live agent
 * pipeline (Mission Control) analyzes the mutations that actually belong
 * to this case, instead of a fixed demo file. Returns null if the case
 * has no parseable point mutations. */
export function buildVcfFromPacket(packet: PatientPacket): string | null {
  const entries = packet.pathology.genomicProfile
    .map(parseGenomicMarker)
    .filter((x): x is { gene: string; variant: string } => x !== null);
  if (entries.length === 0) return null;

  const lines = [
    "##fileformat=VCFv4.2",
    "##source=Aetheris-CaseGenerator",
    '##INFO=<ID=GENE,Number=1,Type=String,Description="Gene symbol">',
    '##INFO=<ID=AA_CHANGE,Number=1,Type=String,Description="Protein change">',
    `##cancer_type=${packet.pathology.diagnosis || "unknown"}`,
    `##patient_id=${packet.caseId}`,
    "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO",
    ...entries.map((e, i) => `1\t${1000 + i}\t.\tA\tT\t.\tPASS\tGENE=${e.gene};AA_CHANGE=${e.variant}`),
  ];
  return lines.join("\n") + "\n";
}
