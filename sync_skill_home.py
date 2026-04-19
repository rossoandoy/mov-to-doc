#!/usr/bin/env python3
"""One-shot: copy SKILL.md and reference.md to ~/.cursor/skills/mov-to-doc/"""
import shutil
from pathlib import Path
src = Path(__file__).resolve().parent
dst = Path.home() / ".cursor" / "skills" / "mov-to-doc"
dst.mkdir(parents=True, exist_ok=True)
for name in ("SKILL.md", "reference.md"):
    shutil.copy2(src / name, dst / name)
    print(f"OK: {dst / name}")
