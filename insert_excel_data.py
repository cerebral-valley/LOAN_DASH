import requests

url = "http://localhost:8017/mcp"
headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
}

# Step 1: Initialize session
init_payload = {
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {},
    "id": 1
}
init_response = requests.post(url, json=init_payload, headers=headers)
session_id = init_response.headers.get("Mcp-Session-Id")
print(f"Session ID: {session_id}")

# Step 2: Get workbook metadata
if session_id:
    headers["Mcp-Session-Id"] = session_id
    meta_payload = {
        "jsonrpc": "2.0",
        "method": "get_workbook_metadata",
        "params": {
            "filepath": r"Z:\Excel MCP\MCP Test Sheet.xlsx",
            "include_ranges": False
        },
        "id": 2
    }
    meta_response = requests.post(url, json=meta_payload, headers=headers)
    print("Workbook metadata:", meta_response.text)
else:
    print("Failed to obtain session ID.")
