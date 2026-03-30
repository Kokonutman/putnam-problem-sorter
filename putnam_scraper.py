from __future__ import annotations

import re
from collections import Counter
from typing import Dict, List

import pandas as pd
import requests
from bs4 import BeautifulSoup

VALID_YEARS = list(range(1985, 1989)) + list(range(1994, 2020)) + list(range(2021, 2025))
PROBLEMS = ["A1", "A2", "A3", "A4", "A5", "A6", "B1", "B2", "B3", "B4", "B5", "B6"]
SCORES = ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1", "0", "NA"]
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}


def _extract_top_n(title_text: str) -> int:
    m = re.search(r"Top\s+(\d+)\s+Contestants", title_text, re.IGNORECASE)
    if not m:
        raise ValueError("Could not extract top-N from table title")
    return int(m.group(1))


def _to_int(text: str) -> int:
    text = text.replace(",", "").strip()
    if text in {"", "-"}:
        return 0
    return int(text)


def _normalize_problem_label(text: str) -> str:
    return text.upper().replace("-", "").strip()


def _parse_html_table(table) -> Dict[str, Dict[str, int]]:
    rows = []
    for tr in table.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
        if cells:
            rows.append(cells)

    header_map = None
    for cells in rows:
        normalized = [_normalize_problem_label(cell) for cell in cells]
        positions = {}
        for idx, label in enumerate(normalized):
            if label in PROBLEMS and label not in positions:
                positions[label] = idx
        if len(positions) == len(PROBLEMS):
            header_map = positions
            break

    if header_map is None:
        raise ValueError("Could not locate problem headers in HTML table")

    score_rows: Dict[str, List[str]] = {}
    for cells in rows:
        label = cells[0].upper().replace(":", "")
        if label in SCORES and max(header_map.values()) < len(cells):
            score_rows[label] = cells

    if len(score_rows) != len(SCORES):
        raise ValueError("Distribution rows missing in HTML table")

    out = {p: {} for p in PROBLEMS}
    for score in SCORES:
        cells = score_rows[score]
        for problem in PROBLEMS:
            out[problem][score] = _to_int(cells[header_map[problem]])
    return out


def _parse_pre_text(block: str) -> Dict[str, Dict[str, int]]:
    # Supports both score-row and problem-row text layouts found across years.
    lines = [ln.strip() for ln in block.splitlines() if ln.strip()]

    out = {p: {} for p in PROBLEMS}
    for line in lines:
        m = re.match(r"^(10|9|8|7|6|5|4|3|2|1|0|NA|blank)\s+(.+)$", line, re.IGNORECASE)
        if not m:
            continue
        if "." in m.group(2):
            continue  # skip rank table rows with decimal ranks
        score = "NA" if m.group(1).lower() == "blank" else m.group(1).upper()
        nums = re.findall(r"\d+", m.group(2))
        if len(nums) >= 12:
            for i, problem in enumerate(PROBLEMS):
                out[problem][score] = int(nums[i])
    if all(len(out[p]) == len(SCORES) for p in PROBLEMS):
        return out

    out = {p: {} for p in PROBLEMS}
    score_order = ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1", "0", "NA"]
    for line in lines:
        m = re.match(r"^([AB])\s*-\s*([1-6])\s+(.+)$", line, re.IGNORECASE)
        if not m:
            continue
        problem = f"{m.group(1).upper()}{m.group(2)}"
        nums = re.findall(r"\d+", m.group(3))
        if len(nums) >= 12:
            for i, score in enumerate(score_order):
                out[problem][score] = int(nums[i])
    if all(len(out[p]) == len(SCORES) for p in PROBLEMS):
        return out

    # Handles flattened token streams where table row boundaries are lost.
    tokens = re.findall(r"[A-Za-z0-9-]+", block)
    expected = ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1", "0", "NA"]
    for width in (14, 13):
        for start in range(len(tokens)):
            t0 = tokens[start].upper()
            if t0 != "10":
                continue
            ok = True
            for k, lbl in enumerate(expected[:-1]):
                if start + k * width >= len(tokens) or tokens[start + k * width].upper() != lbl:
                    ok = False
                    break
            if not ok or start + 11 * width >= len(tokens):
                continue
            last = tokens[start + 11 * width].upper()
            if last not in {"NA", "BLANK"}:
                continue
            out = {p: {} for p in PROBLEMS}
            for k, lbl in enumerate(expected):
                s = "NA" if lbl == "NA" else lbl
                base = start + k * width + 1
                vals = tokens[base : base + 12]
                if len(vals) < 12 or not all(v.isdigit() for v in vals):
                    ok = False
                    break
                for i, problem in enumerate(PROBLEMS):
                    out[problem][s] = int(vals[i])
            if ok and all(len(out[p]) == len(SCORES) for p in PROBLEMS):
                return out

    raise ValueError("Could not parse full distribution from text block")


