import JSZip from "jszip";

// CONFIG //

// danbooru URL. Should be left at default
const DANBOORU_URL: string = "https://danbooru.donmai.us"
// your danbooru API key
const DANBOORU_API_KEY: string | undefined = undefined;
// your danbooru account name (associated with the API key)
const DANBOORU_LOGIN: string | undefined = undefined;
// your search query to find artists
const SEARCH_QUERY: string = "1boy solo"
// number of pages that will be loaded
const PAGE_COUNT: number = 1
// number of results per page
// HAS TO BE LOWER OR EQUAL TO 200
// (there's no reason not to use 200 here BTW)
const RESULTS_PER_PAGE: number = 10;
// your search query to see how many pieces an artist has
// for example, filtering out anything animated since it probably
// won't make it into finetune datasets
const ARTIST_SEARCH_QUERY: string = "__ARTIST_NAME__ -animated"
// how many resulsts you want for this second query
// HAS TO BE LOWER OR EQUAL TO 200
const ARTIST_SEARCH_MIN: number = 100

// follow along the format
// ask Gemini for help if you're lost
// __ARTIST_NAME__ gets replaced by the actual artist name on the prompt
const PROMPTS: Map<string, string> = new Map(Object.entries({
    "random_boy": "__ARTIST_NAME__, 1boy, solo, brown hair, smug, looking at viewer, portrait",
    "random_girl": "__ARTIST_NAME__, 1girl, solo, brown hair, smug, looking at viewer, portrait",
}));

// output folder for your gens
const OUTPUT_FOLDER: string = "./outputs"

// whether or not to use NovelAI
const USE_NAI: boolean = true

// NAI API url all the way to the image gen endpoint
// probably should leave it alone
const NAI_URL: string = "https://image.novelai.net/ai/generate-image"
// your NAI token here
const NAI_TOKEN: string = "pst-your-key-here"
// the request body
// if you're confused, consider genning an image on NAI with your browser,
// going to the network tab, copying the request body and pasting it over this
// object
const NAI_SETTINGS = {
    input: "", // prompt will replace this field in a minute
    model: "nai-diffusion-4-5-full",
    action: "generate",
    parameters: {
        params_version: 3,
        width: 832,
        height: 1216,
        scale: 5,
        sampler: "k_euler_ancestral",
        steps: 28,
        n_samples: 1,
        ucPreset: 0,
        qualityToggle: false,
        autoSmea: false,
        dynamic_thresholding: false,
        controlnet_strength: 1,
        legacy: false,
        add_original_image: true,
        cfg_rescale: 0.2,
        noise_schedule: "karras",
        legacy_v3_extend: false,
        skip_cfg_above_sigma: null,
        use_coords: true,
        normalize_reference_strength_multiple: true,
        inpaintImg2ImgStrength: 1,
        seed: 0,
        legacy_uc: false,
        characterPrompts: [],
        negative_prompt: "nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page",
        deliberate_euler_ancestral_bug: false,
        prefer_brownian: true,
        v4_prompt: {
            caption: {
                base_caption: "", // also gets replaced
                char_captions: []
            },
            use_coords: true,
            use_order: true,
        },
        v4_negative_prompt: {
            caption: {
                base_caption: "nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page",
                char_captions: []
            },
            legacy_uc: false
        },
    },
    use_new_shared_trial: true,
}

// your SDXL url, all the way to txt2img endpoint
// probably want to leave it alone
const SDXL_URL: string = "http://localhost:7860/sdapi/v1/txt2img"
// you'll have to look at the SDXL api docs to figure out the weird fields on this one sorry
const SDXL_SETTINGS = {
    prompt: "", // gets replaced by the prompt in a minute
    negative_prompt: "worst quality, low quality, old, watermark, signature",
    seed: -1,
    subseed: -1,
    sampler_name: "Euler Ancestral CFG++",
    scheduler: "SGM Uniform",
    batch_size: 1,
    n_iter: 1,
    steps: 26,
    cfg_scale: 1.8,
    width: 896,
    height: 1152,
    restore_faces: false,
    tiling: false,
    do_not_save_samples: true,
    do_not_save_grid: true,
    eta: 0,
    denoising_strength: 0.4,
    s_min_uncond: 0,
    s_churn: 0,
    s_tmax: 0,
    s_tmin: 0,
    s_noise: 1,
    override_settings: {},
    override_settings_restore_afterwards: true,
    refiner_checkpoint: "",
    refiner_switch_at: 0,
    disable_extra_networks: false,
    comments: {},
    enable_hr: false,
    hr_scale: 2,
    hr_upscaler: "R-ESRGAN 4x+ Anime6B",
    hr_second_pass_steps: 12,
    hr_cfg: 1.8,
    send_images: true, // do not change
    save_images: false,
    alwayson_scripts: {},
}

// ACTUAL CODE //

