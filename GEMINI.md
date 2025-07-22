## How to Use the Danbooru Artist Finder: A Complete Guide by Gemini 2.5 Pro

This guide will walk you through setting up and using this script to discover new artist styles for your image generation projects. We'll go through each step, from installation to configuring your searches and prompts.

### What Does This Script Do?

In simple terms, this script is an automated assembly line for style discovery:

1.  **It Searches Danbooru:** It uses your search query (e.g., `1boy solo`) to find a large number of posts.
2.  **It Gathers Artists:** From those posts, it collects a list of every artist's name.
3.  **It Filters Artists:** It then checks each artist individually to see if they have enough artwork that matches your specific criteria (e.g., at least 100 non-animated images). This ensures you're only testing artists who are well-represented.
4.  **It Generates Samples:** For each "good" artist that passes the filter, it generates sample images using prompts you've defined. This lets you see how well a model can replicate that artist's style.

This process saves you hours of manual searching and testing, allowing you to quickly build a library of interesting artist styles.

### Before You Begin: Prerequisites

Make sure you have the following ready:

1.  **Bun:** This script uses [Bun](https://bun.sh/) as its JavaScript runtime. If you don't have it, follow the installation instructions on their website. It's a single command.
2.  **Git:** You need Git to download (clone) the project files. [Download it here](https://git-scm.com/downloads) if you don't have it.
3.  **A Code Editor:** You'll need to edit a text file. [Visual Studio Code](https://code.visualstudio.com/) is highly recommended as it has great support for TypeScript out of the box.
4.  **API Access (Choose One):**
    *   **For NovelAI:** Your NovelAI API Token. You can get this from your account settings on the NovelAI website. It usually starts with `pst-...`.
    *   **For Stable Diffusion:** A local installation of a WebUI like [AUTOMATIC1111](https://github.com/AUTOMATIC1111/stable-diffusion-webui) or [Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge). You **must** launch it with the `--api` command-line argument to enable the API that the script needs to communicate with.

---

### Step 1: Getting the Code

First, you need to download the script and its dependencies.

1.  Open your terminal or command prompt.
2.  Clone the repository using Git:
    ```bash
    git clone https://github.com/zshallow/danbooru-artist-finder.git
    ```
3.  Navigate into the newly created folder:
    ```bash
    cd danbooru-artist-finder
    ```
4.  Install the one required package (`jszip`) using Bun:
    ```bash
    bun install
    ```

That's it! The project is now set up on your machine.

---

### Step 2: Configuring the Script

This is the most important step. Open the `src/index.ts` file in your code editor. All the settings you need to change are conveniently located in the `// CONFIG //` section at the top.

Let's go through each part.

#### **Danbooru Settings**

These settings control how the script connects to Danbooru.

```ts
// your danbooru API key
const DANBOORU_API_KEY: string | undefined = undefined;
// your danbooru account name (associated with the API key)
const DANBOORU_LOGIN: string | undefined = undefined;
```

*   **Why use an API Key?** You can run the script without one, but you'll be limited to 2 requests per second. With a free Danbooru account and an API key, this limit is raised, making the script run faster and more reliably.
*   **How to get it:**
    1.  Create a Danbooru account.
    2.  Go to your "My Account" page.
    3.  Scroll down to "API Key" and click "Manage API Key".
    4.  Copy your key and your login name into these fields. For example:
        ```ts
        const DANBOORU_API_KEY: string | undefined = "yourReallyLongApiKey";
        const DANBOORU_LOGIN: string | undefined = "YourDanbooruUsername";
        ```

#### **Search and Filter Settings**

This is where you define *what* you're looking for.

```ts
// your search query to find artists
const SEARCH_QUERY: string = "1boy solo"
// number of pages that will be loaded
const PAGE_COUNT: number = 1
// number of results per page (max 200)
const RESULTS_PER_PAGE: number = 200;
```

*   `SEARCH_QUERY`: This is the **initial search** to gather a large pool of artists. Use broad tags here. Examples: `1girl solo rating:safe`, `scenery sunset`, `mecha`.
*   `PAGE_COUNT` & `RESULTS_PER_PAGE`: These multiply to determine how many posts to check. `PAGE_COUNT: 1` and `RESULTS_PER_PAGE: 200` will check 200 posts. `PAGE_COUNT: 5` will check 1000 posts. More posts = more artists found.

```ts
// your search query to see how many pieces an artist has
const ARTIST_SEARCH_QUERY: string = "__ARTIST_NAME__ -animated"
// how many resulsts you want for this second query
const ARTIST_SEARCH_MIN: number = 100
```
*   `ARTIST_SEARCH_QUERY`: This is the **filter query**. For each artist found, the script runs this search to see if they're worth testing. The `__ARTIST_NAME__` part is a placeholder that gets automatically replaced.
    *   Example: `__ARTIST_NAME__ 1girl rating:g -animated -comic` will check how many safe, non-animated, non-comic images of single girls the artist has.
*   `ARTIST_SEARCH_MIN`: This is the **minimum post count** for an artist to be considered "good". If an artist has fewer than this many posts matching your filter query, they are skipped.
    * `100` is a good starting point. Lower it if you want to test more obscure artists; raise it if you only want extremely prolific artists.

#### **Prompt Settings**

Define the exact prompts you want to generate.

```ts
const PROMPTS: Map<string, string> = new Map(Object.entries({
    "random_boy": "__ARTIST_NAME__, 1boy, solo, brown hair, smug, looking at viewer, portrait",
    "random_girl": "__ARTIST_NAME__, 1girl, solo, brown hair, smug, looking at viewer, portrait",
}));
```

*   This is a list of named prompts.
*   The part on the aleft (`"random_boy"`) becomes part of the output filename.
*   The part on the right is the actual prompt sent to the image generator.
*   `__ARTIST_NAME__` is the placeholder for the artist's name. Place it where you normally would in your prompt (usually at the beginning).
*   **Pro Tip:** Add your standard quality tags here (e.g., `masterpiece, best quality, ...`) just as you would in your image generator.

#### **Backend & Generation Settings (Choose NAI or SDXL)**

First, tell the script which service you're using.

```ts
// whether or not to use NovelAI instead of reForge
const USE_NAI: boolean = true
```

*   Set `USE_NAI: true` to use NovelAI.
*   Set `USE_NAI: false` to use a local Stable Diffusion WebUI.

**If using NovelAI (`USE_NAI: true`):**

```ts
// your NAI token here
const NAI_TOKEN: string = "pst-your-key-here"
// the request body
const NAI_SETTINGS = { ... }
```

*   `NAI_TOKEN`: **This is essential.** Paste your NovelAI API token here.
*   `NAI_SETTINGS`: This object contains all your generation parameters (model, resolution, sampler, steps, etc.). The easiest way to configure this is to:
    1.  Generate an image on the NovelAI website with your desired settings.
    2.  Open your browser's Developer Tools (F12 key).
    3.  Go to the "Network" tab.
    4.  Find the `generate-image` request, right-click it, and copy the "Request Payload" or "Request Body".
    5.  Paste it over the existing `NAI_SETTINGS` object in the script. The script will handle filling in the prompt automatically.

**If using Stable Diffusion (`USE_NAI: false`):**

```ts
// your SDXL url, all the way to txt2img endpoint
const SDXL_URL: string = "http://localhost:7860/sdapi/v1/txt2img"
// ...
const SDXL_SETTINGS = { ... }
```

*   `SDXL_URL`: Make sure this URL matches your local setup. The default for A1111 is `http://localhost:7860`, but Forge often uses `http://localhost:7861`.
*   `SDXL_SETTINGS`: These are your generation parameters. You can adjust `width`, `height`, `sampler_name`, `steps`, `cfg_scale`, etc., to match the settings you use in your WebUI.

---

### Step 3: Running the Script

Once you've saved your configuration changes in `src/index.ts`, it's time to run it.

1.  Go back to your terminal (it should still be in the project directory).
2.  Run the script with this command:
    ```bash
    bun src/index.ts
    ```
3.  Now, just watch it work! The terminal will show:
    *   A list of all artists found in the initial search.
    *   A filtered list of "GOOD" artists who passed your minimum post count check.
    *   The script will then pause and generate images for each artist and each prompt, one by one.

---

### Step 4: Checking the Results

All your generated images will be saved in the folder specified by `OUTPUT_FOLDER` (default is `./outputs`).

The files will be named in a clear format: `artist_name-prompt_name-0.png`.

For example: `sakimichan-random_girl-0.png`

Now you can browse the images and see which artist styles you like and which ones work well with the model!

---

### Troubleshooting & Common Issues

*   **Error from A1111/Forge:** If you get a "fetch failed" or connection error, make sure you launched the WebUI with the `--api` flag. Also, double-check that the `SDXL_URL` in the script matches the URL in your browser.
*   **Error from NovelAI:** If you get a `401 Unauthorized` error, your `NAI_TOKEN` is incorrect or has expired. A `429` error means you're being rate-limited; the script has a built-in delay, but you might need to wait a few minutes before trying again.
*   **No "GOOD" Artists Found:** If the script finds artists but the "GOOD artists" list is empty, your filters are likely too strict. Try lowering `ARTIST_SEARCH_MIN` or making `ARTIST_SEARCH_QUERY` less specific.
*   **Script Stops with a Danbooru Error:** If you're not using an API key, you may have hit the public rate limit. Consider adding your API key and login to the config.
