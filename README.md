# XHProf Analyzer

[![npm version](https://img.shields.io/npm/v/xhprof-analyzer.svg?colorB=brightgreen)](https://www.npmjs.com/package/xhprof-analyzer "Stable Version")
[![License](https://img.shields.io/npm/l/xhprof-analyzer.svg?maxAge=2592000?style=plastic)](https://github.com/fenying/xhprof-analyzer/blob/master/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/fenying/xhprof-analyzer.js.svg)](https://github.com/fenying/xhprof-analyzer.js/issues)
[![GitHub Releases](https://img.shields.io/github/release/fenying/xhprof-analyzer.js.svg)](https://github.com/fenying/xhprof-analyzer.js/releases "Stable Release")

This is a simple tool to help analyze the output of PHP profiling extension [xhprof](https://github.com/tideways/php-xhprof-extension).

## Installation

```sh
npm install xhprof-analyzer -g
```

## Usage

In PHP file, add following code at the beginning.

```php
<?php

tideways_xhprof_enable();

$startTime = microtime(true);

register_shutdown_function(function() use ($startTime) {

    file_put_contents(
        '/var/log/php-profile.log',
        json_encode([
            'data' => tideways_xhprof_disable(),
            'totalTime' => microtime(true) - $startTime,
            'request' => $_SERVER['REQUEST_URI']
        ]) . PHP_EOL,
        FILE_APPEND
    );
});
```

and then run this CLI from shell:

```sh
xhprof-analyze --top-avg-time-path-list /var/log/php-profile.log
```

> For more details list, see `xhprof-analyze --help`.

## Custom List

Use following command:

```sh
xhprof-analyze --list "type:<LIST-TYPE>;name:<LIST-TITLE>;columns:<COLUMNS>;sort:<SORT-BY>;rows:<MAX-ROWS>' <FILE-NAME>
```

For each variables,

- `<LIST-TYPE>` is the type of list, only following type is supported:
    - `path`
    - `request`
- `<LIST-TITLE>` **Optional**. is the displayed title of list. (don't include `";"`). Default: `Custom List #N`
- `<COLUMNS>` **Optional**. is the columns to be displayed in the list, could be combination of following items:
    - `index` The line No. of row in the list.
    - `count` The requested/called count of requests/paths.
    - `count%` The percentage of `count` in all requests.
    - `time` The average time of path calling or requesting.
    - `time%` The percentage of `time` in all requests.
    - `avg-time` The average time of path calling or requesting.
    - `avg-call` The average calls of the path in each request involved the path.
    - `max-time` The maximum time of the path in all requests involved the path.
    - `min-time` The minimum time of the path in all requests involved the path.
    - `max-call` The maximum calls of the path in all requests involved the path.
    - `min-call` The minimum calls of the path in all requests involved the path.
    - `call-coverage` How many kinds of requests involved the call.
    - `called-requests` How many requests involved the call.
    - `path` The called path or request path.
- `<SORT-BY>` **Optional**. The sorting columns, could be combination of any columns in `<COLUMNS>` excepting `index` and `path`. Default: `time`.
- `<MAX-ROWS>` **Optional**. The maximum rows of list output. Default: 100.

## Requirements

- Node.js v8.x (Or newer)
- TypeScript v3.1.x (Or newer)

## License

This library is published under [Apache-2.0](./LICENSE) license.
