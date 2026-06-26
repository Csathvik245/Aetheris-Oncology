"""VCF parser (Section 10). Extracts gene, protein variant, chromosome, position.

Handles the common annotation conventions:
  - INFO key=value pairs: GENE=, AA_CHANGE=, HGVS_P=, ANN= (SnpEff/VEP-style)
  - Header pragmas ##cancer_type= and ##patient_id=
Returns a dict matching the VCF Input Schema (Section 5.1).
"""
import re
from typing import Optional


def _parse_info(info: str) -> dict:
    out = {}
    for field in info.split(";"):
        if "=" in field:
            k, _, v = field.partition("=")
            out[k.strip().upper()] = v.strip()
        else:
            out[field.strip().upper()] = True
    return out


def _extract_gene(info: dict) -> Optional[str]:
    for key in ("GENE", "GENEINFO", "SYMBOL", "GENE_NAME"):
        if key in info and isinstance(info[key], str):
            return info[key].split(":")[0].split("|")[0]
    # SnpEff/VEP ANN field: ALT|effect|impact|GENE|...
    if "ANN" in info and isinstance(info["ANN"], str):
        parts = info["ANN"].split("|")
        if len(parts) > 3 and parts[3]:
            return parts[3]
    return None


def _extract_variant(info: dict) -> Optional[str]:
    for key in ("AA_CHANGE", "HGVS_P", "PROTEIN_CHANGE", "AACHANGE"):
        if key in info and isinstance(info[key], str):
            v = info[key]
            # normalise p.Val600Glu / p.V600E -> V600E
            v = v.replace("p.", "")
            m = re.search(r"[A-Z][a-z]{2}\d+[A-Z][a-z]{2}", v)
            if m:
                return _three_to_one(m.group())
            m = re.search(r"[A-Z]\d+[A-Z*]", v)
            if m:
                return m.group()
            return v
    return None


_AA3TO1 = {
    "Ala": "A", "Arg": "R", "Asn": "N", "Asp": "D", "Cys": "C", "Gln": "Q",
    "Glu": "E", "Gly": "G", "His": "H", "Ile": "I", "Leu": "L", "Lys": "K",
    "Met": "M", "Phe": "F", "Pro": "P", "Ser": "S", "Thr": "T", "Trp": "W",
    "Tyr": "Y", "Val": "V", "Ter": "*",
}


def _three_to_one(s: str) -> str:
    m = re.match(r"([A-Z][a-z]{2})(\d+)([A-Z][a-z]{2})", s)
    if not m:
        return s
    ref, pos, alt = m.groups()
    return f"{_AA3TO1.get(ref, ref)}{pos}{_AA3TO1.get(alt, alt)}"


def parse_vcf(content: str, patient_id: str = "UNKNOWN", cancer_type: str = "unknown") -> dict:
    """Parse raw VCF text into the VCF Input Schema dict."""
    mutations = []
    for line in content.splitlines():
        line = line.rstrip("\n")
        if line.startswith("##"):
            low = line.lower()
            if low.startswith("##cancer_type="):
                cancer_type = line.split("=", 1)[1].strip()
            elif low.startswith("##patient_id="):
                patient_id = line.split("=", 1)[1].strip()
            continue
        if line.startswith("#") or not line.strip():
            continue
        cols = re.split(r"\s+", line.strip())
        if len(cols) < 8:
            continue
        chrom, pos = cols[0], cols[1]
        info = _parse_info(cols[7])
        gene = _extract_gene(info)
        variant = _extract_variant(info)
        if not gene:
            continue
        try:
            position = int(pos)
        except ValueError:
            position = 0
        mutations.append({
            "gene": gene,
            "variant": variant or "",
            "chromosome": str(chrom),
            "position": position,
        })

    return {
        "patient_id": patient_id,
        "cancer_type": cancer_type,
        "mutations": mutations,
    }


if __name__ == "__main__":
    import json
    from pathlib import Path
    demo = Path(__file__).parent.parent / "demo_patient.vcf"
    print(json.dumps(parse_vcf(demo.read_text()), indent=2))
