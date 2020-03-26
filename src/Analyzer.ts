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

        let tmp = Buffer.allocUnsafe(READ_SEGMENT);

        let fSize = $FS.statSync(file).size;

        while (1) {

            const readBytes = $FS.readSync(fp, tmp, 0, tmp.length, offset);

            offset += readBytes;

            if (readBytes === 0) {

                break;
            }

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

                    let rowData = JSON.parse(buf.slice(0, bufferedBytes).toString());

                    if (isXHProfOutput(rowData)) {

                        this._requests.push(rowData);
                    }
                    bufferedBytes = 0;

                    tmp = tmp.slice(pos + 1);
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

                req.count++;
                if (rawReq.totalTime > req.maxTime) {

                    req.maxTime = rawReq.totalTime;
                }
                if (rawReq.totalTime < req.minTime) {

                    req.minTime = rawReq.totalTime;
                }
                req.totalTime += rawReq.totalTime;
                req.avgTime = Math.floor(req.totalTime / req.count);
            }

            result.totalTime += rawReq.totalTime;

            for (const k in rawReq.data) {

                const rawCall = rawReq.data[k];

                let call = calls[k];

                if (!call) {

                    calls[k] = call = {

                        'path': k,
                        'requestCoverage': 1,
                        'calledTimes': rawCall.ct,
                        'wallTime': rawCall.wt,
                    };

                    result.calls.push(call);
                }
                else {

                    if (isNewReq) {

                        call.requestCoverage++;
                    }

                    call.calledTimes += rawCall.ct;
                    call.wallTime += rawCall.wt;
                }

                result.totalCalls += rawCall.ct;
            }
        }

        return result;
    }
}