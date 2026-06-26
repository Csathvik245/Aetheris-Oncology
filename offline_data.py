"""Offline knowledge base + deterministic fallbacks.

Shared by the MCP servers (used when an upstream API key is missing or the
upstream call fails) AND by the agents (used when an MCP server isn't reachable).
This is what makes the demo run end-to-end with zero paid keys, while still
preferring live data whenever it is available.
"""
import math
from typing import Optional, List

# ── OncoKB-style annotations for well-known oncology variants ────────────────
# Keyed by (GENE, VARIANT). Mirrors the fields the genomic agent consumes.
ONCOKB_KB = {
    ("BRAF", "V600E"): {
        "oncogenic": True, "evidence_level": "LEVEL_1",
        "drug": "Dabrafenib + Trametinib",
        "description": "BRAF V600E is a well-characterized activating driver; FDA-approved BRAF/MEK inhibitor combinations apply.",
        "confidence": 0.97,
    },
    ("BRAF", "V600K"): {
        "oncogenic": True, "evidence_level": "LEVEL_1",
        "drug": "Dabrafenib + Trametinib",
        "description": "BRAF V600K activating mutation; responsive to BRAF/MEK inhibition.",
        "confidence": 0.92,
    },
    ("KRAS", "G12C"): {
        "oncogenic": True, "evidence_level": "LEVEL_1",
        "drug": "Sotorasib",
        "description": "KRAS G12C is targetable with covalent G12C inhibitors.",
        "confidence": 0.9,
    },
    ("KRAS", "G12D"): {
        "oncogenic": True, "evidence_level": "LEVEL_4",
        "drug": "Pan-RAS inhibitor (investigational)",
        "description": "KRAS G12D is an oncogenic driver; direct inhibitors are investigational.",
        "confidence": 0.78,
    },
    ("EGFR", "L858R"): {
        "oncogenic": True, "evidence_level": "LEVEL_1",
        "drug": "Osimertinib",
        "description": "EGFR L858R sensitizing mutation; responsive to 3rd-gen EGFR TKIs.",
        "confidence": 0.95,
    },
    ("TP53", "R273C"): {
        "oncogenic": True, "evidence_level": "LEVEL_4",
        "drug": None,
        "description": "TP53 R273C is a recurrent loss-of-function hotspot; not directly druggable, informs prognosis and combination strategy.",
        "confidence": 0.7,
    },
    ("TP53", "R175H"): {
        "oncogenic": True, "evidence_level": "LEVEL_4",
        "drug": None,
        "description": "TP53 R175H structural hotspot; loss of tumor-suppressor function.",
        "confidence": 0.7,
    },
}


def annotate_offline(gene: str, variant: str) -> dict:
    """Deterministic OncoKB-shaped annotation."""
    hit = ONCOKB_KB.get((gene.upper(), variant.upper()))
    if hit:
        return {**hit, "source": "offline_kb"}
    # Unknown variant — conservative non-actionable default.
    return {
        "oncogenic": False, "evidence_level": "LEVEL_4", "drug": None,
        "description": f"No curated annotation found for {gene} {variant}.",
        "confidence": 0.3, "source": "offline_kb",
    }


# ── ClinVar-style pathogenicity fallback ────────────────────────────────────
CLINVAR_KB = {
    ("BRAF", "V600E"): ("Pathogenic", "reviewed by expert panel"),
    ("KRAS", "G12C"): ("Pathogenic", "criteria provided, multiple submitters"),
    ("KRAS", "G12D"): ("Pathogenic", "criteria provided, multiple submitters"),
    ("EGFR", "L858R"): ("Pathogenic", "reviewed by expert panel"),
    ("TP53", "R273C"): ("Pathogenic", "criteria provided, multiple submitters"),
    ("TP53", "R175H"): ("Pathogenic", "reviewed by expert panel"),
}


def clinvar_offline(gene: str, variant: str) -> dict:
    hit = CLINVAR_KB.get((gene.upper(), variant.upper()))
    if hit:
        return {"pathogenicity": hit[0], "review_status": hit[1], "source": "offline_kb"}
    return {"pathogenicity": "Uncertain significance", "review_status": "no assertion criteria", "source": "offline_kb"}


