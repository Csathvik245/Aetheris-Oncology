/**
 * Reference catalog for the worksheet's drug search — real, FDA-approved
 * oncology drugs with their actual drug class, so residents can search and
 * add the clinically correct regimen for whatever case they're on (not
 * just the two drugs a case happened to preload).
 */
export interface CatalogDrug {
  name: string;
  subtitle: string;
}

export const DRUG_CATALOG: CatalogDrug[] = [
  // EGFR-targeted (NSCLC)
  { name: "Osimertinib", subtitle: "3rd Generation EGFR TKI" },
  { name: "Erlotinib", subtitle: "1st Generation EGFR TKI" },
  { name: "Gefitinib", subtitle: "1st Generation EGFR TKI" },
  { name: "Afatinib", subtitle: "2nd Generation EGFR TKI" },
  // ALK/ROS1
  { name: "Alectinib", subtitle: "ALK Inhibitor" },
  { name: "Crizotinib", subtitle: "ALK/ROS1 Inhibitor" },
  { name: "Lorlatinib", subtitle: "3rd Generation ALK Inhibitor" },
  // KRAS G12C
  { name: "Sotorasib", subtitle: "KRAS G12C Inhibitor" },
  { name: "Adagrasib", subtitle: "KRAS G12C Inhibitor" },
  // BRAF/MEK (melanoma)
  { name: "Dabrafenib", subtitle: "BRAF Inhibitor" },
  { name: "Trametinib", subtitle: "MEK Inhibitor" },
  { name: "Vemurafenib", subtitle: "BRAF Inhibitor" },
  { name: "Encorafenib", subtitle: "BRAF Inhibitor" },
  { name: "Binimetinib", subtitle: "MEK Inhibitor" },
  // Chemotherapy
  { name: "Pemetrexed", subtitle: "Antifolate Chemotherapy" },
  { name: "Carboplatin", subtitle: "Platinum Chemotherapy" },
  { name: "Cisplatin", subtitle: "Platinum Chemotherapy" },
  { name: "Paclitaxel", subtitle: "Taxane Chemotherapy" },
  { name: "Docetaxel", subtitle: "Taxane Chemotherapy" },
  { name: "Gemcitabine", subtitle: "Antimetabolite Chemotherapy" },
  { name: "5-Fluorouracil (5-FU)", subtitle: "Antimetabolite Chemotherapy" },
  { name: "Irinotecan", subtitle: "Topoisomerase I Inhibitor" },
  { name: "Oxaliplatin", subtitle: "Platinum Chemotherapy" },
  { name: "Doxorubicin", subtitle: "Anthracycline Chemotherapy" },
  { name: "Cyclophosphamide", subtitle: "Alkylating Agent" },
  // Hormone therapy (breast)
  { name: "Letrozole", subtitle: "Aromatase Inhibitor" },
  { name: "Anastrozole", subtitle: "Aromatase Inhibitor" },
  { name: "Exemestane", subtitle: "Aromatase Inhibitor" },
  { name: "Tamoxifen", subtitle: "Selective Estrogen Receptor Modulator" },
  { name: "Fulvestrant", subtitle: "Selective Estrogen Receptor Degrader" },
  // CDK4/6 inhibitors (breast)
  { name: "Palbociclib", subtitle: "CDK4/6 Inhibitor" },
  { name: "Ribociclib", subtitle: "CDK4/6 Inhibitor" },
  { name: "Abemaciclib", subtitle: "CDK4/6 Inhibitor" },
  // HER2-targeted (breast)
  { name: "Trastuzumab", subtitle: "Anti-HER2 Monoclonal Antibody" },
  { name: "Pertuzumab", subtitle: "Anti-HER2 Monoclonal Antibody" },
  { name: "Ado-trastuzumab emtansine (T-DM1)", subtitle: "HER2-Targeted Antibody-Drug Conjugate" },
  { name: "Trastuzumab deruxtecan", subtitle: "HER2-Targeted Antibody-Drug Conjugate" },
  // PARP inhibitors (BRCA)
  { name: "Olaparib", subtitle: "PARP Inhibitor" },
  { name: "Talazoparib", subtitle: "PARP Inhibitor" },
  { name: "Niraparib", subtitle: "PARP Inhibitor" },
  // Immunotherapy
  { name: "Pembrolizumab", subtitle: "Anti-PD-1 Checkpoint Inhibitor" },
  { name: "Nivolumab", subtitle: "Anti-PD-1 Checkpoint Inhibitor" },
  { name: "Ipilimumab", subtitle: "Anti-CTLA-4 Checkpoint Inhibitor" },
  { name: "Atezolizumab", subtitle: "Anti-PD-L1 Checkpoint Inhibitor" },
  { name: "Durvalumab", subtitle: "Anti-PD-L1 Checkpoint Inhibitor" },
  // Angiogenesis / RCC / renal
  { name: "Bevacizumab", subtitle: "Anti-VEGF Monoclonal Antibody" },
  { name: "Sunitinib", subtitle: "Multi-Target TKI" },
  { name: "Pazopanib", subtitle: "Multi-Target TKI" },
  { name: "Cabozantinib", subtitle: "Multi-Target TKI" },
  { name: "Axitinib", subtitle: "VEGFR TKI" },
  // Hematologic
  { name: "Rituximab", subtitle: "Anti-CD20 Monoclonal Antibody" },
  { name: "Midostaurin", subtitle: "FLT3 Inhibitor" },
  { name: "Gilteritinib", subtitle: "FLT3 Inhibitor" },
  { name: "Venetoclax", subtitle: "BCL-2 Inhibitor" },
  { name: "Azacitidine", subtitle: "Hypomethylating Agent" },
];

export function searchDrugCatalog(query: string, limit = 8): CatalogDrug[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return DRUG_CATALOG.filter(
    (d) => d.name.toLowerCase().includes(q) || d.subtitle.toLowerCase().includes(q)
  ).slice(0, limit);
}
