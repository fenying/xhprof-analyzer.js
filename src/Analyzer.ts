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

import * as C from './Common';
import * as TyG from '@litert/typeguard';
import * as $FS from 'fs';

const tgc = TyG.createInlineCompiler();

const isXHProfOutput = tgc.compile<C.IXHProfOutput>({
    rule: {
        'totalTime': 'number',
        'request': 'string',
        'data->{}': {
            'ct': 'uint',
            'wt': 'uint',
        },
    }
});

export class XHProfAnalyzer implements C.IAnalyzer {

    private _requests: C.IXHProfOutput[];

    public constructor() {

        this._requests = [];
    }

    public reset(): void {

        this._requests = [];
    }

    public loadFile(file: string): void {

        const READ_SEGMENT = 8096;

        let buf: Buffer = Buffer.allocUnsafe(READ_SEGMENT);

        let bufferedBytes = 0;

        let offset = 0;

        let fp = $FS.openSync(file, 'r');

        let fSize = $FS.statSync(file).size;

        let ln = 1;

        while (1) {

            let tmp = Buffer.allocUnsafe(READ_SEGMENT);

            const readBytes = $FS.readSync(fp, tmp, 0, tmp.length, offset);

            offset += readBytes;

            tmp = tmp.slice(0, readBytes);

            while (1) {

                let pos = tmp.indexOf(10);

                if (pos !== -1) {

                    if (buf.length - bufferedBytes < pos) {

                        const newBuf = Buffer.allocUnsafe(buf.byteLength + tmp.length + READ_SEGMENT);

                        buf.copy(newBuf, 0, 0, bufferedBytes);
                        buf = newBuf;
                        tmp.copy(buf, bufferedBytes, 0, pos);
                    }
                    else {

                        tmp.copy(buf, bufferedBytes, 0, pos);
                    }

                    bufferedBytes += pos;

                    try {

                        let rowData = JSON.parse(buf.slice(0, bufferedBytes).toString());

                        if (isXHProfOutput(rowData)) {

                            this._requests.push(rowData);
                        }
                        bufferedBytes = 0;

                        tmp = tmp.slice(pos + 1);
                    }
                    catch (e) {

                        const nPos = buf.indexOf('{"data":{', 4);

                        if (nPos !== -1) {

                            try {

                                let rowData = JSON.parse(buf.slice(nPos, bufferedBytes).toString());

                                if (isXHProfOutput(rowData)) {

                                    this._requests.push(rowData);
                                }

                                console.warn(`[FIXED] Bad log in line ${ln}: ${e.toString()}`);
                            }
                            catch (e) {

                                console.warn(`[IGNORED] Bad log in line ${ln}: ${e.toString()}`);
                            }
                        }
                        else {

                            console.warn(`[IGNORED] Bad log in line ${ln}: ${e.toString()}`);
                        }

                        bufferedBytes = 0;

                        tmp = tmp.slice(pos + 1);
                    }

                    ln++;
                }
                else {

                    if (buf.length - bufferedBytes < tmp.length) {

                        const newBuf = Buffer.allocUnsafe(buf.byteLength + tmp.length + READ_SEGMENT);

                        buf.copy(newBuf, 0, 0, bufferedBytes);
                        tmp.copy(newBuf, bufferedBytes);

                        buf = newBuf;
                    }
                    else {

                        tmp.copy(buf, bufferedBytes);
                    }
                    bufferedBytes += tmp.length;
                    break;
                }
            }

            if (offset >= fSize) {

                break;
            }
        }
    }

    public analyze(): C.IAnalyzeResult {

        const result: C.IAnalyzeResult = {
            calls: [],
            requests: [],
            totalTime: 0,
            totalCalls: 0,
            totalRequests: this._requests.length
        };

        const reqs: Record<string, C.IAnalyzeResultRequestItem> = {};

        const calls: Record<string, C.IAnalyzeResultCallItem> = {};

        for (let rawReq of this._requests) {

            let req = reqs[rawReq.request];

            const isNewReq = !req;

            if (!req) {

                req = {

                    'path': rawReq.request,
                    'count': 1,
                    'maxTime': rawReq.totalTime,
                    'minTime': rawReq.totalTime,
                    'avgTime': rawReq.totalTime,
                    'totalTime': rawReq.totalTime,
                };

                reqs[rawReq.request] = req;

                result.requests.push(req);
            }
            else {

                if (rawReq.totalTime > req.maxTime) {

                    req.maxTime = rawReq.totalTime;
                }
                if (rawReq.totalTime < req.minTime) {

                    req.minTime = rawReq.totalTime;
                }
                req.count++;
                req.totalTime += rawReq.totalTime;
                req.avgTime = req.totalTime / req.count;
            }

            result.totalTime += rawReq.totalTime;

            for (const k in rawReq.data) {

                const rawCall = rawReq.data[k];

                let call = calls[k];

                if (!call) {

                    calls[k] = call = {

                        'path': k,
                        'requests': 1,
                        'requestCoverage': 1,
                        'totalCalledTimes': rawCall.ct,
                        'maxCalledTimes': rawCall.ct,
                        'minCalledTimes': rawCall.ct,
                        'avgCalledTimes': rawCall.ct,
                        'totalTime': rawCall.wt,
                        'maxTime': rawCall.wt,
                        'minTime': rawCall.wt,
                        'avgTime': rawCall.wt,
                    };

                    result.calls.push(call);
                }
                else {

                    if (isNewReq) {

                        call.requestCoverage++;
                    }

                    call.requests++;
                    call.totalCalledTimes += rawCall.ct;
                    call.totalTime += rawCall.wt;

                    call.avgCalledTimes = call.totalCalledTimes / call.requests;
                    call.avgTime = call.totalTime / call.requests;

                    if (call.maxCalledTimes < rawCall.ct) {

                        call.maxCalledTimes = rawCall.ct;
                    }

                    if (call.minCalledTimes > rawCall.ct) {

                        call.minCalledTimes = rawCall.ct;
                    }

                    if (call.maxTime < rawCall.wt) {

                        call.maxTime = rawCall.wt;
                    }

                    if (call.minTime > rawCall.wt) {

                        call.minTime = rawCall.wt;
                    }
                }

                result.totalCalls += rawCall.ct;
            }
        }

        return result;
    }
}
