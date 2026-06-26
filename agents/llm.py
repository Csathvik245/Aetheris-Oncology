"""LLM helpers. Every agent — sub-agents and orchestrator — runs on Groq
gpt-oss-120b (no Anthropic dependency).

All helpers return None when the Groq key is missing or the call fails, so every
caller must have a deterministic fallback (Section 15).
"""
import json
import config


async def groq_complete(system: str, user: str, max_tokens: int = 512,
                        model: str | None = None, temperature: float = 0.2,
                        json_mode: bool = False) -> str | None:
    if not config.HAS_GROQ:
        return None
    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=config.GROQ_API_KEY)
        kwargs = dict(
            model=model or config.SUBAGENT_MODEL,
            messages=[{"role": "system", "content": system},
                      {"role": "user", "content": user}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        resp = await client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content
    except Exception as e:
        print(f"[groq] fallback ({e})")
        return None


async def groq_json(system: str, user: str, max_tokens: int = 2048,
                    model: str | None = None) -> dict | None:
    """Call Groq (gpt-oss-120b by default) and parse a JSON object. None on failure."""
    # Try native JSON mode first; fall back to plain completion + extraction.
    text = await groq_complete(system, user, max_tokens=max_tokens,
                               model=model or config.ORCHESTRATOR_MODEL, json_mode=True)
    if text is None:
        text = await groq_complete(system, user, max_tokens=max_tokens,
                                   model=model or config.ORCHESTRATOR_MODEL)
    if text is None:
        return None
    return _extract_json(text)


def _extract_json(text: str) -> dict | None:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return None
