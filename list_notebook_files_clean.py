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
                    sources = data[0][3]
                    for s in sources:
                        if isinstance(s, list) and len(s) > 1 and isinstance(s[1], str):
                            print(f"- {s[1]}")
                except Exception as e:
                    pass

if __name__ == "__main__":
    asyncio.run(main())
