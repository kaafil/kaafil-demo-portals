# Why `app/globals.css` is excluded from Biome

Biome's CSS parser does not understand Tailwind v4's `@theme` at-rule, and
`app/globals.css` is almost entirely `@theme inline`. Biome reports it as a
parse error and then refuses to format the file.

The options were: drop `@theme inline` (no — it is what makes the token layer
work, see the file's own header), stop running Biome on CSS at all (no — it
still formats `styles/tokens.css` and `styles/kaafil-bridge.css`, which are the
two files a client branch actually edits), or exclude the one file that uses a
syntax Biome cannot parse.

The third. It is one file, the exclusion is named in `biome.json`, and this note
exists so the next person does not spend twenty minutes re-deriving it.
