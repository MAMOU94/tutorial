#!/bin/bash
# Fix for "data incompatible" error in AI Document Assistant

echo "🔧 Fixing ChromaDB incompatibility..."
echo ""

# Stop the GUI if running
echo "1. Stopping GUI (if running)..."
pkill -f "python3 gui.py" 2>/dev/null || echo "   GUI not running"

# Remove old ChromaDB database
echo "2. Removing old ChromaDB database..."
rm -rf chroma_db
echo "   ✓ Old database removed"

# The database will be recreated automatically when you restart the GUI
echo ""
echo "✅ Fix complete!"
echo ""
echo "Next steps:"
echo "1. Restart the GUI: python3 gui.py"
echo "2. Open browser: http://127.0.0.1:7860"
echo "3. Click 'Initialize Agent'"
echo ""
echo "The database will be recreated automatically with the correct format."