# ── ClinicalTrials.gov fallback ─────────────────────────────────────────────
TRIALS_KB = {
    "BRAF": [{
        "nct_id": "NCT02034110", "title": "Dabrafenib and Trametinib in BRAF V600-Mutant Melanoma",
        "status": "RECRUITING", "phase": "Phase 3",
        "eligibility_summary": "Adults with unresectable/metastatic BRAF V600E/K-mutant melanoma, ECOG 0-1.",
    }],
    "KRAS": [{
        "nct_id": "NCT03600883", "title": "Sotorasib in KRAS G12C-Mutated Advanced Solid Tumors",
        "status": "RECRUITING", "phase": "Phase 2",
        "eligibility_summary": "Locally advanced or metastatic KRAS G12C-mutant solid tumors.",
    }],
    "EGFR": [{
        "nct_id": "NCT02296125", "title": "Osimertinib in EGFR-Mutant NSCLC",
        "status": "RECRUITING", "phase": "Phase 3",
        "eligibility_summary": "EGFR sensitizing mutation, advanced NSCLC, treatment-naive.",
    }],
    "IDH1": [{
        "nct_id": "NCT04164901", "title": "Vorasidenib in IDH1/2-Mutant Low-Grade Glioma (INDIGO)",
        "status": "RECRUITING", "phase": "Phase 3",
        "eligibility_summary": "Residual or recurrent grade 2 IDH1/IDH2-mutant glioma after surgery.",
    }],
    "PTEN": [{
        "nct_id": "NCT05432518", "title": "mTOR Inhibition in PTEN-Deficient Advanced Solid Tumors",
        "status": "RECRUITING", "phase": "Phase 2",
        "eligibility_summary": "PTEN loss-of-function by NGS; progression on standard therapy.",
    }],
}

# ── Cancer-type trials (used when no gene-specific trial is curated) ─────────
CANCER_TRIALS_KB = {
    "glioblastoma": [
        {"nct_id": "NCT03970447", "title": "Temozolomide + Radiotherapy in Newly Diagnosed Glioblastoma",
         "status": "RECRUITING", "phase": "Phase 3",
         "eligibility_summary": "Newly diagnosed IDH-wildtype glioblastoma, ECOG 0-2, prior maximal resection."},
        {"nct_id": "NCT02511405", "title": "Bevacizumab for Recurrent Glioblastoma",
         "status": "RECRUITING", "phase": "Phase 2",
         "eligibility_summary": "Recurrent/progressive glioblastoma after first-line chemoradiation."},
    ],
    "glioma": [
        {"nct_id": "NCT04164901", "title": "Vorasidenib in IDH-Mutant Low-Grade Glioma (INDIGO)",
         "status": "RECRUITING", "phase": "Phase 3",
         "eligibility_summary": "Residual or recurrent grade 2 IDH-mutant glioma."},
    ],
    "melanoma": [
        {"nct_id": "NCT02034110", "title": "Dabrafenib + Trametinib in BRAF V600-Mutant Melanoma",
         "status": "RECRUITING", "phase": "Phase 3",
         "eligibility_summary": "Unresectable/metastatic BRAF V600-mutant melanoma, ECOG 0-1."},
    ],
}


def _cancer_key(cancer_type: str) -> str:
    ct = (cancer_type or "").lower()
    for key in CANCER_TRIALS_KB:
        if key in ct:
            return key
    if any(k in ct for k in ("glio", "astrocytoma", "oligodendroglioma")):
        return "glioblastoma"
    return ""


def trials_offline(genes: List[str], cancer_type: str = "") -> dict:
    out, seen = [], set()
    for g in genes:
        for t in TRIALS_KB.get(g.upper(), []):
            if t["nct_id"] not in seen:
                seen.add(t["nct_id"]); out.append(t)
    # always add the cancer-type standard-of-care trials so a real VCF matches something
    ck = _cancer_key(cancer_type)
    for t in CANCER_TRIALS_KB.get(ck, []):
        if t["nct_id"] not in seen:
            seen.add(t["nct_id"]); out.append(t)
    return {"trials": out[:5], "source": "offline_kb"}


