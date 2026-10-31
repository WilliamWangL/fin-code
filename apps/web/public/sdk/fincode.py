"""FinCode reference client for Python 3.9+.

Standard library only: no third-party dependencies. Download this file, drop it
next to your code and import it directly::

    from fincode import FinCode

    fincode = FinCode(api_key=os.environ["FINCODE_API_KEY"])
    response = fincode.swift.get("ICBKCNBJ")
    print(response.data["bank"]["name_en"])

Every call returns a :class:`FinCodeResponse` with ``data`` and ``meta``
(``meta["request_id"]`` is the identifier to quote when contacting support).
Failures raise :class:`FinCodeError` carrying the machine readable code, the HTTP
status and the request id.
"""

from __future__ import annotations

import json
import random
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, Iterator, Optional

DEFAULT_BASE_URL = "https://api.ecommica.com/v1"
DEFAULT_TIMEOUT_SECONDS = 10.0
DEFAULT_MAX_RETRIES = 2

#: Statuses the API may return transiently; retried with exponential backoff.
RETRYABLE_STATUSES = frozenset({429, 502, 503, 504})
BASE_BACKOFF_SECONDS = 0.25


class FinCodeError(Exception):
    """Raised for API errors, timeouts and network failures."""

    def __init__(
        self,
        message: str,
        code: str,
        status: int = 0,
        request_id: Optional[str] = None,
        retry_after: Optional[float] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.status = status
        self.request_id = request_id
        self.retry_after = retry_after

    @property
    def is_retryable(self) -> bool:
        return self.status == 0 or self.status in RETRYABLE_STATUSES


@dataclass
class FinCodeResponse:
    """Decoded response envelope: ``{"data": ..., "meta": {...}}``."""

    data: Any
    meta: Dict[str, Any] = field(default_factory=dict)

    @property
    def request_id(self) -> Optional[str]:
        return self.meta.get("request_id")

    @property
    def next_cursor(self) -> Optional[str]:
        return self.meta.get("next_cursor")


class _Resource:
    def __init__(self, client: "FinCode") -> None:
        self._client = client


class IbanResource(_Resource):
    def validate(self, iban: str) -> FinCodeResponse:
        """Format, length, MOD-97 and BBAN structure checks."""
        return self._client._request("GET", "/iban/validate", query={"iban": iban})

    def lookup(self, iban: str) -> FinCodeResponse:
        """Validate and resolve the bank behind the IBAN."""
        return self._client._request("GET", f"/iban/{_quote(iban)}")


class _CodeResource(_Resource):
    def __init__(self, client: "FinCode", prefix: str) -> None:
        super().__init__(client)
        self._prefix = prefix

    def get(self, code: str) -> FinCodeResponse:
        return self._client._request("GET", f"/{self._prefix}/{_quote(code)}")


class BankResource(_Resource):
    def list(
        self,
        country: Optional[str] = None,
        limit: Optional[int] = None,
        cursor: Optional[str] = None,
    ) -> FinCodeResponse:
        return self._client._request(
            "GET", "/banks", query={"country": country, "limit": limit, "cursor": cursor}
        )

    def search(
        self,
        q: str,
        country: Optional[str] = None,
        limit: Optional[int] = None,
        cursor: Optional[str] = None,
    ) -> FinCodeResponse:
        return self._client._request(
            "GET",
            "/banks/search",
            query={"q": q, "country": country, "limit": limit, "cursor": cursor},
        )

    def get(self, identifier: str) -> FinCodeResponse:
        return self._client._request("GET", f"/banks/{_quote(identifier)}")

    def by_slug(self, slug: str) -> FinCodeResponse:
        return self._client._request("GET", f"/banks/by-slug/{_quote(slug)}")

    def branches(
        self,
        identifier: str,
        q: Optional[str] = None,
        city: Optional[str] = None,
        limit: Optional[int] = None,
        cursor: Optional[str] = None,
    ) -> FinCodeResponse:
        return self._client._request(
            "GET",
            f"/banks/{_quote(identifier)}/branches",
            query={"q": q, "city": city, "limit": limit, "cursor": cursor},
        )


class CountryResource(_Resource):
    def list(self) -> FinCodeResponse:
        return self._client._request("GET", "/countries")

    def get(self, code: str) -> FinCodeResponse:
        return self._client._request("GET", f"/countries/{_quote(code)}")

    def iban_format(self, code: str) -> FinCodeResponse:
        return self._client._request("GET", f"/countries/{_quote(code)}/iban-format")


class LookupResource(_Resource):
    def get(self, q: str) -> FinCodeResponse:
        """Detect the identifier type from the input and resolve it."""
        return self._client._request("GET", "/lookup", query={"q": q})


class FinCode:
    """Client for the FinCode V1 API.

    >>> fincode = FinCode(api_key="sk_xxx")
    >>> fincode.iban.validate("DE89370400440532013000").data["valid"]
    True
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> None:
        if not api_key:
            raise ValueError("FinCode: an api_key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries

        self.iban = IbanResource(self)
        self.swift = _CodeResource(self, "swift")
        self.routing = _CodeResource(self, "routing")
        self.sort_code = _CodeResource(self, "sort-code")
        self.bsb = _CodeResource(self, "bsb")
        self.ifsc = _CodeResource(self, "ifsc")
        self.cnaps = _CodeResource(self, "cnaps")
        self.bin = _CodeResource(self, "bin")
        self.banks = BankResource(self)
        self.countries = CountryResource(self)
        self.lookup = LookupResource(self)

    def request(
        self,
        method: str,
        path: str,
        query: Optional[Dict[str, Any]] = None,
        body: Optional[Any] = None,
    ) -> FinCodeResponse:
        """Low-level escape hatch for endpoints without a typed helper."""
        return self._request(method, path, query=query, body=body)

    def iter_pages(
        self,
        path: str,
        query: Optional[Dict[str, Any]] = None,
        limit: int = 100,
    ) -> Iterator[FinCodeResponse]:
        """Yield successive pages of a cursor paginated collection."""
        cursor: Optional[str] = None
        while True:
            page = self._request(
                "GET", path, query={**(query or {}), "limit": limit, "cursor": cursor}
            )
            yield page
            cursor = page.next_cursor
            if not cursor:
                return

    def _request(
        self,
        method: str,
        path: str,
        query: Optional[Dict[str, Any]] = None,
        body: Optional[Any] = None,
    ) -> FinCodeResponse:
        url = self._build_url(path, query)
        payload = None if body is None else json.dumps(body).encode("utf-8")
        attempts = self.max_retries + 1

        for attempt in range(1, attempts + 1):
            try:
                return self._send(method, url, payload)
            except FinCodeError as error:
                if attempt < attempts and error.is_retryable:
                    time.sleep(_backoff_delay(attempt, error.retry_after))
                    continue
                raise
            except (urllib.error.URLError, TimeoutError, OSError) as cause:
                if attempt < attempts:
                    time.sleep(_backoff_delay(attempt))
                    continue
                timed_out = isinstance(cause, TimeoutError)
                raise FinCodeError(
                    message=(
                        f"Request timed out after {self.timeout} s"
                        if timed_out
                        else str(cause)
                    ),
                    code="TIMEOUT" if timed_out else "NETWORK_ERROR",
                    status=0,
                ) from cause

        raise RuntimeError("FinCode: unreachable retry loop")

    def _send(self, method: str, url: str, payload: Optional[bytes]) -> FinCodeResponse:
        request = urllib.request.Request(
            url,
            data=payload,
            method=method,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                return _decode(response.read(), dict(response.headers))
        except urllib.error.HTTPError as error:
            raw = error.read()
            meta = dict(error.headers or {})
            retry_after = _parse_retry_after(meta.get("Retry-After"))
            body = _loads(raw)
            envelope = body.get("error") if isinstance(body, dict) else None
            raise FinCodeError(
                message=(envelope or {}).get("message")
                or f"Request failed with status {error.code}",
                code=(envelope or {}).get("code") or f"HTTP_{error.code}",
                status=error.code,
                request_id=(envelope or {}).get("request_id"),
                retry_after=retry_after,
            ) from error

    def _build_url(self, path: str, query: Optional[Dict[str, Any]]) -> str:
        url = f"{self.base_url}{path if path.startswith('/') else '/' + path}"
        pairs = {
            key: value
            for key, value in (query or {}).items()
            if value is not None
        }
        if pairs:
            url = f"{url}?{urllib.parse.urlencode(pairs)}"
        return url


def _quote(value: str) -> str:
    return urllib.parse.quote(str(value), safe="")


def _loads(raw: bytes) -> Any:
    if not raw:
        return None
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def _decode(raw: bytes, headers: Dict[str, str]) -> FinCodeResponse:
    body = _loads(raw)
    if not isinstance(body, dict):
        return FinCodeResponse(data=body, meta={})
    return FinCodeResponse(data=body.get("data"), meta=body.get("meta") or {})


def _parse_retry_after(value: Optional[str]) -> Optional[float]:
    if not value:
        return None
    try:
        seconds = float(value)
    except ValueError:
        return None
    return seconds if seconds > 0 else None


def _backoff_delay(attempt: int, retry_after: Optional[float] = None) -> float:
    if retry_after is not None:
        return retry_after
    return BASE_BACKOFF_SECONDS * 2 ** (attempt - 1) + random.random() * BASE_BACKOFF_SECONDS
