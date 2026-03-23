import asyncio
import aiohttp
from collections import defaultdict
from urllib.parse import urlparse

from url_extractor.saver import save_graph_output

from .extractor import extract_links_from_html
from .http import get_page_content_async
from .types import WorkItem


def matchsubdomain(base_netloc: str, link_netloc: str):
    """
    Checks if the link's netloc matches the base netloc, allowing for subdomains.
    """
    return link_netloc.endswith(base_netloc)


async def worker(
    queue: asyncio.Queue,
    session,
    base_netloc: str,
    visited: set,
    js_links: set,
    pages_crawled_count: list,
    max_pages: int,
    graph: dict,
):
    """
    A worker that fetches WorkItem(url,parent,depth), crawls pages, and records graph edges.
    """
    while True:
        item = await queue.get()
        try:
            if item is None:
                break

            current_url = item.url
            parent_url = item.parent

            # Always record discovered relationship, even if already visited.
            if parent_url is not None:
                graph[parent_url].add(current_url)

            if current_url in visited or current_url in js_links:
                continue

            if max_pages != -1 and pages_crawled_count[0] >= max_pages:
                continue

            if not matchsubdomain(base_netloc, urlparse(current_url).netloc):
                continue

            if current_url.endswith(".js"):
                js_links.add(current_url)
                print(f"Found JS file: {current_url}")
                continue

            visited.add(current_url)
            pages_crawled_count[0] += 1
            print(
                f"Crawling: {current_url} "
                f"(Crawled: {pages_crawled_count[0]}/{max_pages if max_pages != -1 else 'unlimited'})"
            )

            content, content_type = await get_page_content_async(session, current_url)
            if content and "html" in content_type:
                links = await extract_links_from_html(content, current_url)

                for link in links:
                    if not matchsubdomain(base_netloc, urlparse(link).netloc):
                        continue

                    # Record link in graph even if link was already seen.
                    graph[current_url].add(link)

                    if link in visited or link in js_links:
                        continue

                    if max_pages != -1 and pages_crawled_count[0] >= max_pages:
                        break

                    await queue.put(WorkItem(url=link, parent=current_url, depth=item.depth + 1))
        finally:
            queue.task_done()


async def crawl_async(start_url, max_pages=-1, num_workers=5, output_file=None):
    """
    Crawls a website starting from a given URL asynchronously and builds a graph.
    """
    base_netloc = urlparse(start_url).netloc
    queue = asyncio.Queue()
    await queue.put(WorkItem(url=start_url, parent=None, depth=0))

    visited = set()
    js_links = set()
    pages_crawled_count = [0]
    graph = defaultdict(set)  # parent_url -> set(child_urls)

    async with aiohttp.ClientSession() as session:
        tasks = []
        for _ in range(num_workers):
            task = asyncio.create_task(
                worker(
                    queue,
                    session,
                    base_netloc,
                    visited,
                    js_links,
                    pages_crawled_count,
                    max_pages,
                    graph,
                )
            )
            tasks.append(task)

        await queue.join()

        for _ in range(num_workers):
            await queue.put(None)

        await asyncio.gather(*tasks, return_exceptions=True)

    print(f"\nCrawled {pages_crawled_count[0]} pages.")

    # Optional text output
    if output_file:
        with open(output_file, "w") as f:
            f.write("Visited URLs:\n")
            for url in sorted(visited):
                f.write(f"{url}\n")

            f.write("\nJavaScript links:\n")
            for url in sorted(js_links):
                f.write(f"{url}\n")

        save_graph_output(graph, output_file)
        

    # Return graph so caller can export JSON / visualize
    return graph, visited, js_links
