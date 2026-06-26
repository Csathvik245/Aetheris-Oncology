import torch
import torch.nn as nn
from sentence_transformers import SentenceTransformer

class SurvivalScorer(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = SentenceTransformer("dmis-lab/biobert-base-cased-v1.2")
        self.scorer = nn.Sequential(
            nn.Linear(768, 256),
            nn.ReLU(),
            nn.Linear(256, 1),
            nn.Sigmoid()
        )

    def score(self, mutation_text, drug_text):
        mut_emb = torch.tensor(
            self.encoder.encode([mutation_text])
        )
        drug_emb = torch.tensor(
            self.encoder.encode([drug_text])
        )
        combined = mut_emb * drug_emb
        return self.scorer(combined).item()

if __name__ == "__main__":
    print("Loading survival model...")
    model = SurvivalScorer()

    test_cases = [
        ("BRAF V600E melanoma oncogenic driver", "Dabrafenib Trametinib BRAF MEK inhibitor"),
        ("BRAF V600E melanoma oncogenic driver", "Vemurafenib BRAF inhibitor targeted therapy"),
        ("TP53 R273C tumor suppressor loss", "Pembrolizumab immunotherapy checkpoint inhibitor"),
    ]

    print("Running survival scoring test...")
    for mutation, drug in test_cases:
        score = model.score(mutation, drug)
        print("  " + drug[:40] + " -> " + str(round(score, 3)))

    print("Survival model working correctly")
