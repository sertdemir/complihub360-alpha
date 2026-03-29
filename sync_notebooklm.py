import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import json
import os
import re

def sanitize_filename(name):
    # Remove any non-alphanumeric/space/underscore/dash characters
    clean = re.sub(r'[^a-zA-Z0-9_\-\s]', '', name)
    return clean.strip().replace(' ', '_').lower() + '.md'

# UUID regex pattern
uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')

def find_docs(data, targets):
    if isinstance(data, list):
        if len(data) >= 2 and isinstance(data[1], str):
            title = data[1].strip()
            # Try to extract UUID from data[0]
            uuid = None
            if isinstance(data[0], list) and len(data[0]) > 0:
                if isinstance(data[0][0], str) and uuid_pattern.match(data[0][0]):
                    uuid = data[0][0]
                elif isinstance(data[0][0], list) and len(data[0][0]) > 0 and isinstance(data[0][0][0], str) and uuid_pattern.match(data[0][0][0]):
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

    print(f"Found {len(targets)} documents.")
    
    out_dir = "/Users/salurdesign/Documents/UX/CompliHub360/plattform/complihub360-alpha/docs/notebooklm"
    os.makedirs(out_dir, exist_ok=True)
    
    server_params = StdioServerParameters(
        command="/Users/salurdesign/Documents/UX/CompliHub360/plattform/complihub360-alpha/.notebooklm-mcp-env/bin/python3",
        args=["-m", "notebooklm_mcp.server"],
        env=None
    )
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            for title, uuid in targets.items():
                print(f"Fetching: {title} ({uuid})")
                try:
                    result = await session.call_tool("source_get_content", {"source_id": uuid})
                    for item in result.content:
                        filename = sanitize_filename(title)
                        filepath = os.path.join(out_dir, filename)
                        with open(filepath, "w") as f_out:
                            f_out.write(f"# {title}\n\n<!-- SOURCE_ID: {uuid} -->\n\n{item.text}")
                        print(f"  -> Saved to {filepath}")
                except Exception as e:
                    print(f"  -> Error fetching {title}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