# ── OpenFDA adverse-events fallback ─────────────────────────────────────────
FDA_KB = {
    "dabrafenib": (["Pyrexia", "Fatigue", "Cutaneous squamous cell carcinoma", "Arthralgia"], "MODERATE",
                   ["Cardiomyopathy risk with trametinib (LVEF monitoring)"]),
    "trametinib": (["Rash", "Diarrhea", "Decreased ejection fraction", "Hypertension"], "MODERATE",
                   ["Cardiotoxicity — monitor LVEF"]),
    "sotorasib": (["Diarrhea", "Hepatotoxicity", "Nausea", "Fatigue"], "MODERATE",
                  ["Hepatotoxicity — monitor LFTs"]),
    "osimertinib": (["Diarrhea", "Rash", "QT prolongation", "Interstitial lung disease"], "MODERATE",
                    ["QT prolongation — ECG monitoring", "Rare ILD/pneumonitis"]),
    "pembrolizumab": (["Fatigue", "Pruritus", "Immune-mediated pneumonitis", "Colitis"], "MODERATE",
                      ["Immune-related adverse events"]),
    "vemurafenib": (["Arthralgia", "Photosensitivity", "Cutaneous SCC", "Rash"], "MODERATE",
                    ["Photosensitivity", "Secondary skin malignancies"]),
    "temozolomide": (["Myelosuppression", "Nausea", "Fatigue", "Thrombocytopenia"], "MODERATE",
                     ["Myelosuppression — monitor CBC", "Lymphopenia / PJP risk"]),
    "bevacizumab": (["Hypertension", "Proteinuria", "Hemorrhage", "Impaired wound healing"], "HIGH",
                    ["Bleeding / thromboembolic risk", "GI perforation", "Hold around surgery"]),
    "vorasidenib": (["Transaminase elevation", "Fatigue", "Headache", "Diarrhea"], "LOW",
                    ["Hepatotoxicity — monitor LFTs"]),
    "ivosidenib": (["QT prolongation", "Differentiation syndrome", "Fatigue", "Nausea"], "MODERATE",
                   ["QT prolongation — ECG monitoring", "Differentiation syndrome"]),
    "avapritinib": (["Edema", "Cognitive effects", "Intracranial hemorrhage", "Nausea"], "MODERATE",
                    ["Intracranial bleeding risk", "Cognitive impairment"]),
    "everolimus": (["Stomatitis", "Hyperglycemia", "Non-infectious pneumonitis", "Fatigue"], "MODERATE",
                   ["Immunosuppression", "Metabolic effects — monitor glucose/lipids"]),
    "palbociclib": (["Neutropenia", "Fatigue", "Nausea", "Alopecia"], "MODERATE",
                    ["Neutropenia — monitor CBC", "CYP3A4 interactions"]),
    "milademetan": (["Thrombocytopenia", "Nausea", "Fatigue", "Decreased appetite"], "MODERATE",
                    ["Myelosuppression (investigational agent)"]),
    "adagrasib": (["Diarrhea", "Nausea", "Hepatotoxicity", "QT prolongation"], "MODERATE",
                  ["QT prolongation", "Hepatotoxicity — monitor LFTs"]),
    "alpelisib": (["Hyperglycemia", "Rash", "Diarrhea", "Stomatitis"], "MODERATE",
                  ["Severe hyperglycemia — monitor glucose"]),
    "olaparib": (["Anemia", "Nausea", "Fatigue", "Neutropenia"], "MODERATE",
                 ["Myelosuppression", "Rare MDS/AML"]),
    "larotrectinib": (["Dizziness", "Fatigue", "Nausea", "Transaminase elevation"], "LOW",
                      ["Hepatotoxicity — monitor LFTs"]),
    "trastuzumab": (["Decreased ejection fraction", "Infusion reaction", "Diarrhea"], "MODERATE",
                    ["Cardiotoxicity — monitor LVEF"]),
    "imatinib": (["Edema", "Nausea", "Muscle cramps", "Rash"], "LOW",
                 ["Fluid retention", "CYP3A4 interactions"]),
}


def fda_offline(drug_name: str, limit: int = 100) -> dict:
    key = drug_name.lower().split()[0].split("+")[0].strip()
    hit = FDA_KB.get(key)
    if hit:
        events, risk, interactions = hit
        return {"drug": drug_name, "adverse_events": events, "risk_level": risk,
                "interaction_flags": interactions, "source": "offline_kb"}
    return {"drug": drug_name, "adverse_events": [], "risk_level": "LOW",
            "interaction_flags": ["Unverified — no FDA data available"], "source": "offline_kb"}


