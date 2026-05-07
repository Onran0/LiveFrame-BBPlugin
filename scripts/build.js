/*
 *    Copyright 2026 Onran
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

const esbuild = require('esbuild')
const fs = require('fs')
const archiver = require('archiver')

console.log("wrapping via ESBuild...")

function failedHandler(reason) {
    console.error(`build failed: ${reason}`)
    process.exit(1)
}

esbuild.build({
    entryPoints: ['src/plugin.js'],
    bundle: true,
    outfile: 'dist/liveframe-plugin/liveframe-plugin.js',
    minify: true,
    loader: { '.png': 'file', '.svg': 'file' },
    assetNames: '[name]',
}).then(() => {
    console.log(`archiving to "liveframe-plugin.zip"`)

    const output = fs.createWriteStream('dist/liveframe-plugin.zip')

    const archive = archiver('zip', undefined)

    archive.pipe(output)

    archive.directory('dist/liveframe-plugin/', "liveframe-plugin/", undefined)

    archive.finalize().then(() => {
        console.log('build finished!')
    }).catch(failedHandler)
}).catch(failedHandler)