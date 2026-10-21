from __future__ import annotations

from pathlib import Path
import sys
import time
import requests

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.storage import StorageContext
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.llms.ollama import Ollama
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb

DATA_DIR = Path("data")
PERSIST_DIR = Path("chroma_db")
COLLECTION = "local_docs"
OLLAMA_BASE_URL = "http://localhost:11434"


def check_model_available(model_name: str, max_retries: int = 3, retry_delay: int = 5) -> bool:
    """
    Check if a model is available in Ollama, with retry logic for downloading models.
    
    Args:
        model_name: Name of the model to check
        max_retries: Maximum number of retry attempts
        retry_delay: Seconds to wait between retries
        
    Returns:
        True if model is available, False otherwise
    """
    for attempt in range(max_retries):
        try:
            response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=10)
            if response.status_code == 200:
                models = response.json().get("models", [])
                available_models = [m.get("name", "").split(":")[0] for m in models]
                
                if model_name in available_models or any(model_name in m for m in available_models):
                    return True
                    
                if attempt < max_retries - 1:
                    print(f"Model '{model_name}' not ready yet. Waiting {retry_delay}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                else:
                    print(f"\n❌ Model '{model_name}' is not available.")
                    print(f"Please run: ollama pull {model_name}")
                    return False
            else:
                print(f"Warning: Could not connect to Ollama API (status {response.status_code})")
                return False
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to Ollama at {OLLAMA_BASE_URL}")
            print("Please ensure Ollama is running: ollama serve")
            return False
        except Exception as e:
            print(f"Error checking model availability: {e}")
            return False
    
    return False


def main() -> int:
    if not DATA_DIR.exists():
        print(f"Data directory not found: {DATA_DIR}")
        return 1

    # Check if required models are available
    print("Checking model availability...")
    llm_model = "qwen:7b"
    embed_model_name = "nomic-embed-text"
    
    if not check_model_available(llm_model):
        return 1
    
    if not check_model_available(embed_model_name):
        return 1
    
    print("✓ All models are available\n")

    # LLM + embeddings via Ollama
    try:
        llm = Ollama(model=llm_model, request_timeout=120.0)
        embed_model = OllamaEmbedding(model_name=embed_model_name)
    except Exception as e:
        print(f"❌ Error initializing models: {e}")
        return 1

    # Load documents (PDF, md, txt, rmd, etc.)
    print("Loading documents...")
    try:
        docs = SimpleDirectoryReader(
            input_dir=str(DATA_DIR),
            recursive=True,
            required_exts=[".pdf", ".md", ".rmd", ".r", ".txt"],
        ).load_data()
    except Exception as e:
        print(f"❌ Error loading documents: {e}")
        return 1

    if not docs:
        print("No documents found in ./data. Add files and try again.")
        return 1
    
    print(f"✓ Loaded {len(docs)} document(s)\n")

    # Vector store
    print("Initializing vector store and creating embeddings...")
    try:
        client = chromadb.PersistentClient(path=str(PERSIST_DIR))
        chroma_collection = client.get_or_create_collection(COLLECTION)
        vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

        storage_context = StorageContext.from_defaults(vector_store=vector_store)

        index = VectorStoreIndex.from_documents(
            docs,
            storage_context=storage_context,
            embed_model=embed_model,
        )
        print("✓ Index created successfully\n")
    except Exception as e:
        print(f"❌ Error creating vector index: {e}")
        print("This might happen if the embedding model is not fully ready.")
        return 1

    query_engine = index.as_query_engine(
        llm=llm,
        similarity_top_k=5,
    )

    print("Ready. Ask a question (type 'exit' to quit):")
    while True:
        q = input("> ").strip()
        if not q or q.lower() in {"exit", "quit"}:
            break
        resp = query_engine.query(q)
        print(resp)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
