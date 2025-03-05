#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VENV_PATH="$SCRIPT_DIR/venv"

if [ ! -d "$VENV_PATH" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_PATH"
    source "$VENV_PATH/bin/activate"
    pip install -r requirements.txt
    deactivate
fi

"$VENV_PATH/bin/python" "$SCRIPT_DIR/main.py"
