# Data Sources

All data files in this directory were last pulled on **2026-03-11**.

## Files

| File                              | Source                               | Notes                                                            |
| --------------------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| `csrankings-schools.json`         | [CSRankings](https://csrankings.org) | ~190 schools with CS-specific rankings                           |
| `niche-schools.json`              | [Niche](https://niche.com)           | ~356 schools with grades, tuition, earnings                      |
| `schools.json`                    | Merged/curated                       | 100 hand-curated schools with short slugs, used for detail pages |
| `csrankings-raw.json`             | CSRankings                           | Raw data before processing                                       |
| `csrankings-missing-profiles.txt` | —                                    | Schools in CSRankings with no Niche profile match                |

## When to repull

Niche grades, tuition figures, and earnings data change yearly (usually updated each fall).
CSRankings updates continuously but major reshuffles happen annually.
Consider repulling if data is more than ~12 months old.
