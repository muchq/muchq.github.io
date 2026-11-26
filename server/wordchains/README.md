The Cloudflare Worker hosts `POST /api/wordchains/solo`. It builds the
dictionary in the Worker and returns the endpoints, move results, or a single
Quick Play hint. The UTC date drives the daily puzzle on the server.

The data in `words.ts` comes from
[MoonBase at 16ddaaa](https://github.com/muchq/MoonBase/tree/16ddaaaa96c446cb862ccd8f5ad1097be593aa5d/domains/games).
The words are the sorted 3–5 letter subset of the public-domain
[ENABLE list pinned by Bazel](https://github.com/muchq/MoonBase/blob/16ddaaaa96c446cb862ccd8f5ad1097be593aa5d/bazel/tools.MODULE.bazel#L42-L50)
with the archaic and reviewed variants removed. The endpoints are the
intersection with `libs/wordchain_race/common_words.txt`.
Update the two lists together and keep the SCOWL copyright notice with them.
