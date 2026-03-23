import asyncio
import sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    server_params = StdioServerParameters(
        command="/Users/salur-labs/Documents/UX/CompliHub360/plattform/complihub360-alpha/.notebooklm-mcp-env/bin/python3",
        args=["-m", "notebooklm_mcp.server"],
        env=None
    )
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # List tools
            tools = await session.list_tools()
            print("Tools available:")
            for tool in tools.tools:
                print(f"- {tool.name}: {tool.description}")
                
            # List resources
            try:
                resources = await session.list_resources()
                print("\nResources:")
                for res in resources.resources:
                    print(f"- {res.name} ({res.uri})")
            except Exception as e:
                print(f"Error listing resources: {e}")

if __name__ == "__main__":
    asyncio.run(main())
