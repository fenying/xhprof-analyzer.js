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
import * as TyG from '@litert/typeguard';

type TColumnApply<T> = Record<
    'index' | 'count' | 'count%' | 'time' | 'time%' |
    'avg-time' | 'avg-call' | 'max-time' | 'min-time' |
    'max-call' | 'min-call' | 'call-coverage' | 'called-requests' |
    'path',
    T
>;

interface IColumnConfig {
    name: string;
    width: number;
    nonSortable?: boolean;
    allow: Array<ICustomListOptions['type']>;
    outExpr(v: string, rs: string, type: ICustomListOptions['type']): string;
    expr(v: string, rs: string, type: ICustomListOptions['type']): string;
}

type IListFunction = (rs: C.IAnalyzeResult) => void;

const COLUMN_INFO: TColumnApply<IColumnConfig> = {

    'index': {
        'name': '#',
        'width': 8,
        'allow': ['path', 'request'],
        'nonSortable': false,
        'outExpr': () => 'i++',
        'expr': () => 'i++',
    },
    'count': {
        'name': 'Count',
        'width': 12,
        'allow': ['path', 'request'],
        'outExpr': (v, rs, t) => t === 'path' ? `${v}.totalCalledTimes` : `${v}.count`,
        'expr': (v, rs, t) => t === 'path' ? `${v}.totalCalledTimes` : `${v}.count`,
    },
    'count%': {
        'name': 'Count%',
        'width': 8,
        'allow': ['path', 'request'],
        'outExpr': (v, rs, t) => `(Math.floor(${
            t === 'path' ? `${v}.totalCalledTimes` : `${v}.count`
        } / ${rs}.totalCalls * 10000) / 100).toFixed(2)`,
        'expr': (v, rs, t) => `${
            t === 'path' ? `${v}.totalCalledTimes` : `${v}.count`
        } / ${rs}.totalCalls`,
    },
    'time': {
        'name': 'Time',
        'width': 16,
        'allow': ['path', 'request'],
        'outExpr': (v, rs, t) => t === 'path' ? `${v}.totalTime` : `(${v}.totalTime * 1e6).toFixed(2)`,
        'expr': (v, rs, t) => t === 'path' ? `${v}.totalTime` : `${v}.totalTime * 1e6`,
    },
    'time%': {
        'name': 'Time%',
        'width': 8,
        'allow': ['path', 'request'],
        'outExpr': (v, rs, t) => t === 'path' ?
            `(Math.floor(${v}.totalTime / (${rs}.totalTime * 1e6) * 10000) / 100).toFixed(2)` :
            `(Math.floor(${v}.totalTime / ${rs}.totalTime * 10000) / 100).toFixed(2)`,
        'expr': (v, rs, t) => t === 'path' ? `${v}.totalTime * 1e6 / ${rs}.totalTime` : `${v}.totalTime / ${rs}.totalTime`,
    },
    'avg-call': {
        'name': 'Avg Calls',
        'width': 12,
        'allow': ['path'],
        'outExpr': (v) => `${v}.avgCalledTimes.toFixed(2)`,
        'expr': (v) => `${v}.avgCalledTimes.toFixed(2)`,
    },
    'max-call': {
        'name': 'Max Calls',
        'width': 12,
        'allow': ['path'],
        'outExpr': (v) => `${v}.maxCalledTimes`,
        'expr': (v) => `${v}.maxCalledTimes`,
    },
    'min-call': {
        'name': 'Min Calls',
        'width': 12,
        'allow': ['path'],
        'outExpr': (v) => `${v}.minCalledTimes`,
        'expr': (v) => `${v}.minCalledTimes`,
    },
    'avg-time': {
        'name': 'Avg Time',
        'width': 14,
        'allow': ['path', 'request'],
        'outExpr': (v, rs, t) => t === 'path' ? `${v}.avgTime.toFixed(2)` :  `(${v}.avgTime * 1e6).toFixed(2)`,
        'expr': (v) => `${v}.avgTime.toFixed(2)`,
    },
    'max-time': {
        'name': 'Max Time',
        'width': 14,
        'allow': ['path', 'request'],
        'outExpr': (v, rs, t) => t === 'path' ? `${v}.maxTime.toFixed(2)` :  `(${v}.maxTime * 1e6).toFixed(2)`,
        'expr': (v) => `${v}.maxTime.toFixed(2)`,
    },
    'min-time': {
        'name': 'Min Time',
        'width': 14,
        'allow': ['path', 'request'],
        'outExpr': (v, rs, t) => t === 'path' ? `${v}.minTime.toFixed(2)` :  `(${v}.minTime * 1e6).toFixed(2)`,
        'expr': (v) => `${v}.minTime.toFixed(2)`,
    },
    'call-coverage': {
        'name': 'Coverage',
        'width': 10,
        'allow': ['path'],
        'outExpr': (v) => `${v}.requestCoverage`,
        'expr': (v) => `${v}.requestCoverage`,
    },
    'called-requests': {

        'name': 'Requests',
        'width': 10,
        'allow': ['path'],
        'outExpr': (v) => `${v}.requests`,
        'expr': (v) => `${v}.requests`,
    },
    'path': {
        'name': 'Path',
        'width': 10,
        'nonSortable': false,
        'allow': ['path', 'request'],
        'outExpr': (v) => `${v}.path`,
        'expr': (v) => `${v}.path`,
    }
};

