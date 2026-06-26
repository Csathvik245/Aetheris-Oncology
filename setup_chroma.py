import requests
import chromadb
from sentence_transformers import SentenceTransformer

def fetch_pubmed(query, max_results=200):
    search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    fetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
    search = requests.get(search_url, params={
        "db": "pubmed", "term": query,
        "retmax": max_results, "retmode": "json"
    }).json()
    ids = search["esearchresult"]["idlist"]
    print("Found " + str(len(ids)) + " papers")
    fetch = requests.get(fetch_url, params={
        "db": "pubmed", "id": ",".join(ids),
        "rettype": "abstract", "retmode": "text"
    })
    return fetch.text, ids

print("Downloading PubMed abstracts...")
text, ids = fetch_pubmed("BRAF melanoma targeted therapy cancer treatment mutations")

print("Raw text length: " + str(len(text)))

abstracts = [a.strip() for a in text.split("\n\n") if len(a.strip()) > 30]
print("Abstracts found: " + str(len(abstracts)))

if len(abstracts) == 0:
    print("ERROR: No abstracts parsed. Raw text sample:")
    print(text[:500])
else:
    print("Loading embedding model...")
    model = SentenceTransformer("dmis-lab/biobert-base-cased-v1.2")

    print("Embedding abstracts...")
    embeddings = model.encode(abstracts, show_progress_bar=True)
    print("Embedding shape: " + str(embeddings.shape))

    client = chromadb.PersistentClient(path="./chromadb_store")
    collection = client.get_or_create_collection("pubmed_cancer")

    collection.add(
        documents=abstracts,
        embeddings=embeddings.tolist(),
        ids=["doc_" + str(i) for i in range(len(abstracts))]
    )
    print("SUCCESS: Stored " + str(len(abstracts)) + " abstracts in ChromaDB")
