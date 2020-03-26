# XHProf Analyzer

[![npm version](https://img.shields.io/npm/v/xhprof-analyzer.svg?colorB=brightgreen)](https://www.npmjs.com/package/xhprof-analyzer "Stable Version")
[![License](https://img.shields.io/npm/l/xhprof-analyzer.svg?maxAge=2592000?style=plastic)](https://github.com/litert/core/blob/master/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/litert/core.js.svg)](https://github.com/litert/core.js/issues)
[![GitHub Releases](https://img.shields.io/github/release/litert/core.js.svg)](https://github.com/litert/core.js/releases "Stable Release")

This is a simple tool to help analyze the output of PHP profiling extension [xhprof](https://github.com/tideways/php-xhprof-extension).

## Installation

```sh
npm install xhprof-analyzer --save
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
        ]) . PHP_EOL
    );
});
```

and then run this CLI from shell:

```sh
xhprof-analyze --top-avg-time-path-list /var/log/php-profile.log
```

> For more details list, see `xhprof-analyze --help`.

## Requirements

- Node.js v8.x (Or newer)
- TypeScript v3.1.x (Or newer)

## License

This library is published under [Apache-2.0](./LICENSE) license.
