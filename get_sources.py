import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import json

async def main():
    server_params = StdioServerParameters(
        command="/Users/salurdesign/Documents/UX/CompliHub360/plattform/complihub360-alpha/.notebooklm-mcp-env/bin/python3",
        args=["-m", "notebooklm_mcp.server"],
        env=None
    )
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool("notebook_get", {"notebook_id": "2c11b1a9-9c72-48b3-9fb4-f0d99b501d04"})
            
            for item in result.content:
                try:
                    data = json.loads(item.text)
                    # Based on structure analysis:
                    sources = data[0][1] # list of sources
                    count = 1
                    for s in sources:
                        title = s[1]
                        source_id = s[0][0]
                        print(f"{count}. {title} (ID: {source_id})")
                        count += 1
                except Exception as e:
                    print(f"Error parsing: {e}")

if __name__ == "__main__":
    asyncio.run(main())
