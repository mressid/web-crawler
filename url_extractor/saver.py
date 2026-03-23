import json
from datetime import datetime, timezone
from pathlib import Path


def save_graph_output(graph, output_file, *, start_url=None, pages_crawled=None, max_pages=None, num_workers=None):
    """
    Save crawler graph output to disk.
    Supports:
      - .json : full structured payload
      - .csv  : edge list (source,target)
    """
    path = Path(output_file)
    ext = path.suffix.lower()

    # Convert defaultdict(set) / set values into JSON-safe lists
    graph_adj = {parent: sorted(children) for parent, children in graph.items()}

    if ext == ".json":
        payload = {
            "meta": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "start_url": start_url,
                "pages_crawled": pages_crawled,
                "max_pages": max_pages,
                "num_workers": num_workers,
            },
            "graph": graph_adj,
        }
        with path.open("w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        return str(path)

    if ext == ".csv":
        with path.open("w", encoding="utf-8", newline="") as f:
            f.write("source,target\n")
            for source in sorted(graph_adj):
                for target in graph_adj[source]:
                    f.write(f"{source},{target}\n")
        return str(path)

    raise ValueError("Unsupported output format. Use .json or .csv")