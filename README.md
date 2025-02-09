# Tower

product for Hackathon 2025-02-08 -> 2025-02-09.

## Release

see <https://tower-d5g.pages.dev/>

## Development / Deployment

```sh name=dev
nix-shell # or direnv allow
just i
just dev
```
```sh name=deploy
just i
just build
serve ./client/build
```

## LoC

```
===============================================================================
 Language            Files        Lines         Code     Comments       Blanks
===============================================================================
 CSS                     1            2            2            0            0
 HTML                    1           15           12            0            3
 JavaScript              2           28           21            4            3
 JSON                    4           99           99            0            0
 Nix                     1            8            8            0            0
 TypeScript             16          620          562           24           34
-------------------------------------------------------------------------------
 Markdown                3           88            0           64           24
 |- BASH                 2           12            7            3            2
 (Total)                            100            7           67           26
-------------------------------------------------------------------------------
 Svelte                  9          188          173            0           15
 |- CSS                  3           18           18            0            0
 |- JavaScript           9          140          126            0           14
 (Total)                            346          317            0           29
===============================================================================
 Total                  37         1048          877           92           79
===============================================================================
```