async function main(): Promise<void> {
    const allArtists = new Set<string>();

    for (let page = 0; page < PAGE_COUNT; page++) {
        const reqParams = new URLSearchParams();
        reqParams.append("page", page.toString())
        reqParams.append("tags", SEARCH_QUERY);
        reqParams.append("limit", RESULTS_PER_PAGE.toString());

        if (DANBOORU_API_KEY && DANBOORU_LOGIN) {
            reqParams.append("api_key", DANBOORU_API_KEY)
            reqParams.append("login", DANBOORU_LOGIN)
        }

        const res = await fetch(`${DANBOORU_URL}/posts.json?${reqParams.toString()}`);
        if (!res.ok) {
            throw new Error(`Error performing request! Status: ${res.statusText}, Message: ${await res.text()}`);
        }

        const posts: { tag_string_artist: string }[] = await res.json();
        for (const post of posts) {
            for (const artist of post.tag_string_artist.trim().split(" ")) {
                if (artist === "") {
                    continue;
                }

                allArtists.add(artist);
            }
        }

        if (posts.length < RESULTS_PER_PAGE) {
            break;
        }
    }

    console.debug("All artists:");
    console.debug(JSON.stringify(Array.from(allArtists), null, 2));

    const goodArtists = new Set<string>();
    for (const artist of allArtists) {
        const reqParams = new URLSearchParams();

        reqParams.append("page", "0");
        reqParams.append("tags", ARTIST_SEARCH_QUERY.replaceAll("__ARTIST_NAME__", artist));
        reqParams.append("limit", ARTIST_SEARCH_MIN.toString());

        if (DANBOORU_API_KEY && DANBOORU_LOGIN) {
            reqParams.append("api_key", DANBOORU_API_KEY)
            reqParams.append("login", DANBOORU_LOGIN);
        }

        const res = await fetch(`${DANBOORU_URL}/posts.json?${reqParams.toString()}`);
        if (!res.ok) {
            throw new Error(`Error performing request! Status: ${res.statusText}, Message: ${await res.text()}`);
        }

        const posts: {}[] = await res.json();

        if (posts.length < ARTIST_SEARCH_MIN) {
            continue
        }

        goodArtists.add(artist);
    }

    console.debug("GOOD artists:");
    console.debug(JSON.stringify(Array.from(goodArtists), null, 2));

    for (const artist of goodArtists) {
        let artistForPrompt = artist
            .replaceAll("_", " ");
        if (!USE_NAI) {
            artistForPrompt = artist
                .replaceAll("(", "\\(")
                .replaceAll(")", "\\)");
        }

        for (const [ promptName, prompt ] of PROMPTS) {
            const promptString = prompt.replaceAll("__ARTIST_NAME__", artistForPrompt);

            if (USE_NAI) {
                NAI_SETTINGS.input = promptString
                NAI_SETTINGS.parameters.v4_prompt.caption.base_caption = promptString

                // we do a little bit of waiting to avoid throttling the API
                await new Promise(resolve => {
                    setTimeout(resolve, 1000 + Math.random() * 5000);
                })

                const res = await fetch(NAI_URL, {
                    method: "POST",
                    body: JSON.stringify(NAI_SETTINGS),
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${NAI_TOKEN}`
                    }
                });

                if (!res.ok) {
                    throw new Error(`Error with the NAI request! Status: ${res.statusText}, message: ${await res.text()}`);
                }

                const zipArrayBuffer = await res.arrayBuffer();
                const zip = await JSZip.loadAsync(zipArrayBuffer);

                const promises: Promise<number>[] = [];
                let fileCounter = 0;
                zip.forEach((path, file): void => {
                    if (file.dir) {
                        return;
                    }

                    promises.push(file.async('blob').then(blob => {
                        return Bun.write(`${OUTPUT_FOLDER}/${artist}-${promptName}-${fileCounter++}.png`, blob, {
                            createPath: true,
                        });
                    }));
                });

                await Promise.all(promises);
            } else {
                SDXL_SETTINGS.prompt = promptString

                // we do no waiting
                const res = await fetch(SDXL_URL, {
                    method: "POST",
                    body: JSON.stringify(SDXL_SETTINGS),
                    headers: {
                        "Content-Type": "application/json",
                    }
                });

                if (!res.ok) {
                    throw new Error(`Error genning image in SDXL! Status: ${res.statusText}, message: ${await res.text()}`);
                }

                const r = await res.json();
                if (r.images && r.images.length > 0) {
                    for (let fileCounter = 0; fileCounter < r.images.length; fileCounter++) {
                        const data = Buffer.from(r.images[fileCounter], 'base64');
                        await Bun.write(`${OUTPUT_FOLDER}/${artist}-${promptName}-${fileCounter}.png`, data, {
                            createPath: true
                        });
                    }
                }
            }
        }
    }
}

main().catch(err => console.error(err));