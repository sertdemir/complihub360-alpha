import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import json
import os

TARGET_DOCS = [
    "Product Overview & System Architecture",
    "API Contracts & Data Model",
    "Security & Privacy Architecture",
    "Testing Strategy & QA Framework",
    "Master Product Documentation (Full Handoff Package)",
    "Roadmap & Implementation Plan"
]

def find_docs(data, targets):
    if isinstance(data, list):
        if len(data) >= 2 and isinstance(data[1], str):
            title = data[1].strip()
            if title in TARGET_DOCS:
                # Try to extract UUID from data[0]
                uuid = None
                if isinstance(data[0], list) and len(data[0]) > 0:
                    if isinstance(data[0][0], str):
                        uuid = data[0][0]
                    elif isinstance(data[0][0], list) and len(data[0][0]) > 0 and isinstance(data[0][0][0], str):
                        uuid = data[0][0][0]
                if uuid:
                    targets[title] = uuid
        for item in data:
            find_docs(item, targets)
    elif isinstance(data, dict):
        for item in data.values():
            find_docs(item, targets)

async def main():
    with open("notebook_c360_dump.json") as f:
        data = json.load(f)

    targets = {}
    find_docs(data, targets)

    print(f"Found {len(targets)} targets:")
    for t, u in targets.items():
        print(f"  {t}: {u}")
        
    os.makedirs("/tmp/c360_sources", exist_ok=True)
    
    server_params = StdioServerParameters(
        command="/Users/salurdesign/Documents/UX/CompliHub360/plattform/complihub360-alpha/.notebooklm-mcp-env/bin/python3",
        args=["-m", "notebooklm_mcp.server"],
        env=None
    )
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            for title, uuid in targets.items():
                print(f"\nFetching: {title} ({uuid})")
                try:
                    result = await session.call_tool("source_get_content", {"source_id": uuid})
                    for item in result.content:
                        safe_title = title.replace(" ", "_").replace("&", "and").replace("(", "").replace(")", "").lower()
                        filepath = f"/tmp/c360_sources/{safe_title}.md"
                        with open(filepath, "w") as f_out:
                            f_out.write(f"# {title}\n\n{item.text}")
                        print(f"  -> Saved to {filepath}")
                except Exception as e:
                    print(f"  -> Error fetching {title}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
