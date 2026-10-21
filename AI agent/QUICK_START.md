# 🍌 Quick Start Guide - AI Document Assistant

## Simple 3-Step Plan

### Step 1: Add Your Documents 📁
```bash
# Put your files in the data folder
cp /path/to/your/file.pdf data/
```

Supported files: `.pdf`, `.md`, `.txt`, `.r`, `.rmd`

---

### Step 2: Run the Agent 🚀
```bash
python3 agent.py
```

Wait for: `Ready. Ask a question (type 'exit' to quit):`

---

### Step 3: Ask Questions 💬
```
> What is this document about?
> Summarize the main points
> exit
```

---

## That's It! 🎉

Your current data folder has:
- ✓ `IAPA_2424_Documentación.pdf`

The AI will answer questions based on ALL documents in the `data/` folder.

---

## Troubleshooting

**Problem:** "Model not available"  
**Solution:** Wait for `ollama pull nomic-embed-text` to finish

**Problem:** Agent crashes  
**Solution:** Make sure Ollama is running: `ollama serve`
