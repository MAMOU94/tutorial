from __future__ import annotations

from pathlib import Path
import json
import time
import requests
from typing import Optional, List
import logging
from urllib.parse import urlparse

# Suppress verbose HTTP request logs
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("llama_index").setLevel(logging.WARNING)


from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings, Document
from llama_index.core.storage import StorageContext
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.llms.ollama import Ollama
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb

DATA_DIR = Path("data")
PERSIST_DIR = Path("chroma_db")
COLLECTION = "local_docs"
DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434"
CURRENT_OLLAMA_BASE_URL = DEFAULT_OLLAMA_BASE_URL
SUPPORTED_EXTENSIONS = {".pdf", ".md", ".rmd", ".r", ".txt", ".json", ".jsonl"}
EXCLUDED_PATH_FRAGMENTS = (
    "/node_modules/",
    "/dist/",
    "/build/",
    "/.git/",
    "/appimage-build/",
    "/chroma_db/",
)

NEURAL_PROMPT_FORMAT = "{}"

CHAT_SYSTEM_PROMPT = None
STRICT_FILE_ONLY_FALLBACK = "I don't know based on the provided files."



def _is_local_ollama_base(base_url: str) -> bool:
    try:
        parsed = urlparse(str(base_url or DEFAULT_OLLAMA_BASE_URL))
        hostname = parsed.hostname.lower()
        if hostname in ("localhost", "127.0.0.1", "::1"):
            return True
        if hostname.startswith('192.168.') or hostname.startswith('10.') or hostname.endswith('.local'):
            return True
        import re
        if re.match(r'^172\.(1[6-9]|2[0-9]|3[0-1])\.', hostname):
            return True
        return False
    except Exception:
        return True


def _build_ollama_headers(base_url: str, api_key: Optional[str]) -> dict:
    token = str(api_key or "").strip()
    if token and not _is_local_ollama_base(base_url):
        return {"Authorization": f"Bearer {token}"}
    return {}