# ════════════════════════════════════════════════════════════════════════════
# Therapy recommendation engine
# ════════════════════════════════════════════════════════════════════════════
# This is what makes the pipeline produce ACCURATE, variant-specific treatment
# options for ANY VCF — not just the few hardcoded demo variants. OncoKB tells us
# whether a variant is oncogenic; this layer maps an oncogenic driver (with
# variant + cancer-type awareness) to the best curated targeted therapy, and
# falls back to the cancer's standard of care when no targeted option exists.
#
# Educational/demo knowledge base — NOT for clinical use.

# Relative weighting of OncoKB evidence levels, used to rank options sensibly so
# the untrained survival head doesn't put investigational agents above SoC.
EVIDENCE_WEIGHT = {"LEVEL_1": 1.0, "LEVEL_2": 0.78, "LEVEL_3": 0.55, "LEVEL_4": 0.32}

# Classic EGFR kinase-domain sensitizing alterations responsive to EGFR TKIs.
EGFR_SENSITIZING = {"L858R", "T790M", "G719A", "G719S", "G719C", "L861Q", "S768I"}

# gene -> (drug, evidence_level, rationale) for variant-agnostic targeted matches.
GENE_THERAPY = {
    "BRAF": ("Dabrafenib + Trametinib", "LEVEL_1", "BRAF/MEK inhibition for activating BRAF mutations."),
    "ALK": ("Alectinib", "LEVEL_1", "ALK inhibition for ALK-rearranged tumors."),
    "ROS1": ("Crizotinib", "LEVEL_1", "ROS1 inhibition for ROS1 fusions."),
    "MET": ("Capmatinib", "LEVEL_1", "MET inhibition for MET exon-14 skipping / amplification."),
    "RET": ("Selpercatinib", "LEVEL_1", "Selective RET inhibition for RET fusions/mutations."),
    "ERBB2": ("Trastuzumab deruxtecan", "LEVEL_1", "HER2-directed antibody-drug conjugate."),
    "HER2": ("Trastuzumab deruxtecan", "LEVEL_1", "HER2-directed antibody-drug conjugate."),
    "PIK3CA": ("Alpelisib", "LEVEL_1", "PI3K-alpha inhibition for PIK3CA-mutant tumors."),
    "PTEN": ("Everolimus", "LEVEL_4", "PI3K/AKT/mTOR pathway inhibition for PTEN loss (investigational)."),
    "AKT1": ("Capivasertib", "LEVEL_3", "AKT inhibition for AKT1-altered tumors."),
    "IDH2": ("Enasidenib", "LEVEL_3", "Mutant-IDH2 inhibition."),
    "CDKN2A": ("Palbociclib", "LEVEL_4", "CDK4/6 inhibition for CDKN2A loss (investigational)."),
    "CDK4": ("Palbociclib", "LEVEL_3", "CDK4/6 inhibition for CDK4 amplification."),
    "CCND1": ("Palbociclib", "LEVEL_4", "CDK4/6 inhibition for cyclin-D1 amplification (investigational)."),
    "MDM2": ("Milademetan", "LEVEL_4", "MDM2-p53 interaction inhibition (investigational)."),
    "BRCA1": ("Olaparib", "LEVEL_1", "PARP inhibition in homologous-recombination-deficient tumors."),
    "BRCA2": ("Olaparib", "LEVEL_1", "PARP inhibition in homologous-recombination-deficient tumors."),
    "ATM": ("Olaparib", "LEVEL_3", "PARP inhibition in HR-pathway-deficient tumors."),
    "NTRK1": ("Larotrectinib", "LEVEL_1", "TRK inhibition for NTRK fusions."),
    "NTRK2": ("Larotrectinib", "LEVEL_1", "TRK inhibition for NTRK fusions."),
    "NTRK3": ("Larotrectinib", "LEVEL_1", "TRK inhibition for NTRK fusions."),
    "FLT3": ("Midostaurin", "LEVEL_1", "FLT3 inhibition for FLT3-mutant AML."),
    "VHL": ("Belzutifan", "LEVEL_1", "HIF-2-alpha inhibition for VHL-associated tumors."),
    "FGFR2": ("Pemigatinib", "LEVEL_1", "FGFR inhibition for FGFR2 fusions/rearrangements."),
    "FGFR3": ("Erdafitinib", "LEVEL_1", "FGFR inhibition for FGFR3 alterations."),
}

