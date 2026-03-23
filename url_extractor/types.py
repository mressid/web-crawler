from dataclasses import dataclass


@dataclass(frozen=True)
class WorkItem:
    url: str
    parent: str | None
    depth: int