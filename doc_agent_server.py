#!/usr/bin/env python3
"""
Document Agent Server for Electron Integration

This script wraps the DocumentAgent class to provide JSON-based communication
via stdin/stdout for integration with Electron's IPC system.

Commands (JSON via stdin):
- {"command": "initialize"} - Initialize the agent
- {"command": "query", "question": "..."} - Query the agent
- {"command": "status"} - Get agent status
- {"command": "list_documents"} - List loaded documents

Responses (JSON via stdout):
- {"type": "status", "status": "...", "message": "..."}
- {"type": "response", "answer": "..."}
- {"type": "error", "error": "..."}
- {"type": "documents", "documents": [...]}
"""

import sys
import json
from pathlib import Path

# Ensure bundled runtime site-packages are importable when system Python lacks deps.
def _bootstrap_python_paths():
    script_dir = Path(__file__).resolve().parent
    lib_root = script_dir / "appimage-build" / "runtime" / "python" / "lib"
    candidates = []

    # 1. Include the local 'lib' folder if it exists (Priority for user-installed system deps)
    # Check both current dir and 'AI agent/lib' relative to main.js root
    local_lib = script_dir / "lib"
    if local_lib.exists():
        candidates.append(local_lib)
    
    # Also check if we are in the root and 'AI agent/lib' exists
    alt_local_lib = script_dir / "AI agent" / "lib"
    if alt_local_lib.exists():
        candidates.append(alt_local_lib)

    # 2. Include bundled site-packages matching current minor version
    py_version_dir = lib_root / f"python{sys.version_info.major}.{sys.version_info.minor}" / "site-packages"
    candidates.append(py_version_dir)

    for candidate in candidates:
        if candidate.exists():
            path_str = str(candidate)
            if path_str not in sys.path:
                sys.path.insert(0, path_str)


_bootstrap_python_paths()

# Add AI agent directory to path
sys.path.insert(0, str(Path(__file__).parent / "AI agent"))

from agent_core import DocumentAgent

# Global agent instance
agent = None
agent_status = "idle"  # idle, initializing, ready, error


def send_response(response_type, **data):
    """Send JSON response to stdout."""
    response = {"type": response_type, **data}
    print(json.dumps(response), flush=True)


def handle_initialize(model_name=None, base_url=None, api_key=None, data_dir=None, persist_dir=None):
    """Initialize the document agent."""
    global agent, agent_status
    
    try:
        agent_status = "initializing"
        send_response("status", status="initializing", message="Initializing document agent...")
        
        # Determine paths
        script_dir = Path(__file__).parent
        final_data_dir = Path(data_dir) if data_dir else (script_dir / "AI agent" / "data")
        final_persist_dir = Path(persist_dir) if persist_dir else (script_dir / "AI agent" / "chroma_db")
        
        kwargs = {
            "data_dir": final_data_dir,
            "persist_dir": final_persist_dir
        }
        
        if model_name:
            kwargs["llm_model"] = model_name
        if base_url:
            kwargs["base_url"] = base_url
        if api_key:
            kwargs["api_key"] = api_key

        agent = DocumentAgent(**kwargs)
        
        # Reset history for new context
        agent.clear_history()
        
        # Check models
        send_response("status", status="initializing", message="Checking Ollama models...")
        if not agent.check_models():
            agent_status = "error"
            send_response("error", error="Required Ollama models not available. Please run the 'ollama create' command provided in the guide.")
            return
        
        # Initialize models
        send_response("status", status="initializing", message="Initializing AI models...")
        if not agent.initialize_models():
            agent_status = "error"
            send_response("error", error="Failed to initialize AI models")
            return
        
        # Load documents
        send_response("status", status="initializing", message="Loading documents and creating embeddings...")
        if not agent.load_documents():
            agent_status = "error"
            send_response("error", error="Failed to load documents. Make sure documents exist in AI agent/data/ folder")
            return
        
        # Log indexing results
        docs = agent.get_loaded_documents()
        node_count = 0
        if agent.index:
            try:
                # Attempt to get node count if index exists
                node_count = agent.index.vector_store.collection.count()
            except:
                pass
        
        print(f"[AgentData] Indexing complete. Documents: {len(docs)}, Vectors/Nodes: {node_count}")
        
        agent_status = "ready"
        docs = agent.get_loaded_documents()
        doc_names = [Path(d).name for d in docs]
        
        send_response("status", 
                     status="ready", 
                     message=f"Agent initialized successfully! Loaded {len(docs)} document(s)",
                     documents=doc_names)
        
    except Exception as e:
        agent_status = "error"
        send_response("error", error=f"Initialization failed: {str(e)}")


def handle_reload():
    """Reload documents."""
    global agent, agent_status
    
    if agent_status != "ready" or not agent:
        send_response("error", error="Agent not initialized. Please initialize first.")
        return

    try:
        if agent.load_documents():
            docs = agent.get_loaded_documents()
            doc_names = [Path(d).name for d in docs]
            send_response("status", 
                         status="ready", 
                         message=f"Documents reloaded! Total: {len(docs)}",
                         documents=doc_names)
        else:
            send_response("error", error="Failed to reload documents")
    except Exception as e:
        send_response("error", error=f"Reload failed: {str(e)}")


def handle_load_analysis_only():
    """Load ONLY the latest analysis result, clearing everything else."""
    global agent, agent_status
    
    if agent_status != "ready" or not agent:
        send_response("error", error="Agent not initialized. Please initialize first.")
        return

    try:
        # We assume the file is named 'detailed_report.txt' in the data folder
        target_file = "detailed_report.txt"
        
        # We need to verify if the file exists first? 
        # load_single_document checks existence relative to data_dir
        
        if agent.load_single_document(target_file):
             docs = agent.get_loaded_documents()
             doc_names = [Path(d).name for d in docs]
             send_response("status", 
                          status="ready", 
                          message=f"Context restricted to Analysis Report. Total docs: {len(docs)}",
                          documents=doc_names)
        else:
             send_response("error", error="Failed to load analysis report")
             
    except Exception as e:
        send_response("error", error=f"Context restriction failed: {str(e)}")



