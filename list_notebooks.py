import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    server_params = StdioServerParameters(
        command="/Users/salurdesign/Documents/UX/CompliHub360/plattform/complihub360-alpha/.notebooklm-mcp-env/bin/python3",
        args=["-m", "notebooklm_mcp.server"],
        env=None
    )
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool("notebook_list", {})
            for item in result.content:
                print(item.text)

if __name__ == "__main__":
    asyncio.run(main())
