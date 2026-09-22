#!/usr/bin/env python3
"""Read only the relevant public FORMA catalog slice; no dependencies or uploads."""
import argparse
import json
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

GOALS = ('comparison', 'trend', 'composition', 'distribution', 'relationship',
         'uncertainty', 'research', 'spatial', 'flow', 'monitoring', 'scheduling')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--goal', choices=GOALS)
    action.add_argument('--chart', help='Stable chart ID, such as bar or paired')
    action.add_argument('--list', action='store_true', help='Read catalog directory')
    parser.add_argument('--language', choices=('en', 'zh-CN'), default='en')
    parser.add_argument('--base-url', default='https://forma.ovocode.xyz',
                        help='FORMA origin; HTTP allowed only for local preview')
    args = parser.parse_args()
    parts = urlsplit(args.base_url)
    if (parts.username or parts.password or parts.query or parts.fragment
            or parts.path not in ('', '/') or not parts.hostname
            or not (parts.scheme == 'https' or parts.scheme == 'http'
                    and parts.hostname in ('localhost', '127.0.0.1', '::1'))):
        parser.error('--base-url must be an HTTPS origin or an HTTP localhost origin')
    if args.chart and not re.fullmatch('[a-z][a-z0-9-]{0,63}', args.chart):
        parser.error('--chart must be a stable chart ID, not a path or URL')
    path = (f'chart-guides/{args.chart}.json' if args.chart else
            f'recommendations/{args.language}/{args.goal}.json' if args.goal else
            'chart-recommendations.json')
    try:
        request = Request(args.base_url.rstrip('/') + '/forma/' + path,
                          headers={'Accept': 'application/json', 'User-Agent': 'FORMA-Skill/1'})
        with urlopen(request, timeout=20) as response:
            body = response.read(2 * 1024 * 1024 + 1)
        if len(body) > 2 * 1024 * 1024:
            raise ValueError('Catalog response exceeded 2 MiB')
        data = json.loads(body)
        if not isinstance(data, dict) or data.get('schemaVersion') != 1:
            raise ValueError('Unsupported catalog schema; inspect the website Chart guide')
        if args.chart:
            if data.get('id') != args.chart:
                raise ValueError('Chart response does not match the requested ID')
            data = {k: data[k] for k in ('schemaVersion', 'release', 'id', 'url')} | data['locales'][args.language]
        elif args.goal and data.get('goal') != args.goal:
            raise ValueError('Catalog response does not match the requested goal')
        print(json.dumps(data, ensure_ascii=False, indent=2))
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError, TypeError) as error:
        print(f'Cannot read FORMA catalog: {error}. Use the visible Recommended use cases and Chart guide.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