def handle_query(question, stream=False, strict_files_only=False):
    """Query the document agent."""
    global agent, agent_status
    
    if agent_status != "ready" or not agent:
        send_response("error", error="Agent not initialized. Please initialize first.")
        return
    
    try:
        if stream:
            send_response("status", status="processing", message="Streaming response...")
            full_answer = ""
            for chunk in agent.query_stream(question, strict_files_only=strict_files_only):
                send_response("response_chunk", chunk=chunk)
                full_answer += chunk
            send_response("response_done", answer=full_answer)
        else:
            send_response("status", status="processing", message="Processing query...")
            answer = agent.query(question, strict_files_only=strict_files_only)
            send_response("response", answer=answer)
            
        # Return to ready status after query completes
        agent_status = "ready"
        send_response("status", status="ready", message="Ready for next question")
    except Exception as e:
        agent_status = "ready"  # Still ready even if query fails
        send_response("error", error=f"Query failed: {str(e)}")


def handle_status():
    """Get current agent status."""
    global agent, agent_status
    
    docs = []
    if agent and agent_status == "ready":
        docs = [Path(d).name for d in agent.get_loaded_documents()]
    
    send_response("status", 
                 status=agent_status,
                 message=f"Agent is {agent_status}",
                 documents=docs)


def handle_list_documents():
    """List loaded documents."""
    global agent
    
    if not agent:
        send_response("documents", documents=[])
        return
    
    docs = agent.get_loaded_documents()
    doc_info = [{"name": Path(d).name, "path": d} for d in docs]
    send_response("documents", documents=doc_info)


def handle_fix_error(error_message, code_context=""):
    """Fix code error."""
    global agent, agent_status
    
    if agent_status != "ready" or not agent:
        send_response("error", error="Agent not initialized. Please initialize first.")
        return
    
    try:
        send_response("status", status="processing", message="Analyzing error...")
        result = agent.fix_code_error(error_message, code_context)
        send_response("fix_result", result=result)
        # Return to ready status
        agent_status = "ready"
        send_response("status", status="ready", message="Ready for next question")
    except Exception as e:
        agent_status = "ready"
        send_response("error", error=f"Fix analysis failed: {str(e)}")


def handle_get_completion(context, prompt_index=1):
    """Handle Copilot completion request with RAG context."""
    global agent, agent_status
    
    if agent_status != "ready" or not agent:
        send_response("completion_response", completion="")
        return
        
    try:
        completion = agent.get_copilot_completion(context, prompt_index)
        send_response("completion_response", completion=completion)
    except Exception as e:
        send_response("completion_response", completion="")


def handle_update_url(new_url, api_key=None):
    """Update the base URL for the Document Agent."""
    global agent
    if agent:
        agent.base_url = new_url
        if api_key is not None:
            agent.api_key = api_key
        # Re-initialize models with the new base URL
        agent.initialize_models()
        send_response("status", status="ready", message=f"URL updated to {new_url}")
    else:
        send_response("error", error="Agent not initialized")


def main():
    """Main loop - read commands from stdin and respond via stdout."""
    global agent_status
    
    # Send initial ready signal
    send_response("system", message="Document agent server ready")
    
    # Read commands from stdin
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        
        try:
            command_data = json.loads(line)
            command = command_data.get("command")
            
            if command == "initialize":
                model_name = command_data.get("model")
                base_url = command_data.get("base_url")
                api_key = command_data.get("api_key")
                data_dir = command_data.get("data_dir")
                persist_dir = command_data.get("persist_dir")
                handle_initialize(model_name, base_url, api_key, data_dir, persist_dir)
            
            elif command == "switch_workspace":
                data_dir = command_data.get("data_dir")
                persist_dir = command_data.get("persist_dir")
                if data_dir:
                    handle_initialize(None, None, None, data_dir, persist_dir)
                else:
                    send_response("error", error="No data_dir provided for switch_workspace")
            
            elif command == "query":
                question = command_data.get("question")
                stream = command_data.get("stream", False)
                strict_files_only = bool(command_data.get("strict_files_only", False))
                if question:
                    handle_query(question, stream, strict_files_only)
                else:
                    send_response("error", error="No question provided")
            
            elif command == "reload_documents":
                handle_reload()
            
            elif command == "load_analysis_only":
                handle_load_analysis_only()

            elif command == "load_detailed_report":
                handle_load_analysis_only()

            elif command == "status":
                handle_status()
            
            elif command == "list_documents":
                handle_list_documents()
            
            elif command == "fix_error":
                error_message = command_data.get("error_message", "")
                code_context = command_data.get("code_context", "")
                handle_fix_error(error_message, code_context)
            
            elif command == "get_completion":
                context = command_data.get("context", "")
                prompt_index = command_data.get("promptIndex", 1)
                handle_get_completion(context, prompt_index)
            
            elif command == "update_url":
                new_url = command_data.get("url", "")
                api_key = command_data.get("api_key")
                handle_update_url(new_url, api_key)
            
            else:
                send_response("error", error=f"Unknown command: {command}")
        
        except json.JSONDecodeError as e:
            send_response("error", error=f"Invalid JSON: {str(e)}")
        except Exception as e:
            send_response("error", error=f"Command failed: {str(e)}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        send_response("system", message="Document agent server stopped")
        sys.exit(0)
    except Exception as e:
        send_response("error", error=f"Fatal error: {str(e)}")
        sys.exit(1)
