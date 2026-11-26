The solo game uses the iOS Word Chains dictionary and puzzle endpoints from
[MoonBase at 16ddaaa](https://github.com/muchq/MoonBase/tree/16ddaaaa96c446cb862ccd8f5ad1097be593aa5d/domains/games).

- `public/wordchains/words.txt` is the sorted 3–5 letter subset of the public-domain
  [ENABLE list pinned by Bazel](https://github.com/muchq/MoonBase/blob/16ddaaaa96c446cb862ccd8f5ad1097be593aa5d/bazel/tools.MODULE.bazel#L42-L50)
  after removing the entries in `archaic_variants.txt` and `reviewed_variants.txt`
  from `libs/wordchain_race`.
- `public/wordchains/puzzle-words.txt` is the intersection of those words and
  `libs/wordchain_race/common_words.txt`. The SCOWL copyright notice ships
  alongside it.

Update the two lists together when adopting a new iOS dictionary. Daily puzzles
depend on the sorted endpoint list and the length of the shortest path.
