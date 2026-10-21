import sys
import os
import json
import urllib.request

DEFAULT_OLLAMA_BASE = "http://localhost:11434"
RAW_OLLAMA_API = os.getenv("OLLAMA_API", f"{DEFAULT_OLLAMA_BASE}/api/generate")
OLLAMA_API = RAW_OLLAMA_API if RAW_OLLAMA_API.endswith("/api/generate") else RAW_OLLAMA_API.rstrip("/") + "/api/generate"
MODEL = os.getenv("OLLAMA_MODEL", "r-assistant-neural")
MAX_TURNS = 6  # keep last N user/assistant turns
SYSTEM_PROMPT = (
    "You are a concise, helpful coding assistant for R. "
    "Answer directly with code or short explanations as needed. "
    "Do not add markdown fences unless the user asks."
)

def main():
    print(json.dumps({"system": f"Connected to Ollama ({MODEL}). Ready."}), flush=True)

    history = []

    # Main Loop
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        try:
            # Build prompt with short conversation memory
            prompt_parts = []
            for role, content in history:
                if role == "user":
                    prompt_parts.append(f"User: {content}")
                else:
                    prompt_parts.append(f"Assistant: {content}")
            prompt_parts.append(f"User: {line}")
            prompt_parts.append("Assistant:")
            prompt = "\n".join(prompt_parts)

            # Prepare Request
            data = {
                "model": MODEL,
                "prompt": prompt,
                "system": SYSTEM_PROMPT,
                "stream": True,
                "options": {
                    "temperature": 0.4,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1,
                    "num_predict": 256,
                    "stop": ["\nUser:", "\nAssistant:"]
                }
            }
            req = urllib.request.Request(
                OLLAMA_API, 
                data=json.dumps(data).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            
            # Stream Response
            assistant_chunks = []
            with urllib.request.urlopen(req) as response:
                for chunk in response:
                    if chunk:
                        chunk_str = chunk.decode('utf-8')
                        try:
                            chunk_json = json.loads(chunk_str)
                            if not chunk_json.get("done"):
                                token = chunk_json.get("response", "")
                                assistant_chunks.append(token)
                                print(json.dumps({"token": token}), flush=True)
                            else:
                                full_reply = "".join(assistant_chunks).strip()
                                if full_reply:
                                    history.append(("user", line))
                                    history.append(("assistant", full_reply))
                                    if len(history) > MAX_TURNS * 2:
                                        history = history[-MAX_TURNS * 2:]
                                print(json.dumps({"done": True}), flush=True)
                        except json.JSONDecodeError:
                            pass
                            
        except Exception as e:
            print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    main()
