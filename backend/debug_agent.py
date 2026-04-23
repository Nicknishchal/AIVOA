
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import datetime
from agent import run_agent

def test_history():
    print(f"[{datetime.datetime.now()}] Testing 'Show history'...")
    try:
        # Pass empty history as list of dicts as expected by new run_agent
        result = run_agent("Show past interactions", history=[])
        print(f"[{datetime.datetime.now()}] Response: {result['response']}")
        print(f"[{datetime.datetime.now()}] Extracted: {result['extracted_data']}")
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_history()
