# Artist Finder

This is a quick script for, in order:

- loading up a list of artists from danbooru
- running some quick checks if they have enough pieces for your preferred image gen platform
- genning images according to preset prompts to check if they produce good styles

## How to Use

git clone the project: `git clone https://github.com/zshallow/danbooru-artist-finder.git`

Ensure you have https://bun.sh/ installed

Run `bun i` on the project root

Edit `src/index.ts` at your leisure (it's a single file and thoroughly commented. Pasting it onto your
preferred LLM and asking them for help with config or any bugs is both encouraged and intended)

Run the script with `src/index.ts`

## Important

For reforge or whatever a111-based webui you use, you'll probably have to pass the `--api` command line option
on start, or it won't expose the API at all.

## Less important

This should have been a `gist` but I need exactly one (1) package to handle fucking zip files kill me
right now.