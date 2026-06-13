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

const version = '1.0.0'

import pluginIcon from '../assets/icon.png'

import exportLfa from './lfa_exporter'

import translations from '../assets/plugin/translations.json'

for(let lang in translations)
    Language.addTranslations(lang, translations[lang])

let actions = [ ]

Plugin.register('liveframe_plugin', {
    title: 'LiveFrame Plugin',
    author: 'Onran',
    description: 'Plugin for exporting animations to LFA (LiveFrame Animation)',
    icon: pluginIcon,
    version: version,
    variant: 'both',

    onload() {
        const name = "LFA (LiveFrame Animation)"

        const codec = new Codec('lfa', {
            name: name,
            extension: 'lfa',
            export_options: {
                relativizeTransforms: {
                    type: "checkbox",
                    label: "liveframe-plugin.export.lfa.relativize_transforms",
                    value: true
                }
            },

            compile: exportLfa,

            async export() {
                let options = await codec.promptExportOptions()
                if (options === null) return

                let content = codec.compile(options)

                Blockbench.export({
                    resource_id: 'lfa',
                    type: name,
                    extensions: ['lfa'],
                    name: codec.fileName(),
                    startpath: codec.startPath(),
                    content: content
                })
            }
        })

        const action = new Action("export_lfa", {
            name: "liveframe-plugin.lfa.export",
            icon: "icon-keyframe",
            category: "file",
            click: codec.export
        })

        MenuBar.addAction(action, "file.export.0")

        actions.push(action)
    },

    onunload() {
        actions.forEach(action => action.delete())
    }
})

console.log(`liveframe-plugin: successfully loaded! version: ${version}`)