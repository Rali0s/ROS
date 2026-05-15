#!/usr/bin/env python3
"""Local-only accessibility speech helper for ROS.

Reads a small JSON payload from stdin:
  {"text": "...", "voice": "", "rate": 175}

This intentionally uses OS-local speech services. It never calls a network API.
"""

import json
import platform
import shutil
import subprocess
import sys


MAX_TEXT_LENGTH = 600


def clamp_text(value):
    text = str(value or "").strip()
    return text[:MAX_TEXT_LENGTH]


def run_command(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def speak_macos(text, voice, rate):
    args = ["say", "-r", str(rate)]
    if voice:
        args.extend(["-v", voice])
    args.append(text)
    run_command(args)


def speak_windows(text, voice, rate):
    escaped_text = text.replace("'", "''")
    escaped_voice = voice.replace("'", "''")
    script = [
        "Add-Type -AssemblyName System.Speech;",
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;",
        f"$s.Rate = {max(-10, min(10, int((rate - 175) / 20)))};",
    ]
    if escaped_voice:
        script.append(f"$s.SelectVoice('{escaped_voice}');")
    script.append(f"$s.Speak('{escaped_text}');")
    run_command(["powershell", "-NoProfile", "-Command", " ".join(script)])


def speak_linux(text, voice, rate):
    if shutil.which("spd-say"):
        args = ["spd-say", "-r", str(max(-100, min(100, rate - 175)))]
        if voice:
            args.extend(["-o", voice])
        args.append(text)
        run_command(args)
        return

    if shutil.which("espeak"):
        args = ["espeak", "-s", str(rate)]
        if voice:
            args.extend(["-v", voice])
        args.append(text)
        run_command(args)
        return

    raise RuntimeError("No local speech command found. Install speech-dispatcher or espeak.")


def main():
    try:
        payload = json.load(sys.stdin)
        text = clamp_text(payload.get("text"))
        voice = str(payload.get("voice") or "").strip()
        rate = int(payload.get("rate") or 175)

        if not text:
            return 0

        system = platform.system().lower()
        if system == "darwin":
            speak_macos(text, voice, rate)
        elif system == "windows":
            speak_windows(text, voice, rate)
        else:
            speak_linux(text, voice, rate)
        return 0
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
