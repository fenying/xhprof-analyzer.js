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

export interface IXHProfOutputItem {

    ct: number;

    wt: number;
}

export interface IXHProfOutput {

    data: Record<string, IXHProfOutputItem>;

    request: string;

    totalTime: number;
}

export interface IAnalyzeResultCallItem {

    path: string;

    totalTime: number;

    maxTime: number;

    minTime: number;

    avgTime: number;

    totalCalledTimes: number;

    maxCalledTimes: number;

    minCalledTimes: number;

    avgCalledTimes: number;

    requestCoverage: number;

    requests: number;
}

export interface IAnalyzeResultRequestItem {

    path: string;

    count: number;

    maxTime: number;

    minTime: number;

    avgTime: number;

    totalTime: number;
}

export interface IAnalyzeResult {

    calls: IAnalyzeResultCallItem[];

    totalTime: number;

    requests: IAnalyzeResultRequestItem[];

    totalCalls: number;

    totalRequests: number;
}

export interface IAnalyzer {

    reset(): void;

    loadFile(path: string): void;

    analyze(): IAnalyzeResult;
}
