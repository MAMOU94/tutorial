# 🚀 How to Use the Graphical Interface

## Quick Start

### 1. Start the GUI
```bash
python3 gui.py
```

### 2. Open Browser
Go to: **http://127.0.0.1:7860**

### 3. Initialize Agent
Click the **"🚀 Initialize Agent"** button

### 4. Ask Questions!
Type your question and click **"Send"**

---

## Features

### 💬 Chat Interface
- Ask questions about your documents
- View chat history
- Clear conversation anytime

### 📤 Upload Files
- Drag & drop files to upload
- Supports: PDF, Markdown, Text, R files
- Files are automatically added to `data/` folder

### 📚 Document Management
- See all documents in your data folder
- View file sizes
- Check which documents are loaded

---

## Step-by-Step Guide

### First Time Setup

1. **Make sure Ollama is running:**
   ```bash
   ollama serve
   ```

2. **Start the GUI:**
   ```bash
   cd "/home/mamou/Desktop/AI agent"
   python3 gui.py
   ```

3. **Open your browser to:**
   ```
   http://127.0.0.1:7860
   ```

4. **Click "🚀 Initialize Agent"**
   - Wait for models to be checked
   - Documents will be loaded
   - Status will show "✅ Agent initialized successfully!"

### Asking Questions

1. Type your question in the text box
2. Click **"Send"** or press Enter
3. Wait for the AI response
4. Continue the conversation!

**Example questions:**
- "What is this document about?"
- "Summarize the main points"
- "What does section 3 discuss?"

### Uploading New Documents

1. **Drag and drop** a file to the upload area
   - OR click the upload area to browse

2. **Wait for confirmation:**
   - "✅ File uploaded!"

3. **Click "🚀 Initialize Agent" again**
   - This reloads all documents including the new one

4. **Start asking questions** about the new document!

### Managing Documents

- **View documents:** Check the "📚 Documents" panel
- **Refresh list:** Click "🔄 Refresh List"
- **See status:** Check if agent is initialized

---

## Tips

✅ **Initialize once** - You only need to click "Initialize Agent" when:
   - First opening the GUI
   - After uploading new files

✅ **Chat history** - Your conversation stays visible until you click "Clear Chat"

✅ **Multiple documents** - The AI can answer questions about ALL documents in your data folder

✅ **File formats** - Supported: `.pdf`, `.md`, `.txt`, `.r`, `.rmd`

---

## Troubleshooting

**Problem:** GUI won't start  
**Solution:** Install Gradio: `pip3 install gradio`

**Problem:** "Model not available" error  
**Solution:** Wait for models to download or run:
```bash
ollama pull qwen:7b
ollama pull nomic-embed-text
```

**Problem:** Can't upload files  
**Solution:** Check file format is supported (PDF, MD, TXT, R, RMD)

---

## Comparison: CLI vs GUI

| Feature | Command Line | Graphical Interface |
|---------|--------------|---------------------|
| Start | `python3 agent.py` | `python3 gui.py` |
| Interface | Terminal | Web Browser |
| Upload Files | Copy manually | Drag & drop |
| See Documents | Not visible | Always visible |
| Chat History | No | Yes |
| Best For | Quick queries | Extended sessions |

---

## That's It! 🎉

You now have a beautiful graphical interface for your AI document assistant!

**To start using it:**
```bash
python3 gui.py
```

Then open **http://127.0.0.1:7860** in your browser! 🚀