const DEFAULT_COLUMNS = 'index,count,count%,time,time%,path';
const DEFAULT_SORT_COLUMNS = 'count,time';

const BUILT_IN_PATH_LIST_COLS = 'index,count,count%,avg-call,max-call,min-call,time,time%,avg-time,max-time,min-time,call-coverage,called-requests,path';
const BUILT_IN_REQ_LIST_COLS = 'index,count,count%,time,time%,avg-time,max-time,min-time,path';

interface ICustomListOptions {

    type: 'path' | 'request';

    name: string;

    rows: number;

    sort: string;

    columns: string;
}

const isCustomOptions = TyG.createInlineCompiler().compile<ICustomListOptions>({
    rule: ['$.string', {
        'type': ['==path', '==request'],
        'name?': 'string',
        'rows?': 'uint',
        'sort?': 'string',
        'columns?': 'string',
    }]
});

class CLI {

    private _version: string;

    public constructor() {

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        this._version = require('../package.json').version;
    }

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
            name: 'top-referred-path-list',
            description: 'Display the most requests referred path list.',
            arguments: 0,
        }).addOption({
            name: 'top-called-request-list',
            description: 'Display the most frequently called request list.',
            arguments: 0
        }).addOption({
            name: 'top-time-request-list',
            description: 'Display the longest time called request list.',
            arguments: 0,
        }).addOption({
            name: 'top-avg-time-request-list',
            description: 'Display the longest average time called request list.',
            arguments: 0,
        }).addOption({
            name: 'list',
            description: 'Customize the list, see details on https://github.com/fenying/xhprof-analyzer.js/blob/master/README.md.',
            arguments: -1,
        }).addOption({
            name: 'all-list',
            description: 'Display all the built-in list.',
            arguments: 0,
        });

        try {

            const result = parser.parse(args);

            if (result.help) {

                console.log(`XHProf Analyzer v${this._version}`);
                console.log('');
                console.log(parser.generateHelp('xhprof-analyze', result.help).join('\n'));
                return false;
            }

            return result;
        }
        catch {

            console.log(`XHProf Analyzer v${this._version}`);
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

        const rows = parseInt(clap.options['max-rows']?.[0] ?? '100');

        const fns: IListFunction[] =[];

        if (clap.flags['all-list'] || clap.flags['top-call-path-list']) {

            fns.push(this._listTopCalledPath(rows));
        }

        if (clap.flags['all-list'] || clap.flags['top-avg-time-path-list']) {

            fns.push(this._listTopAvgTimePath(rows));
        }

        if (clap.flags['all-list'] || clap.flags['top-time-path-list']) {

            fns.push(this._listTopTimePath(rows));
        }

        if (clap.flags['all-list'] || clap.flags['top-referred-path-list']) {

            fns.push(this._listTopReferredPath(rows));
        }

        if (clap.flags['all-list'] || clap.flags['top-call-request-list']) {

            fns.push(this._listTopCalledRequest(rows));
        }

        if (clap.flags['all-list'] || clap.flags['top-avg-time-request-list']) {

            fns.push(this._listTopAvgTimeRequest(rows));
        }

        if (clap.flags['all-list'] || clap.flags['top-time-request-list']) {

            fns.push(this._listTopTimeRequest(rows));
        }

        if (clap.options['list']) {

            let listNo = 0;
            for (const item of clap.options['list']) {

                const vars = item.split(';').map((v) => {
                    const [ name, value ] = v.trim().split('=');

                    return { name, value };
                });

                const opts: ICustomListOptions = {
                    type: vars.find((v) => v.name === 'type')?.value as any,
                    name: vars.find((v) => v.name === 'name')?.value ?? `Custom List #${listNo++}`,
                    columns: vars.find((v) => v.name === 'columns')?.value ?? DEFAULT_COLUMNS,
                    sort: vars.find((v) => v.name === 'sort')?.value ?? DEFAULT_SORT_COLUMNS,
                    rows: parseInt(
                        vars.find((v) => v.name === 'rows')?.value ?? '100'
                    ),
                };

                if (!isCustomOptions(opts)) {

                    console.warn(`Invalid list: --list "${item}"`);
                }

                const fn = this._createListFn(opts);

                if (fn instanceof Error) {

                    console.warn(`Skipped custom list "${opts.name}": ${fn.message}`);
                    continue;
                }

                fns.push(fn);
            }
        }

        const result = (function(): C.IAnalyzeResult {

            const analyzer = new XHProfAnalyzer();

            for (let file of clap.arguments) {

                analyzer.loadFile(file);
            }

            return analyzer.analyze();
        })();

        for (let fn of fns) {

            fn(result);
        }

        console.log(`Total Execution Time: ${(result.totalTime * 1e6).toFixed(3)}μs`);
        console.log(`Total Function Calls: ${result.totalCalls}`);
        console.log(`Total Functions: ${result.calls.length}`);
        console.log(`Total Request Calls: ${result.totalRequests}`);
        console.log(`Total Request Entries: ${result.requests.length}`);
    }

    protected _createListFn(opts: ICustomListOptions): IListFunction | Error {

        const columns = opts.columns.split(',').map((v) => v.trim());

        const sorts = opts.sort.split(',').map((v) => v.trim());

        const fn: string[] = [
            'return function(rs) {',
            'let i = 1;',
            `console.log(">", ${JSON.stringify(opts.name)});`
        ];

        const outCols: IColumnConfig[] = [];
        const sortCols: IColumnConfig[] = [];

        for (const c of columns) {

            const col = COLUMN_INFO[c as keyof TColumnApply<any>];

            if (!col) {

                console.warn(`Unknown column '${c}'.`);
                continue;
            }

            if (!col.allow.includes(opts.type)) {

                console.warn(`Column '${c}' does not work for type '${opts.type}'.`);
                continue;
            }

            outCols.push(col);
        }

        for (const c of sorts) {

            const col = COLUMN_INFO[c as keyof TColumnApply<any>];

            if (!col) {

                console.warn(`Unknown column '${c}'.`);
                continue;
            }

            if (!col.allow.includes(opts.type)) {

                console.warn(`Column '${c}' does not work for type '${opts.type}'.`);
                continue;
            }

            if (col.nonSortable) {

                console.warn(`Column '${c}' is not sortable.`);
                continue;
            }

            sortCols.push(col);
        }

        outCols.push(...Array.from(new Set(outCols.splice(0))));
        sortCols.push(...Array.from(new Set(sortCols.splice(0))));

        const lHeaders: string[] = [];

        const lRows: string[] = [];

        const lSort: string[] = [];

        const rowVar = 'v';
        const resultVar = 'rs';

        for (const c of outCols) {

            lHeaders.push(c.name.padEnd(c.width));

            lRows.push(`\${(${c.outExpr(rowVar, resultVar, opts.type)}).toString().padEnd(${c.width})}`);
        }

        for (const c of sortCols) {

            lSort.push(`(${c.expr('b', resultVar, opts.type)} - ${c.expr('a', resultVar, opts.type)})`);
        }

        if (!lSort.length) {

            return new Error('No sort column specified.');
        }

        fn.push(`console.log(\`${lHeaders.join('')}\`);`);

        if (opts.rows <= 0) {

            opts.rows = Infinity;
        }

        if (opts.type === 'path') {

            fn.push(`for (const ${rowVar} of ${resultVar}.calls.sort((a, b) => ${lSort.join(' || ')}).slice(0, ${opts.rows})) {`);
        }
        else {

            fn.push(`for (const ${rowVar} of ${resultVar}.requests.sort((a, b) => ${lSort.join(' || ')}).slice(0, ${opts.rows})) {`);
        }

        fn.push(`console.log(\`${lRows.join('')}\`);`);

        fn.push('}');
        fn.push('}');

        return (new Function(fn.join('\n')))();
    }

    protected _listTopCalledPath(rows: number): IListFunction {

        return this._createListFn({
            type: 'path',
            name: `List of top ${rows} most frequently called paths`,
            columns: BUILT_IN_PATH_LIST_COLS,
            sort: 'count,time',
            rows
        }) as IListFunction;
    }

    protected _listTopAvgTimePath(rows: number): IListFunction {

        return this._createListFn({
            type: 'path',
            name: `List of top ${rows} longest average time paths`,
            columns: BUILT_IN_PATH_LIST_COLS,
            sort: 'avg-time',
            rows
        }) as IListFunction;
    }

    protected _listTopTimePath(rows: number): IListFunction {

        return this._createListFn({
            type: 'path',
            name: `List of top ${rows} longest time paths`,
            columns: BUILT_IN_PATH_LIST_COLS,
            sort: 'time',
            rows
        }) as IListFunction;
    }

    protected _listTopReferredPath(rows: number): IListFunction {

        return this._createListFn({
            type: 'path',
            name: `List of top ${rows} most requests referred paths`,
            columns: BUILT_IN_PATH_LIST_COLS,
            sort: 'called-requests,count,time',
            rows
        }) as IListFunction;
    }

    protected _listTopCalledRequest(rows: number): IListFunction {

        return this._createListFn({
            type: 'request',
            name: `List of top ${rows} most frequently called requests`,
            columns: BUILT_IN_REQ_LIST_COLS,
            sort: 'count,time',
            rows
        }) as IListFunction;
    }

    protected _listTopAvgTimeRequest(rows: number): IListFunction {

        return this._createListFn({
            type: 'request',
            name: `List of top ${rows} longest average time requests`,
            columns: BUILT_IN_REQ_LIST_COLS,
            sort: 'avg-time',
            rows
        }) as IListFunction;
    }

    protected _listTopTimeRequest(rows: number): IListFunction {

        return this._createListFn({
            type: 'request',
            name: `List of top ${rows} longest time requests`,
            columns: BUILT_IN_REQ_LIST_COLS,
            sort: 'time',
            rows
        }) as IListFunction;
    }
}

const cli = new CLI();

cli.main(process.argv);
