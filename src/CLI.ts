#!/bin/env node
/**
 * Copyright 2020 Angus.Fenying <fenying@litert.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as $CLAP from '@litert/clap';
import { XHProfAnalyzer } from './Analyzer';
import * as C from './Common';

const INDEX_WIDTH = 8;
const AVG_TIME_WIDTH = 16;
const TIME_WIDTH = 16;
const TIME_PERCENT_WIDTH = 8;
const COUNT_WIDTH = 8;
const COUNT_PERCENT_WIDTH = 8;

const P_REQUESTS_WIDTH = 10;
const R_MAX_TIME_WIDTH = TIME_WIDTH;
const R_MIN_TIME_WIDTH = TIME_WIDTH;

class CLI {

    private _processClap(args: string[]): $CLAP.IResult | false {

        const parser = $CLAP.createGNUParser({
            arguments: {
                minimalInputs: 1
            }
        });

        parser.addOption({
            name: 'max-rows',
            shortcut: 'n',
            description: 'How many rows of top N to be displayed.'
        }).addOption({
            name: 'top-call-path-list',
            description: 'Display the most frequently called path list.',
            arguments: 0,
        }).addOption({
            name: 'top-time-path-list',
            description: 'Display the longest time called path list.',
            arguments: 0,
        }).addOption({
            name: 'top-avg-time-path-list',
            description: 'Display the longest average time called path list.',
            arguments: 0,
        }).addOption({
            name: 'top-called-request-list',
            description: 'Display the most frequently called request list.',
            arguments: 0,
        }).addOption({
            name: 'top-time-request-list',
            description: 'Display the longest time called request list.',
            arguments: 0,
        }).addOption({
            name: 'top-avg-time-request-list',
            description: 'Display the longest average time called request list.',
            arguments: 0,
        }).addOption({
            name: 'all-list',
            description: 'Display all list.',
            arguments: 0,
        });

        try {

            const result = parser.parse(args);

            if (result.help) {

                console.log('XHProf Analyzer v0.1.0');
                console.log('');
                console.log(parser.generateHelp('xhprof-analyze', result.help).join('\n'));
                return false;
            }

            return result;
        }
        catch {

            console.log('XHProf Analyzer v0.1.0');
            console.log('');
            console.log(parser.generateHelp('xhprof-analyze', '').join('\n'));
            return false;
        }
    }

    public main(args: string[]): void {

        let clap = this._processClap(args.slice(2));

        if (!clap) {

            return;
        }

        const result = (function(): C.IAnalyzeResult {

            const analyzer = new XHProfAnalyzer();

            for (let file of clap.arguments) {

                analyzer.loadFile(file);
            }

            return analyzer.analyze();
        })();

        const rows = parseInt(clap.options['max-rows']?.[0] ?? '100');

        if (clap.flags['all-list'] || clap.flags['top-call-path-list']) {

            this._listTopCalledPath(result, rows);
        }

        if (clap.flags['all-list'] || clap.flags['top-avg-time-path-list']) {

            this._listTopAvgTimePath(result, rows);
        }

        if (clap.flags['all-list'] || clap.flags['top-time-path-list']) {

            this._listTopTimePath(result, rows);
        }

        if (clap.flags['all-list'] || clap.flags['top-call-request-list']) {

            this._listTopCalledRequest(result, rows);
        }

        if (clap.flags['all-list'] || clap.flags['top-avg-time-request-list']) {

            this._listTopAvgTimeRequest(result, rows);
        }

        if (clap.flags['all-list'] || clap.flags['top-time-request-list']) {

            this._listTopTimeRequest(result, rows);
        }

        console.log(`Total Execution Time: ${(result.totalTime * 1000000).toFixed(3)}μs`);
        console.log(`Total Function Calls: ${result.totalCalls}`);
        console.log(`Total Request Calls: ${result.totalRequests}`);
    }

    protected _listTopCalledPath(rs: C.IAnalyzeResult, rows: number): void {

        this._printPathListHeader(`top ${rows} most frequently called paths`);

        this._printCallList(
            rs.calls.sort((a, b) => b.calledTimes - a.calledTimes),
            rs,
            rows
        );
    }

    protected _listTopAvgTimePath(rs: C.IAnalyzeResult, rows: number): void {

        this._printPathListHeader(`top ${rows} longest average time paths`);

        this._printCallList(
            rs.calls.sort((a, b) => b.wallTime / b.calledTimes - a.wallTime / a.calledTimes),
            rs,
            rows
        );
    }

    protected _listTopTimePath(rs: C.IAnalyzeResult, rows: number): void {

        this._printPathListHeader(`top ${rows} longest time paths`);

        this._printCallList(
            rs.calls.sort((a, b) => b.wallTime - a.wallTime),
            rs,
            rows
        );
    }

    protected _listTopCalledRequest(rs: C.IAnalyzeResult, rows: number): void {

        this._printRequestListHeader(`top ${rows} most frequently called requests`);

        this._printRequestList(
            rs.requests.sort((a, b) => b.count - a.count),
            rs,
            rows
        );
    }

    protected _listTopAvgTimeRequest(rs: C.IAnalyzeResult, rows: number): void {

        this._printRequestListHeader(`top ${rows} longest average time requests`);

        this._printRequestList(
            rs.requests.sort((a, b) => a.avgTime > b.avgTime ? -1 : 1),
            rs,
            rows
        );
    }

    protected _listTopTimeRequest(rs: C.IAnalyzeResult, rows: number): void {

        this._printRequestListHeader(`top ${rows} longest time requests`);

        this._printRequestList(
            rs.requests.sort((a, b) => b.totalTime - a.totalTime),
            rs,
            rows
        );
    }

    protected _printCallList(items: C.IAnalyzeResultCallItem[], rs: C.IAnalyzeResult, rows: number): void {

        let i = 1;

        for (const r of items.slice(0, rows)) {

            console.log(`${
                this._column(INDEX_WIDTH, i++)
            }${
                this._column(COUNT_WIDTH, r.calledTimes)
            }${
                this._column(COUNT_PERCENT_WIDTH, Math.floor(r.calledTimes / rs.totalCalls * 10000) / 100)
            }${
                this._column(TIME_WIDTH, r.wallTime)
            }${
                this._column(TIME_PERCENT_WIDTH, Math.floor(r.wallTime / (rs.totalTime * 1000000) * 10000) / 100)
            }${
                this._column(AVG_TIME_WIDTH, Math.floor(r.wallTime / r.calledTimes * 100) / 100)
            }${
                this._column(P_REQUESTS_WIDTH, r.requestCoverage)
            }${
                r.path
            }`);
        }
    }

    protected _printRequestList(items: C.IAnalyzeResultRequestItem[], rs: C.IAnalyzeResult, rows: number): void {

        let i = 1;

        for (const r of items.slice(0, rows)) {

            console.log(`${
                this._column(INDEX_WIDTH, i++)
            }${
                this._column(COUNT_WIDTH, r.count)
            }${
                this._column(COUNT_PERCENT_WIDTH, Math.floor(r.count / rs.totalRequests * 10000) / 100)
            }${
                this._column(TIME_WIDTH, Math.floor(r.totalTime * 100000000) / 100)
            }${
                this._column(TIME_PERCENT_WIDTH, Math.floor(r.totalTime / rs.totalTime * 10000) / 100)
            }${
                this._column(AVG_TIME_WIDTH, Math.floor(r.avgTime * 100000000) / 100)
            }${
                this._column(R_MAX_TIME_WIDTH, Math.floor(r.maxTime * 100000000) / 100)
            }${
                this._column(R_MIN_TIME_WIDTH, Math.floor(r.minTime * 100000000) / 100)
            }${
                r.path
            }`);
        }
    }

    protected _printPathListHeader(title: string): void {

        console.log(`\n> List of ${title}\n`);

        console.log(`${
            this._column(INDEX_WIDTH, '#')
        }${
            this._column(COUNT_WIDTH, 'Count')
        }${
            this._column(COUNT_PERCENT_WIDTH, 'Count%')
        }${
            this._column(TIME_WIDTH, 'Time')
        }${
            this._column(TIME_PERCENT_WIDTH, 'Time%')
        }${
            this._column(AVG_TIME_WIDTH, 'Avg Time')
        }${
            this._column(P_REQUESTS_WIDTH, 'Requests')
        }Path`);
    }

    protected _printRequestListHeader(title: string): void {

        console.log(`\n> List of ${title}\n`);

        console.log(`${
            this._column(INDEX_WIDTH, '#')
        }${
            this._column(COUNT_WIDTH, 'Count')
        }${
            this._column(COUNT_PERCENT_WIDTH, 'Count%')
        }${
            this._column(TIME_WIDTH, 'Time')
        }${
            this._column(TIME_PERCENT_WIDTH, 'Time%')
        }${
            this._column(AVG_TIME_WIDTH, 'Avg Time')
        }${
            this._column(R_MAX_TIME_WIDTH, 'Max Time')
        }${
            this._column(R_MIN_TIME_WIDTH, 'Min Time')
        }Path`);
    }

    protected _column(width: number, value: number | string): string {

        return value.toString().padEnd(width, ' ');
    }
}

const cli = new CLI();

cli.main(process.argv);