def check_model_available(
    model_name: str,
    base_url: str = CURRENT_OLLAMA_BASE_URL,
    api_key: Optional[str] = None,
    max_retries: int = 3,
    retry_delay: int = 5,
) -> bool:
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
            normalized_base = str(base_url or DEFAULT_OLLAMA_BASE_URL).rstrip("/")
            headers = _build_ollama_headers(normalized_base, api_key)
            
            # If it's a cloud service, /api/tags might not exist. 
            # We try it, but if it fails with 404 or 401, we might assume it's just a different API type.
            response = requests.get(
                f"{normalized_base}/api/tags",
                timeout=10,
                headers=headers or None,
            )
            
            if response.status_code == 200:
                models = response.json().get("models", [])
                all_model_names = [m.get("name", "") for m in models]
                base_names = [name.split(":")[0] for name in all_model_names]
                
                if model_name in all_model_names or model_name in base_names:
                    return True
                    
                # Check for partial match if specific tag not found
                if any(model_name in m for m in all_model_names):
                    return True
                    
                if attempt < max_retries - 1:
                    print(f"Model '{model_name}' not ready yet. Waiting {retry_delay}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                else:
                    print(f"\n❌ Model '{model_name}' is not available.")
                    print(f"Please run: ollama pull {model_name}")
                    return False
            elif response.status_code in (401, 403, 404) and not _is_local_ollama_base(base_url):
                # If cloud and tags fail, we assume model name is probably valid and just continue.
                print(f"Warning: Could not fetch tags from cloud endpoint (status {response.status_code}). Assuming model '{model_name}' exists.")
                return True
            else:
                print(f"Warning: Could not connect to Ollama API (status {response.status_code})")
                if _is_local_ollama_base(base_url):
                    return False
                return True # Optimistic for cloud
                
        except requests.exceptions.ConnectionError:
            if _is_local_ollama_base(base_url):
                print(f"❌ Cannot connect to Ollama at {base_url}")
                return False
            print(f"Warning: Connection error to cloud AI. Optimistically assuming model exists.")
            return True
        except Exception as e:
            print(f"Error checking model availability: {e}")
            return not _is_local_ollama_base(base_url)
    
    return not _is_local_ollama_base(base_url)


class DocumentAgent:
    """AI agent for querying documents using LlamaIndex and Ollama."""
    
    def __init__(
        self,
        llm_model: str = "r-wrapper-corrector",
        embed_model_name: str = "nomic-embed-text",
        data_dir: Path = DATA_DIR,
        persist_dir: Path = PERSIST_DIR,
        collection_name: str = COLLECTION,
        base_url: str = CURRENT_OLLAMA_BASE_URL,
        api_key: Optional[str] = None,
    ):
        self.llm_model = llm_model
        self.embed_model_name = embed_model_name
        self.data_dir = Path(data_dir)
        self.persist_dir = Path(persist_dir)
        self.collection_name = collection_name
        self.base_url = base_url
        self.api_key = api_key
        
        self.llm: Optional[Ollama] = None
        self.embed_model: Optional[OllamaEmbedding] = None
        self.index: Optional[VectorStoreIndex] = None
        self.query_engine = None
        self.loaded_documents: List[str] = []
        self.conversation_history: List[dict] = []  # Track conversation for memory

    def _is_excluded_path(self, file_path: Path) -> bool:
        try:
            relative = file_path.resolve().relative_to(self.data_dir.resolve())
            normalized = f"/{str(relative).replace('\\', '/')}/".lower()
        except Exception:
            normalized = f"/{str(file_path).replace('\\', '/')}/".lower()
        return any(fragment in normalized for fragment in EXCLUDED_PATH_FRAGMENTS)

    def _collect_candidate_files(self, file_paths: Optional[List[Path]] = None) -> List[Path]:
        if file_paths:
            candidates = [Path(path) for path in file_paths]
        else:
            candidates = [entry for entry in self.data_dir.rglob("*") if entry.is_file()]

        valid = []
        for candidate in candidates:
            if candidate.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue
            if self._is_excluded_path(candidate):
                continue
            valid.append(candidate)

        deduped = []
        seen = set()
        for candidate in sorted(valid, key=lambda item: str(item)):
            key = str(candidate.resolve())
            if key in seen:
                continue
            seen.add(key)
            deduped.append(candidate)
        return deduped

    def _load_json_document(self, file_path: Path) -> List[Document]:
        raw = file_path.read_text(encoding="utf-8", errors="replace")
        normalized = str(raw or "").replace("\u0000", "").replace("\r\n", "\n")
        suffix = file_path.suffix.lower()

        if suffix == ".jsonl":
            rendered_lines = []
            for line_number, line in enumerate(normalized.splitlines(), start=1):
                stripped = line.strip()
                if not stripped:
                    continue
                try:
                    parsed_line = json.loads(stripped)
                    rendered = json.dumps(parsed_line, ensure_ascii=False)
                except json.JSONDecodeError:
                    rendered = stripped
                rendered_lines.append(f"{line_number}: {rendered}")
            body = "\n".join(rendered_lines) if rendered_lines else normalized
        else:
            try:
                parsed = json.loads(normalized)
                body = json.dumps(parsed, indent=2, ensure_ascii=False)
            except json.JSONDecodeError:
                body = normalized

        text = f"File: {file_path.name}\nType: {suffix[1:].upper()}\n\n{body}".strip()
        return [
            Document(
                text=text,
                metadata={
                    "file_path": str(file_path),
                    "file_name": file_path.name,
                    "file_type": "json",
                },
            )
        ]

    def _load_pdf_document(self, file_path: Path) -> Optional[List[Document]]:
        try:
            from pypdf import PdfReader
        except Exception:
            return None

        try:
            reader = PdfReader(str(file_path))
            pages = []
            for page_number, page in enumerate(reader.pages, start=1):
                page_text = str(page.extract_text() or "").strip()
                if page_text:
                    pages.append(f"[Page {page_number}]\n{page_text}")
            if not pages:
                return []
            return [
                Document(
                    text="\n\n".join(pages),
                    metadata={
                        "file_path": str(file_path),
                        "file_name": file_path.name,
                        "file_type": "pdf",
                    },
                )
            ]
        except Exception as error:
            print(f"Warning: PDF extraction failed for {file_path}: {error}")
            return None

    def _load_file_documents(self, file_path: Path) -> List[Document]:
        suffix = file_path.suffix.lower()
        if suffix in {".json", ".jsonl"}:
            return self._load_json_document(file_path)

        if suffix == ".pdf":
            pdf_docs = self._load_pdf_document(file_path)
            if pdf_docs is not None:
                return pdf_docs

        return SimpleDirectoryReader(input_files=[str(file_path)]).load_data()

    @staticmethod
    def _is_unreadable_context(text: str) -> bool:
        """Detect binary/PDF-object gibberish or otherwise unreadable retrieval chunks."""
        candidate = str(text or "").strip()
        if not candidate:
            return True

        sample = candidate[:5000]
        if not sample:
            return True

        printable = sum(1 for ch in sample if ch.isprintable() or ch in "\n\r\t")
        printable_ratio = printable / max(len(sample), 1)
        if printable_ratio < 0.86:
            return True

        lowered = sample.lower()
        pdf_markers = [
            "%pdf-",
            " endobj",
            " xref",
            " trailer",
            "stream\n",
            " obj\n<<",
            "/type /page",
        ]
        marker_hits = sum(1 for marker in pdf_markers if marker in lowered)
        if marker_hits >= 3:
            return True

        long_hex_runs = 0
        for token in sample.split():
            if len(token) >= 32 and all(ch in "0123456789abcdefABCDEF" for ch in token):
                long_hex_runs += 1
                if long_hex_runs >= 4:
                    return True

        return False

    def _extract_readable_context(self, retrieved_nodes) -> str:
        """Convert retrieved nodes into clean readable context for prompting."""
        chunks: List[str] = []
        seen = set()

        for node in retrieved_nodes or []:
            raw_node = getattr(node, "node", node)
            text = str(getattr(raw_node, "text", "") or "").strip()
            if not text or self._is_unreadable_context(text):
                continue

            metadata = getattr(raw_node, "metadata", {}) or {}
            source_name = (
                str(metadata.get("file_name") or "").strip()
                or Path(str(metadata.get("file_path") or "")).name
                or "unknown"
            )

            normalized_key = " ".join(text.split())[:400]
            if normalized_key in seen:
                continue
            seen.add(normalized_key)
            chunks.append(f"[Source: {source_name}]\n{text}")

        return "\n\n".join(chunks[:5]).strip()

    def _build_query_prompt(self, question: str, context_str: str, history_text: str, strict_files_only: bool) -> str:
        if strict_files_only:
            return f"""You are a file-grounded assistant.
Use ONLY the information present in CONTEXT from provided workspace files.
Do NOT use outside knowledge, prior training knowledge, or assumptions.
If CONTEXT does not contain the needed answer, reply exactly: "{STRICT_FILE_ONLY_FALLBACK}"

--- CONTEXT (Project Documents) ---
{context_str or "No relevant documents found."}
---

{history_text}
User: {question}
Assistant:"""

        return f"""You are a professional assistant. Answer the user's question using ONLY the provided context from the workspace documents.
If the answer is not in the context, say that clearly.

--- CONTEXT (Project Documents) ---
{context_str or "No relevant documents found."}
---

{history_text}
User: {question}
Assistant:"""
        
    def check_models(self) -> bool:
        """Check if required models are available."""
        print("Checking model availability...")
        
        if not check_model_available(self.llm_model, base_url=self.base_url, api_key=self.api_key):
            return False
        
        if not check_model_available(self.embed_model_name, base_url=self.base_url, api_key=self.api_key):
            return False
        
        print("✓ All models are available\n")
        return True
    
    def initialize_models(self) -> bool:
        """Initialize LLM and embedding models."""
        try:
            headers = _build_ollama_headers(self.base_url, self.api_key)
            self.llm = Ollama(
                model=self.llm_model,
                base_url=self.base_url,
                request_timeout=120.0,
                headers=headers or None,
                system_prompt=None, # Native mode: No system instructions
            )
            self.embed_model = OllamaEmbedding(
                model_name=self.embed_model_name,
                base_url=self.base_url,
                client_kwargs={"headers": headers} if headers else None,
            )
            
            # RAG Skills: Configure global settings for chunking and models
            Settings.llm = self.llm
            Settings.embed_model = self.embed_model
            Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=50)
            
            return True
        except Exception as e:
            print(f"❌ Error initializing models: {e}")
            return False
    
    def load_documents(self, file_paths: Optional[List[Path]] = None) -> bool:
        """
        Load documents from data directory or specific file paths.
        
        Args:
            file_paths: Optional list of specific file paths to load.
                       If None, loads all documents from data_dir.
        
        Returns:
            True if documents loaded successfully, False otherwise
        """
        print("Loading documents...")
        
        if not self.data_dir.exists():
            print(f"❌ Data directory not found: {self.data_dir}")
            return False
        
        try:
            print(f"Scanning directory: {self.data_dir}")
            candidate_files = self._collect_candidate_files(file_paths=file_paths)
            docs = []
            self.loaded_documents = []

            for file_path in candidate_files:
                try:
                    file_docs = self._load_file_documents(file_path)
                    if not file_docs:
                        print(f"Warning: No readable text extracted from {file_path.name}. Skipping.")
                        continue
                    docs.extend(file_docs)
                    self.loaded_documents.append(str(file_path))
                except Exception as file_error:
                    print(f"Warning: Failed to load {file_path}: {file_error}")

            self.loaded_documents = sorted(set(self.loaded_documents))
            print(f"Files found: {len(self.loaded_documents)}")
            for loaded_path in self.loaded_documents[:10]:
                print(f"  - {loaded_path}")
            if len(self.loaded_documents) > 10:
                print(f"  ... and {len(self.loaded_documents) - 10} more")
        
        except Exception as e:
            print(f"❌ Error loading documents: {e}")
            return False

        if not docs:
            print("No documents found. Add files and try again.")
            return False
        
        print(f"✓ Loaded {len(docs)} document(s)\n")
        
        # Create vector store and index
        print("Initializing vector store...")
        try:
            self.persist_dir.mkdir(parents=True, exist_ok=True)
            client = chromadb.PersistentClient(path=str(self.persist_dir))
            try:
                client.delete_collection(self.collection_name)
                print("Cleared previous vector collection to match current data folder.")
            except Exception:
                pass

            chroma_collection = client.get_or_create_collection(self.collection_name)
            vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
            storage_context = StorageContext.from_defaults(vector_store=vector_store)

            print("Creating embeddings from current files...")
            self.index = VectorStoreIndex.from_documents(
                docs,
                storage_context=storage_context,
                embed_model=self.embed_model,
            )
            print("✓ Index ready\n")
        except Exception as e:
            print(f"❌ Error creating vector index: {e}")
            print("This might happen if the embedding model is not fully ready.")
            return False
        
        # Create query engine for document retrieval (re-used for context)
        # RAG Skills: Increase top_k for better context coverage in complex PDFs
        self.retriever = self.index.as_retriever(
            similarity_top_k=5
        )
        self.query_engine = self.index.as_query_engine(
            llm=self.llm,
            similarity_top_k=5,
            response_mode="compact",
        )
        
        return True
    
    def query(self, question: str, strict_files_only: bool = False) -> str:
        """
        Query the document agent with conversation memory for context-aware responses.
        
        Args:
            question: The question to ask
            
        Returns:
            The answer as a string
        """
        if not self.query_engine:
            return "❌ Agent not initialized. Please load documents first."
        
        try:
            # 1. Retrieve relevant context (Transparent but guided)
            context_str = ""
            try:
                retrieved_nodes = self.retriever.retrieve(question)
                if retrieved_nodes:
                    context_str = self._extract_readable_context(retrieved_nodes)
                    if context_str:
                        print(f"✓ AI is browsing files... (Found {len(retrieved_nodes)} relevant snippets)")
                    else:
                        print("  (Retrieved snippets were unreadable/binary-like and were filtered out)")
                else:
                    print("  (No direct documentation matches found for this query)")
            except Exception as e:
                print(f"Warning: Context retrieval failed: {e}")

            # 2. Build a file-grounded prompt. In strict mode we hard-fail when no
            # retrievable context exists so the model cannot fall back to prior knowledge.
            
            history_text = ""
            if self.conversation_history:
                history_text = "\n".join([f"User: {h['q']}\nAssistant: {h['a']}" for h in self.conversation_history[-5:]])
            
            if strict_files_only and not context_str:
                answer = STRICT_FILE_ONLY_FALLBACK
                self.conversation_history.append({"q": question, "a": answer})
                if len(self.conversation_history) > 15:
                    self.conversation_history = self.conversation_history[-15:]
                return answer

            final_prompt = self._build_query_prompt(question, context_str, history_text, strict_files_only)
            
            # send to model
            response = self.llm.complete(final_prompt)
            answer = str(response)
            
            # Store history
            self.conversation_history.append({"q": question, "a": answer})
            if len(self.conversation_history) > 15:
                self.conversation_history = self.conversation_history[-15:]
            
            return answer
        except Exception as e:
            return f"❌ Error querying: {e}"

    def query_stream(self, question: str, strict_files_only: bool = False):
        """
        Stream the query response for real-time feedback.
        """
        if not self.query_engine:
             yield "❌ Agent not initialized. Please load documents first."
             return

        try:
            # 1. Retrieve context
            context_str = ""
            try:
                retrieved_nodes = self.retriever.retrieve(question)
                if retrieved_nodes:
                    context_str = self._extract_readable_context(retrieved_nodes)
                    if context_str:
                        print(f"✓ AI is browsing files... (Found {len(retrieved_nodes)} relevant snippets)")
                    else:
                        print("  (Retrieved snippets were unreadable/binary-like and were filtered out)")
            except Exception as e:
                print(f"Warning: Context retrieval failed: {e}")

            # RAG Skills: Focused Prompt Template (Streaming)
            history_text = ""
            if self.conversation_history:
                history_text = "\n".join([f"User: {h['q']}\nAssistant: {h['a']}" for h in self.conversation_history[-5:]])
            
            if strict_files_only and not context_str:
                answer = STRICT_FILE_ONLY_FALLBACK
                self.conversation_history.append({"q": question, "a": answer})
                if len(self.conversation_history) > 15:
                    self.conversation_history = self.conversation_history[-15:]
                yield answer
                return

            final_prompt = self._build_query_prompt(question, context_str, history_text, strict_files_only)

            # 4. Stream from model
            response_gen = self.llm.stream_complete(final_prompt)
            
            full_answer = ""
            for chunk in response_gen:
                full_answer += chunk.delta
                yield chunk.delta
            
            # Store history
            self.conversation_history.append({"q": question, "a": full_answer})
            if len(self.conversation_history) > 15:
                self.conversation_history = self.conversation_history[-15:]

        except Exception as e:
            yield f"❌ Stream error: {e}"

    
    def clear_history(self):
        """Clear conversation memory."""
        self.conversation_history = []
    
    def fix_code_error(self, error_message: str, code_context: str = "") -> dict:
        """
        Analyze an R code error and suggest a fix.
        
        Args:
            error_message: The error message from R
            code_context: Optional code snippet where error occurred
            
        Returns:
            dict with 'diagnosis', 'fix', and 'explanation'
        """
        if not self.query_engine:
            return {
                "diagnosis": "Agent not initialized",
                "fix": "",
                "explanation": "Please initialize the agent first"
            }
        
        
        try:
            # Build detailed query for code fixing
            code_part = ""
            if code_context:
                code_part = f"Code context:\n{code_context}\n\n"
            
            query = "I have an R code error. Please analyze it and suggest a fix.\n\n"
            query += f"Error message:\n{error_message}\n\n"
            query += code_part
            query += "Please provide:\n"
            query += "1. Diagnosis: What caused this error?\n"
            query += "2. Fix: The corrected code\n"
            query += "3. Explanation: Why this fix works\n\n"
            query += "Format your response clearly with these three sections."
            
            # Special prompt engineering for the Neural R Assistant
            if self.llm_model == "r-assistant-neural":
                # We wrap the fix-it request in the neural prompt format
                final_prompt = NEURAL_PROMPT_FORMAT.format("R Error Diagnosis and Fix", query)
            else:
                final_prompt = query
                
            response = self.query_engine.query(final_prompt)
            answer = str(response)
            
            # Try to parse the response into structured format
            diagnosis = ""
            fix = ""
            explanation = ""
            
            # Simple parsing (can be improved)
            if "Diagnosis:" in answer or "diagnosis:" in answer.lower():
                parts = answer.split("Fix:", 1)
                if len(parts) == 2:
                    diagnosis = parts[0].replace("Diagnosis:", "").replace("diagnosis:", "").strip()
                    remaining = parts[1]
                    fix_parts = remaining.split("Explanation:", 1)
                    if len(fix_parts) == 2:
                        fix = fix_parts[0].strip()
                        explanation = fix_parts[1].strip()
                    else:
                        fix = remaining.strip()
            else:
                # If not structured, return full answer as explanation
                explanation = answer
            
            return {
                "diagnosis": diagnosis or "See explanation",
                "fix": fix,
                "explanation": explanation or answer
            }
        except Exception as e:
            return {
                "diagnosis": "Error analyzing code",
                "fix": "",
                "explanation": f"Failed to analyze: {str(e)}"
            }
    
    def get_loaded_documents(self) -> List[str]:
        """Get list of loaded document paths."""
        return self.loaded_documents
    
    def initialize(self, data_dir: Optional[str] = None, persist_dir: Optional[str] = None) -> bool:
        """
        Full initialization: check models, initialize them, and load documents.
        
        Returns:
            True if successful, False otherwise
        """
        if data_dir:
            self.data_dir = Path(data_dir)
        if persist_dir:
            self.persist_dir = Path(persist_dir)

        if not self.check_models():
            return False
        
        if not self.initialize_models():
            return False
        
        if not self.load_documents():
            return False
        
        return True

    def reset_index(self):
        """Clear the vector store and loaded documents."""
        print("Resetting index...")
        try:
            # Clear memory
            self.loaded_documents = []
            self.index = None
            self.query_engine = None
            
            # Clear persistence
            client = chromadb.PersistentClient(path=str(self.persist_dir))
            try:
                client.delete_collection(self.collection_name)
            except ValueError:
                pass # Collection might not exist
            
            print("✓ Index reset successfully")
            return True
        except Exception as e:
            print(f"❌ Error resetting index: {e}")
            return False

    def load_single_document(self, file_path: str) -> bool:
        """
        Reset index and load a single document.
        
        Args:
            file_path: Relative path to the file from data_dir
        """
        if not self.reset_index():
            return False
            
        full_path = self.data_dir / file_path
        if not full_path.exists():
            print(f"❌ File not found: {full_path}")
            return False
            
        return self.load_documents(file_paths=[full_path])

    def get_copilot_completion(self, context: str, prompt_index: int = 1) -> str:
        """
        Specialized RAG-enhanced completion for the R Console Copilot.
        Acts like a 'cheater at the exam' by strictly following R4DS logic.
        """
        if not self.query_engine:
            return "" # Fallback to standard model
            
        try:
            # Multi-turn branching logic
            if prompt_index == 1:
                system_instr = "You are a senior R developer. Provide ONLY the necessary R code implementation. No logic summaries, no explanations, no markdown."
                query = f"Provide code for:\n{context}\n\nCode:"
            else:
                system_instr = "STRICT CONTINUATION MODE: You are exactly where you left off. Continue with the PREVIOUS code. NO markdown, NO logic, NO explanation. Output ONLY the raw R code snippet that naturally follows."
                query = f"Continue exactly from here:\n\n{context}\n\nContinuation:"

            # Combining context with instructions
            prompt = f"{system_instr}\n\n{query}"
            
            # Use lower temperature and deterministic options for completion
            response = self.query_engine.query(prompt)
            answer = str(response).strip()
            
            # Clean up formatting if any
            answer = answer.replace("```r", "").replace("```", "").replace("### CODE", "").strip()
            return answer
        except Exception:
            return ""