def compute_stats(year: int, top_n: int, counts_by_problem: Dict[str, Dict[str, int]]) -> List[Dict]:
    rows = []
    for problem in PROBLEMS:
        c = counts_by_problem[problem]
        perfect = c["10"]
        nonzero = sum(c[str(s)] for s in range(1, 11))
        na_count = c["NA"]
        attempted = top_n - na_count
        weighted_sum = sum(score * c[str(score)] for score in range(0, 11))

        rows.append(
            {
                "year": year,
                "population_top_n": top_n,
                "problem": problem,
                "perfect_solve_count": perfect,
                "perfect_solve_rate": perfect / top_n,
                "nonzero_score_count": nonzero,
                "nonzero_score_rate": nonzero / top_n,
                "attempted_count": attempted,
                "attempted_rate": attempted / top_n,
                "average_score": weighted_sum / top_n,
                "average_score_among_attempts": (weighted_sum / attempted) if attempted > 0 else None,
            }
        )
    return rows


def _resolve_population(year: int, title_top_n: int, counts_by_problem: Dict[str, Dict[str, int]]) -> int:
    totals = {problem: sum(counts_by_problem[problem][score] for score in SCORES) for problem in PROBLEMS}
    total_counts = Counter(totals.values())
    if total_counts == Counter({title_top_n: len(PROBLEMS)}):
        return title_top_n

    canonical_top_n = title_top_n
    mode_total, mode_freq = total_counts.most_common(1)[0]
    if mode_freq > 1 or title_top_n not in total_counts:
        canonical_top_n = mode_total

    for problem, total in totals.items():
        if total == canonical_top_n:
            continue
        delta = canonical_top_n - total
        adjusted_na = counts_by_problem[problem]["NA"] + delta
        if adjusted_na < 0:
            raise ValueError(f"Could not normalize {problem}: total={total}, target={canonical_top_n}")
        counts_by_problem[problem]["NA"] = adjusted_na

    if title_top_n != canonical_top_n or any(total != canonical_top_n for total in totals.values()):
        print(
            f"Warning: {year} source totals disagreed with title/top-N; using population {canonical_top_n} and normalizing NA counts"
        )
    return canonical_top_n


def scrape_putnam_year(year: int) -> pd.DataFrame:
    url = f"https://kskedlaya.org/putnam-archive/putnam{year}stats.html"
    resp = requests.get(url, headers=REQUEST_HEADERS, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    full_text = soup.get_text(" ", strip=True)
    top_match = re.search(r"Top\s+(\d+)\s+Contestants", full_text, flags=re.IGNORECASE)
    if not top_match:
        raise ValueError("Could not extract top-N")
    top_n = int(top_match.group(1))

    parsed = None
    for table in soup.find_all("table"):
        table_text = table.get_text(" ", strip=True)
        if "Frequency Distribution of Problem Scores" in table_text:
            try:
                parsed = _parse_html_table(table)
                break
            except Exception:
                pass

    if parsed is None:
        # Try any table that has score labels, in case title is outside the table.
        for table in soup.find_all("table"):
            table_text = table.get_text("\n", strip=True)
            if all(label in table_text for label in ["10", "0", "NA"]):
                try:
                    parsed = _parse_html_table(table)
                    break
                except Exception:
                    pass

    if parsed is None:
        for block in [t.get_text("\n", strip=True) for t in soup.find_all("table")] + [p.get_text("\n", strip=True) for p in soup.find_all("pre")]:
            try:
                parsed = _parse_pre_text(block)
                break
            except Exception:
                continue
    if parsed is None:
        raise ValueError("Could not parse score distribution table")

    resolved_top_n = _resolve_population(year, top_n, parsed)
    return pd.DataFrame(compute_stats(year, resolved_top_n, parsed))


def scrape_all_years() -> pd.DataFrame:
    frames = []
    for year in VALID_YEARS:
        try:
            frames.append(scrape_putnam_year(year))
            print(f"Parsed {year}")
        except Exception as exc:
            print(f"Warning: failed to parse {year}: {exc}")
    if not frames:
        return pd.DataFrame(
            columns=[
                "year",
                "population_top_n",
                "problem",
                "perfect_solve_count",
                "perfect_solve_rate",
                "nonzero_score_count",
                "nonzero_score_rate",
                "attempted_count",
                "attempted_rate",
                "average_score",
                "average_score_among_attempts",
            ]
        )
    return pd.concat(frames, ignore_index=True)


def main() -> None:
    df = scrape_all_years()
    df.to_csv("putnam_problem_stats_all_years.csv", index=False)

    summary = (
        df.groupby("problem", as_index=False)
        .agg(
            mean_perfect_solve_rate=("perfect_solve_rate", "mean"),
            mean_average_score=("average_score", "mean"),
        )
        .sort_values("problem")
    )

    pd.set_option("display.float_format", lambda x: f"{x:.4f}")
    print("\nSummary by problem:")
    print(summary.to_string(index=False))


if __name__ == "__main__":
    main()