# cancer-type -> list of (drug, evidence_level, rationale) standard-of-care options.
CANCER_SOC = {
    "glioblastoma": [
        ("Temozolomide", "LEVEL_1", "Alkylating chemotherapy; standard-of-care with radiotherapy (Stupp protocol). Benefit greatest with MGMT promoter methylation."),
        ("Bevacizumab", "LEVEL_1", "Anti-VEGF therapy approved for recurrent glioblastoma."),
    ],
    "melanoma": [
        ("Pembrolizumab", "LEVEL_1", "Anti-PD-1 checkpoint inhibitor; first-line for advanced melanoma."),
    ],
    "lung": [
        ("Pembrolizumab", "LEVEL_1", "Checkpoint inhibition for advanced NSCLC."),
    ],
    "colorectal": [
        ("FOLFOX (chemotherapy)", "LEVEL_1", "Oxaliplatin-based standard chemotherapy backbone."),
    ],
    "breast": [
        ("Paclitaxel", "LEVEL_1", "Taxane chemotherapy; standard cytotoxic backbone."),
    ],
    "pancreatic": [
        ("FOLFIRINOX (chemotherapy)", "LEVEL_1", "Multi-agent standard chemotherapy."),
    ],
}


def _soc_key(cancer_type: str) -> str:
    ct = (cancer_type or "").lower()
    for key in CANCER_SOC:
        if key in ct:
            return key
    if any(k in ct for k in ("glio", "astrocytoma", "oligodendroglioma")):
        return "glioblastoma"
    if "nsclc" in ct or "lung" in ct:
        return "lung"
    return ""


def cancer_soc_options(cancer_type: str) -> List[dict]:
    """Standard-of-care therapies for a cancer type (always non-empty)."""
    soc = CANCER_SOC.get(_soc_key(cancer_type))
    if soc:
        return [{"drug": d, "evidence_level": e, "rationale": r} for d, e, r in soc]
    return [{"drug": "Standard of care / clinical trial enrollment", "evidence_level": "LEVEL_4",
             "rationale": "No targeted therapy curated for this profile; recommend guideline-based "
                          "standard of care or clinical-trial enrollment."}]


# ── Context-dependent therapy: same variant -> different drug by cancer type ──
# A single oncogenic variant is NOT druggable the same way across tumors (EGFR
# feedback in colon, tissue-specific approvals, resistance biology). This is the
# general (gene, variant) x cancer_type -> therapy layer. Each entry maps a
# cancer-type substring to (drug, evidence_level, rationale); "*" is the default
# when no tissue-specific override applies. Add an entry whenever a variant's
# best therapy is tissue-dependent — the mechanism is generic, not per-file.
CONTEXT_THERAPY = {
    ("BRAF", "V600E"): {
        "colorectal": ("Encorafenib + Cetuximab", "LEVEL_1",
                       "BRAF inhibitor + anti-EGFR antibody — standard of care for BRAF V600E "
                       "metastatic colorectal cancer (BEACON CRC). BRAF monotherapy / BRAF+MEK "
                       "underperforms in CRC due to EGFR-mediated feedback reactivation, so EGFR "
                       "co-blockade is required."),
        "colon":       ("Encorafenib + Cetuximab", "LEVEL_1",
                       "BRAF inhibitor + anti-EGFR antibody — SoC for BRAF V600E colon cancer "
                       "(BEACON CRC); counteracts EGFR feedback reactivation."),
        "melanoma":    ("Dabrafenib + Trametinib", "LEVEL_1",
                       "BRAF/MEK inhibition — SoC for BRAF V600E unresectable/metastatic melanoma."),
        "lung":        ("Dabrafenib + Trametinib", "LEVEL_1",
                       "BRAF/MEK inhibition — approved for BRAF V600E non-small-cell lung cancer."),
        "thyroid":     ("Dabrafenib + Trametinib", "LEVEL_1",
                       "BRAF/MEK inhibition — approved for BRAF V600E anaplastic thyroid carcinoma."),
        "*":           ("Dabrafenib + Trametinib", "LEVEL_1",
                       "BRAF/MEK inhibition for the BRAF V600E activating driver."),
    },
    ("KRAS", "G12C"): {
        "colorectal": ("Adagrasib + Cetuximab", "LEVEL_1",
                       "KRAS G12C inhibitor + anti-EGFR antibody — colorectal cancer requires EGFR "
                       "co-blockade (KRYSTAL-1); G12C monotherapy is less effective in CRC."),
        "colon":       ("Adagrasib + Cetuximab", "LEVEL_1",
                       "KRAS G12C inhibitor + anti-EGFR antibody for G12C colon cancer (KRYSTAL-1)."),
        "lung":        ("Sotorasib", "LEVEL_1",
                       "Covalent KRAS G12C inhibitor — approved in non-small-cell lung cancer."),
        "*":           ("Sotorasib", "LEVEL_1", "Covalent KRAS G12C inhibitor."),
    },
}


