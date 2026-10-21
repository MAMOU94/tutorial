# AI Document Assistant

A local AI agent that answers questions about your documents using Ollama and LlamaIndex.

## 🚀 Quick Start

### 1. Add Your Documents

Place your documents in the `data/` folder. Supported formats:
- PDF (`.pdf`)
- Markdown (`.md`)
- R Markdown (`.rmd`)
- R scripts (`.r`)
- Text files (`.txt`)

```bash
cp /path/to/your/document.pdf data/
```

### 2. Run the Agent

```bash
python3 agent.py
```

The agent will:
1. ✓ Check that required models are available
2. ✓ Load all documents from `data/`
3. ✓ Create embeddings and vector index
4. ✓ Start the interactive Q&A session

### 3. Ask Questions

```
Ready. Ask a question (type 'exit' to quit):
> What is this document about?
> Summarize the main points
> What does section 3 discuss?
```

Type `exit` or `quit` to stop.

## 📋 Requirements

### Ollama Models

The agent requires two Ollama models:
- `qwen:7b` - LLM for answering questions
- `nomic-embed-text` - Embedding model for document indexing

Install them with:
```bash
ollama pull qwen:7b
ollama pull nomic-embed-text
```

### Python Dependencies

Install with:
```bash
pip3 install -r requirements.txt
```

## 🔧 How It Works

1. **Document Loading**: Reads all supported files from `data/` folder
2. **Embedding**: Converts documents into vector embeddings using `nomic-embed-text`
3. **Vector Store**: Stores embeddings in ChromaDB for fast retrieval
4. **Query**: Uses `qwen:7b` to answer questions based on relevant document chunks

## 📁 Project Structure

```
AI agent/
├── agent.py              # Main application
├── agent_core.py         # Core agent functionality
├── gui.py                # Gradio web interface
├── requirements.txt      # Python dependencies
├── data/                 # Place your documents here
│   ├── *.pdf, *.md, etc.
│   └── analysis_wrapper_documentation.md  # R wrapper script docs
└── chroma_db/           # Vector database (auto-created)
```

## 📚 Additional Documentation

The `data/` folder contains comprehensive documentation for various components:

- **[analysis_wrapper_documentation.md](data/analysis_wrapper_documentation.md)** - Complete guide to the R statistical analysis wrapper script, including:
  - Descriptive and inferential statistics modes
  - Automatic test selection workflows
  - Correlation analysis and factorial designs
  - Integration examples for Node.js and Python
  - Troubleshooting and best practices

- **[r_wrapper_quick_reference.md](data/r_wrapper_quick_reference.md)** - Quick start guide with common usage examples

- **[analysis_wrapper.R](data/analysis_wrapper.R)** - Full source code of the R wrapper script (1011 lines)

You can ask the AI agent questions about these documents once they're indexed!

## 💡 Tips

- **First Run**: The first time you run the agent, it will create embeddings for all documents. This may take a few minutes.
- **Adding New Documents**: Add files to `data/` and restart the agent. It will re-index everything.
- **Model Not Ready**: If you see "Model not available" errors, ensure Ollama is running (`ollama serve`) and the models are downloaded.
- **Ask About Documentation**: Try asking "How do I use the R wrapper for correlation analysis?" or "What statistical tests are available?"

## 🐛 Troubleshooting

**Error: Model not available**
```bash
ollama serve  # In one terminal
ollama pull qwen:7b
ollama pull nomic-embed-text
```

**Error: Cannot connect to Ollama**
- Ensure Ollama is running: `ollama serve`
- Check it's accessible at `http://localhost:11434`

**No documents found**
- Verify files are in the `data/` folder
- Check file extensions are supported (`.pdf`, `.md`, `.rmd`, `.r`, `.txt`)
