#!/usr/bin/env python3
"""Update the homepage YouTube preview from the latest channel live/stream."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from urllib import error, request

from yt_dlp import YoutubeDL


DEFAULT_STREAMS_URL = "https://www.youtube.com/@生命之光灵粮堂教会/streams"


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def latest_stream(streams_url: str) -> dict:
    options = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist",
        "playlistend": 1,
    }
    with YoutubeDL(options) as ydl:
        info = ydl.extract_info(streams_url, download=False)

    entries = [entry for entry in info.get("entries", []) if entry]
    if not entries:
        raise RuntimeError(f"No YouTube entries found at {streams_url}")

    entry = entries[0]
    video_id = entry.get("id")
    if not video_id:
        raise RuntimeError("Latest YouTube entry did not include a video id")

    title = entry.get("title") or "生命之光靈糧堂主日信息"
    url = entry.get("url") or f"https://www.youtube.com/watch?v={video_id}"
    if not str(url).startswith("http"):
        url = f"https://www.youtube.com/watch?v={video_id}"

    return {
        "video_id": video_id,
        "video_url": url,
        "video_embed_url": f"https://www.youtube.com/embed/{video_id}",
        "title": title,
    }


def supabase_request(method: str, path: str, payload: dict | None = None) -> object:
    supabase_url = env("SUPABASE_URL").rstrip("/")
    service_key = env("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = request.Request(
        f"{supabase_url}/rest/v1/{path}",
        data=body,
        method=method,
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        with request.urlopen(req, timeout=30) as response:
            response_body = response.read().decode("utf-8")
            return json.loads(response_body) if response_body else None
    except error.HTTPError as exc:
        message = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase {method} {path} failed: {exc.code} {message}") from exc


def main() -> int:
    streams_url = env("YOUTUBE_STREAMS_URL", DEFAULT_STREAMS_URL)
    video = latest_stream(streams_url)
    print(f"Latest YouTube stream: {video['video_id']} - {video['title']}")

    if env("DRY_RUN") == "1":
        print(json.dumps(video, ensure_ascii=False, indent=2))
        return 0

    rows = supabase_request(
        "GET",
        "site_sections?section_key=eq.messages&select=content",
    )
    if not isinstance(rows, list) or not rows:
        raise RuntimeError("Could not find site_sections row with section_key=messages")

    content = rows[0].get("content") or {}
    if content.get("video_id") == video["video_id"]:
        print("Homepage preview already uses the latest video. No update needed.")
        return 0

    updated_content = {
        **content,
        "video_id": video["video_id"],
        "video_embed_url": video["video_embed_url"],
        "latest_video_url": video["video_url"],
        "latest_video_title": video["title"],
        "latest_video_checked_at": datetime.now(timezone.utc).isoformat(),
    }

    supabase_request(
        "PATCH",
        "site_sections?section_key=eq.messages",
        {
            "content": updated_content,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    print("Supabase messages section updated.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1)
