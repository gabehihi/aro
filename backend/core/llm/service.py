import enum
import time
from dataclasses import dataclass

import anthropic

from config import get_settings


class ModelTier(enum.StrEnum):
    SONNET = "sonnet"
    HAIKU = "haiku"
    OPUS = "opus"


@dataclass
class LLMResponse:
    content: str
    model: str
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int = 0
    cache_creation_tokens: int = 0
    cost_usd: float = 0.0
    latency_ms: float = 0.0


class LLMService:
    # 모델별 pricing (per 1M tokens, 2026-03 기준)
    PRICING: dict[str, dict[str, float]] = {
        "sonnet": {"input": 3.0, "output": 15.0, "cache_read": 0.3, "cache_write": 3.75},
        "haiku": {"input": 0.80, "output": 4.0, "cache_read": 0.08, "cache_write": 1.0},
        "opus": {"input": 15.0, "output": 75.0, "cache_read": 1.5, "cache_write": 18.75},
    }

    def __init__(self) -> None:
        settings = get_settings()
        self._client: anthropic.AsyncAnthropic | None = (
            anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            if settings.ANTHROPIC_API_KEY
            else None
        )
        self._settings = settings
        self._model_map: dict[ModelTier, str] = {
            ModelTier.SONNET: settings.DEFAULT_MODEL,
            ModelTier.HAIKU: settings.HAIKU_MODEL,
            ModelTier.OPUS: settings.OPUS_MODEL,
        }

    def _get_model_id(self, tier: ModelTier) -> str:
        return self._model_map[tier]

    def _calculate_cost(
        self,
        tier: ModelTier,
        input_tokens: int,
        output_tokens: int,
        cache_read: int = 0,
        cache_creation: int = 0,
    ) -> float:
        p = self.PRICING[tier.value]
        cost = (
            (input_tokens - cache_read - cache_creation) * p["input"]
            + output_tokens * p["output"]
            + cache_read * p["cache_read"]
            + cache_creation * p["cache_write"]
        ) / 1_000_000
        return round(cost, 6)

    async def generate(
        self,
        *,
        system: str | list[dict],
        messages: list[dict],
        model_tier: ModelTier = ModelTier.SONNET,
        max_tokens: int = 4096,
        temperature: float = 0.0,
    ) -> LLMResponse:
        if not self._client:
            raise RuntimeError("ANTHROPIC_API_KEY가 설정되지 않았습니다")

        start = time.monotonic()
        response = await self._client.messages.create(
            model=self._get_model_id(model_tier),
            system=system,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        latency = (time.monotonic() - start) * 1000

        usage = response.usage
        cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        cache_creation = getattr(usage, "cache_creation_input_tokens", 0) or 0

        return LLMResponse(
            content=response.content[0].text,
            model=response.model,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            cache_read_tokens=cache_read,
            cache_creation_tokens=cache_creation,
            cost_usd=self._calculate_cost(
                model_tier,
                usage.input_tokens,
                usage.output_tokens,
                cache_read,
                cache_creation,
            ),
            latency_ms=round(latency, 1),
        )

    async def generate_with_cache(
        self,
        *,
        cached_system: str,
        dynamic_system: str = "",
        messages: list[dict],
        model_tier: ModelTier = ModelTier.SONNET,
        max_tokens: int = 4096,
        temperature: float = 0.0,
    ) -> LLMResponse:
        system: list[dict] = [
            {"type": "text", "text": cached_system, "cache_control": {"type": "ephemeral"}},
        ]
        if dynamic_system:
            system.append({"type": "text", "text": dynamic_system})

        return await self.generate(
            system=system,
            messages=messages,
            model_tier=model_tier,
            max_tokens=max_tokens,
            temperature=temperature,
        )

    async def check_health(self) -> dict:
        if not self._client:
            return {"status": "unconfigured", "detail": "ANTHROPIC_API_KEY 미설정"}
        try:
            response = await self._client.messages.create(
                model=self._get_model_id(ModelTier.HAIKU),
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=5,
                system="Reply with 'pong'",
            )
            return {"status": "ok", "model": response.model}
        except Exception as e:
            return {"status": "error", "detail": str(e)}