def _match_context(cancer_type: str, mapping: dict):
    """Resolve a CONTEXT_THERAPY entry for a cancer type. Tissue key match wins;
    otherwise the "*" default. Returns (drug, evidence_level, rationale)."""
    ct = (cancer_type or "").lower()
    for key, val in mapping.items():
        if key != "*" and key in ct:
            return val
    return mapping.get("*")


def has_context_therapy(gene: str, variant: str) -> bool:
    """True when a tissue-specific therapy override exists for this variant."""
    return (gene.upper(), (variant or "").upper()) in CONTEXT_THERAPY


def recommend_therapy(gene: str, variant: str, cancer_type: str = "") -> dict:
    """Best curated therapy for an oncogenic driver. Returns {drug, evidence_level, rationale}.

    Resolution order: context-dependent (variant x cancer_type) -> exact (gene,
    variant) KB -> variant-aware special cases -> gene-level targeted map ->
    cancer-type standard of care -> generic.
    """
    g, v = gene.upper(), (variant or "").upper()
    ct = (cancer_type or "").lower()
    is_glioma = any(k in ct for k in ("glio", "astrocytoma", "oligodendroglioma"))

    # 0) context-dependent therapy (cancer-type-aware) — highest priority
    ctx = CONTEXT_THERAPY.get((g, v))
    if ctx:
        drug, level, rationale = _match_context(cancer_type, ctx)
        return {"drug": drug, "evidence_level": level, "rationale": rationale}

    # 1) exact curated variant
    hit = ONCOKB_KB.get((g, v))
    if hit and hit.get("drug"):
        return {"drug": hit["drug"], "evidence_level": hit["evidence_level"],
                "rationale": hit.get("description", "")}

    # 2) variant-aware special cases
    if g == "EGFR":
        if v in EGFR_SENSITIZING or "DEL" in v or "INS" in v:
            return {"drug": "Osimertinib", "evidence_level": "LEVEL_1",
                    "rationale": "3rd-generation EGFR TKI for sensitizing EGFR alterations."}
        if is_glioma:
            soc = cancer_soc_options(cancer_type)[0]
            return {**soc, "rationale": "EGFR amplification/ectodomain variant in glioma has no "
                                        "approved targeted therapy; " + soc["rationale"]}
        return {"drug": "Osimertinib", "evidence_level": "LEVEL_3",
                "rationale": "EGFR-directed therapy; activity is variant-dependent."}
    if g == "IDH1":
        if is_glioma:
            return {"drug": "Vorasidenib", "evidence_level": "LEVEL_1",
                    "rationale": "Brain-penetrant mutant-IDH1/2 inhibitor; FDA-approved for grade-2 "
                                 "IDH-mutant glioma."}
        return {"drug": "Ivosidenib", "evidence_level": "LEVEL_3",
                "rationale": "Mutant-IDH1 inhibition (approved in IDH1-mutant AML / cholangiocarcinoma)."}
    if g == "KIT":
        if "D816" in v:
            return {"drug": "Avapritinib", "evidence_level": "LEVEL_1",
                    "rationale": "KIT D816V-active inhibitor (imatinib-resistant)."}
        return {"drug": "Imatinib", "evidence_level": "LEVEL_1",
                "rationale": "KIT inhibition for imatinib-sensitive KIT mutations."}
    if g == "KRAS":
        if "G12C" in v:
            return {"drug": "Sotorasib", "evidence_level": "LEVEL_1",
                    "rationale": "Covalent KRAS G12C inhibitor."}
        if "G12D" in v:
            return {"drug": "Pan-RAS inhibitor (investigational)", "evidence_level": "LEVEL_4",
                    "rationale": "KRAS G12D oncogenic driver; direct inhibitors investigational."}
        return {"drug": "Adagrasib", "evidence_level": "LEVEL_3",
                "rationale": "KRAS-directed therapy; activity is allele-dependent."}

    # 3) gene-level targeted therapy
    rec = GENE_THERAPY.get(g)
    if rec:
        return {"drug": rec[0], "evidence_level": rec[1], "rationale": rec[2]}

    # 4) cancer-type standard of care (covers undruggable drivers: TP53, RB1, STK11, …)
    return cancer_soc_options(cancer_type)[0]


