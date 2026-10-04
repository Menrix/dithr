import argparse
import json
import urllib.parse
import urllib.request

LOAD_URL = "https://lospec.com/palette-list/load"

def hex_to_rgb(h):
    h = h.strip().lstrip('#')
    r = int(h[0:2], 16)
    g = int(h[2:4], 16)
    b = int(h[4:6], 16)
    return r, g, b

def print_entry(slug, name, author, url, colors):
    print(f"'{slug}': {{")
    print(f"    name: '{name}',")
    print(f"    author: '{author}',")
    print(f"    url: '{url}',")
    print(f"    colors: [")
    for c in colors:
        r, g, b = hex_to_rgb(c)
        print(f"        [{r:3d}, {g:3d}, {b:3d}],  // #{c.upper()}")
    print("    ],")
    print("    devicePalettes: {},")
    print("},")

def process(url):
    json_url = url if url.endswith('.json') else url.rstrip('/') + '.json'

    with urllib.request.urlopen(json_url) as resp:
        data = json.load(resp)

    name = data['name']
    author = data['author']
    colors = data['colors']
    slug = name.lower().replace(' ', '-')

    print_entry(slug, name, author, url, colors)

def fetch_page(params):
    query = urllib.parse.urlencode(params)
    full_url = f"{LOAD_URL}?{query}"
    with urllib.request.urlopen(full_url) as resp:
        return json.load(resp)

def parse_downloads(v):
    try:
        return int(str(v).replace(',', ''))
    except (TypeError, ValueError):
        return 0

def batch(limit, color_filter, color_number, tag, sorting_type):
    count = 0
    page = 0
    fetched = []  # (slug, numberOfColors, downloads)

    while count < limit:
        params = {
            "colorNumberFilterType": color_filter,
            "colorNumber": color_number,
            "page": page,
            "tag": tag,
            "sortingType": sorting_type,
        }
        data = fetch_page(params)
        palettes = data.get("palettes", [])

        if not palettes:
            print(f"# no more results (page {page})")
            break

        for p in palettes:
            if count >= limit:
                break

            slug = p["slug"]
            name = p.get("title", slug)
            author = p.get("user", {}).get("name", "")
            colors = p["colors"]
            num_colors = p.get("numberOfColors", len(colors))
            downloads = parse_downloads(p.get("downloads", 0))
            url = f"https://lospec.com/palette-list/{slug}"

            print_entry(slug, name, author, url, colors)
            fetched.append((slug, num_colors, downloads))
            count += 1

        page += 1

    print(f"# fetched {count} palette(s)")

    print()
    for slug, _, _ in sorted(fetched, key=lambda t: (t[1], t[2]), reverse=True):
        print(f"'{slug}',")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--batch', action='store_true', help='fetch multiple palettes via palette-list/load')
    parser.add_argument('--limit', type=int, default=50, help='max number of palettes to fetch in batch mode')
    parser.add_argument('--colorFilter', default='max', help='colorNumberFilterType param, e.g. max/min/exact')
    parser.add_argument('--colorNumber', type=int, default=16, help='colorNumber param')
    parser.add_argument('--tag', default='', help='tag param')
    parser.add_argument('--sortingType', default='downloads', help='sortingType param')
    args = parser.parse_args()

    if args.batch:
        batch(args.limit, args.colorFilter, args.colorNumber, args.tag, args.sortingType)
        return

    while True:
        url = input("lospec palette URL: ").strip()
        if not url:
            continue
        try:
            process(url)
        except Exception as e:
            print(f"error: {e}")

if __name__ == "__main__":
    main()
