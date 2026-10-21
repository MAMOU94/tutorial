from __future__ import annotations

import gradio as gr
from pathlib import Path
import shutil
from agent_core import DocumentAgent, DATA_DIR

# Global agent instance
agent: DocumentAgent | None = None


def initialize_agent() -> str:
    """Initialize the document agent."""
    global agent
    
    try:
        agent = DocumentAgent()
        
        if agent.initialize():
            docs = agent.get_loaded_documents()
            doc_list = "\n".join([f"• {Path(d).name}" for d in docs])
            return f"✅ Agent initialized successfully!\n\n📁 Loaded documents:\n{doc_list}"
        else:
            return "❌ Failed to initialize agent. Check console for details."
    except Exception as e:
        return f"❌ Error: {e}"


def chat(message: str, history: list) -> tuple[str, list]:
    """
    Handle chat messages.
    
    Args:
        message: User's question
        history: Chat history as list of tuples
        
    Returns:
        Tuple of (empty string to clear input, updated history)
    """
    global agent
    
    if not agent:
        response = "❌ Please initialize the agent first by clicking 'Initialize Agent'."
    else:
        response = agent.query(message)
    
    # Gradio 6.5 uses tuple format: (user_message, bot_message)
    history.append((message, response))
    
    return "", history


def upload_file(file) -> str:
    """
    Handle file upload.
    
    Args:
        file: Uploaded file object
        
    Returns:
        Status message
    """
    global agent
    
    if file is None:
        return "❌ No file selected"
    
    try:
        # Copy file to data directory
        file_path = Path(file.name)
        dest_path = DATA_DIR / file_path.name
        
        # Create data directory if it doesn't exist
        DATA_DIR.mkdir(exist_ok=True)
        
        # Copy the file
        shutil.copy2(file.name, dest_path)
        
        # Reinitialize agent to include new file
        if agent:
            return f"✅ File '{file_path.name}' uploaded!\n\n⚠️ Please click 'Initialize Agent' to reload documents."
        else:
            return f"✅ File '{file_path.name}' uploaded to data folder!\n\nClick 'Initialize Agent' to start."
            
    except Exception as e:
        return f"❌ Error uploading file: {e}"


def get_document_list() -> str:
    """Get list of documents in data directory."""
    global agent
    
    if not DATA_DIR.exists():
        return "📁 No data directory found"
    
    files = list(DATA_DIR.glob("*"))
    if not files:
        return "📁 No documents in data folder"
    
    file_list = "\n".join([f"• {f.name} ({f.stat().st_size / 1024:.1f} KB)" for f in files if f.is_file()])
    
    if agent and agent.loaded_documents:
        return f"📁 Documents in data folder:\n{file_list}\n\n✅ Agent loaded: {len(agent.loaded_documents)} document(s)"
    else:
        return f"📁 Documents in data folder:\n{file_list}\n\n⚠️ Agent not initialized"


# Create Gradio interface
with gr.Blocks(title="AI Document Assistant") as demo:
    gr.Markdown(
        """
        # 🤖 AI Document Assistant
        
        Ask questions about your documents using AI!
        """
    )
    
    with gr.Row():
        with gr.Column(scale=2):
            # Chat interface
            chatbot = gr.Chatbot(
                label="Chat",
                height=400,
                show_label=True,
            )
            
            with gr.Row():
                msg = gr.Textbox(
                    label="Ask a question",
                    placeholder="What is this document about?",
                    scale=4,
                )
                submit_btn = gr.Button("Send", variant="primary", scale=1)
            
            clear_btn = gr.Button("Clear Chat")
        
        with gr.Column(scale=1):
            # Control panel
            gr.Markdown("### 🎛️ Control Panel")
            
            init_btn = gr.Button("🚀 Initialize Agent", variant="primary", size="lg")
            init_status = gr.Textbox(
                label="Status",
                lines=8,
                interactive=False,
            )
            
            gr.Markdown("### 📤 Upload Document")
            file_upload = gr.File(
                label="Upload PDF, MD, TXT, R files",
                file_types=[".pdf", ".md", ".txt", ".r", ".rmd"],
            )
            upload_status = gr.Textbox(
                label="Upload Status",
                lines=3,
                interactive=False,
            )
            
            gr.Markdown("### 📚 Documents")
            doc_list = gr.Textbox(
                label="Loaded Documents",
                lines=6,
                interactive=False,
            )
            refresh_btn = gr.Button("🔄 Refresh List")
    
    # Event handlers
    init_btn.click(
        fn=initialize_agent,
        outputs=init_status,
    ).then(
        fn=get_document_list,
        outputs=doc_list,
    )
    
    submit_btn.click(
        fn=chat,
        inputs=[msg, chatbot],
        outputs=[msg, chatbot],
    )
    
    msg.submit(
        fn=chat,
        inputs=[msg, chatbot],
        outputs=[msg, chatbot],
    )
    
    clear_btn.click(
        fn=lambda: [],
        outputs=chatbot,
    )
    
    file_upload.change(
        fn=upload_file,
        inputs=file_upload,
        outputs=upload_status,
    ).then(
        fn=get_document_list,
        outputs=doc_list,
    )
    
    refresh_btn.click(
        fn=get_document_list,
        outputs=doc_list,
    )
    
    # Load document list on startup
    demo.load(
        fn=get_document_list,
        outputs=doc_list,
    )


if __name__ == "__main__":
    print("🚀 Starting AI Document Assistant GUI...")
    print("📱 Open your browser to interact with the agent")
    print("=" * 50)
    
    demo.launch(
        server_name="127.0.0.1",
        server_port=7860,
        share=False,
        theme=gr.themes.Soft(),
    )