# ════════════════════════════════════════════════════════════════════════════
# Deterministic, explainable survival-benefit scoring
# ════════════════════════════════════════════════════════════════════════════
# The PyTorch head in survival_model.py is UNTRAINED (random weights), so it
# cannot rank therapies — it collapses to a near-constant value, making every
# card identical. We instead compute a transparent score from factors that
# genuinely vary per drug, with OncoKB evidence as the dominant, ranking-safe
# term so a weak driver can never outrank a LEVEL_1 match.
#
#   score = evidence_band  +  clamp(adjustments, ±0.08)
#
# Evidence bands are spaced 0.17 apart and adjustments are clamped to ±0.08
# (< half the gap), so options NEVER cross evidence tiers — LEVEL_1 always
# outranks LEVEL_2, etc. Within a tier, options are differentiated (and kept
# distinct) by variant-match strength, on-/off-label fit for the cancer type,
# toxicity risk, and oncogenicity confidence. All deterministic + explainable.
SURVIVAL_BAND = {"LEVEL_1": 0.85, "LEVEL_2": 0.68, "LEVEL_3": 0.51, "LEVEL_4": 0.34}
_TOX_ADJ = {"LOW": 0.025, "MODERATE": 0.0, "HIGH": -0.045}


def _match_tier(gene: str, variant: str, drug: str, cancer_type: str) -> float:
    """How specifically the therapy is matched to the driver (variant-match strength)."""
    g, v = (gene or "").upper(), (variant or "").upper()
    if (g, v) in CONTEXT_THERAPY:
        return 0.05  # tissue-specific, variant-level match
    hit = ONCOKB_KB.get((g, v))
    if hit and hit.get("drug"):
        return 0.05  # curated exact-variant match
    if g in GENE_THERAPY:
        return 0.03  # gene-level targeted therapy
    soc = CANCER_SOC.get(_soc_key(cancer_type), [])
    if any((drug or "").lower().startswith(d.lower().split()[0]) for d, _, _ in soc):
        return 0.015  # cancer standard of care
    return 0.0


def survival_score(drug: str, evidence_level: str, gene: str, variant: str,
                   confidence: float = 0.7, cancer_type: str = "",
                   model_signal: Optional[float] = None) -> dict:
    """Deterministic, explainable survival-benefit score in [0,1] with breakdown.

    Returns {"score": float, "factors": {...}} so the reasoning is auditable.
    """
    band = SURVIVAL_BAND.get(evidence_level, 0.34)
    match = _match_tier(gene, variant, drug, cancer_type)

    # on-/off-label fit: does the cancer-aware recommendation agree with this drug?
    rec = recommend_therapy(gene, variant, cancer_type)
    rec_head = (rec.get("drug") or "").split()[0].lower()
    in_context = bool(rec_head) and (drug or "").split()[0].lower() == rec_head
    context = 0.04 if in_context else -0.06

    risk = str(fda_offline(drug).get("risk_level", "LOW")).upper()
    tox = _TOX_ADJ.get(risk, 0.0)

    # oncogenicity confidence (per-variant, continuous) keeps same-tier options distinct
    conf = (float(confidence if confidence is not None else 0.7) - 0.7) * 0.08

    # the PyTorch model stays in the loop as a small, per-drug affinity nudge
    model = 0.0 if model_signal is None else (float(model_signal) - 0.5) * 0.06

    # Smoothly squash the summed factors into ±0.085 (< half the 0.17 tier gap, so
    # options never cross evidence tiers). tanh is monotonic/injective, so distinct
    # factor totals stay DISTINCT — no saturation collapse the way a hard clamp had.
    raw = match + context + tox + conf + model
    adj = math.tanh(raw / 0.07) * 0.085
    score = round(max(0.05, min(0.98, band + adj)), 3)
    return {
        "score": score,
        "factors": {
            "evidence_band": band, "variant_match": round(match, 3),
            "on_label": in_context, "context_adj": context,
            "toxicity": risk, "toxicity_adj": tox,
            "confidence_adj": round(conf, 3), "model_adj": round(model, 3),
            "raw_adj": round(raw, 3),
        },
    }
