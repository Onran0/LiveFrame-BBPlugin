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

import * as avec3 from "./util/array_vec3"

const BlockbenchInterpToLFA = {
    position: {
        "step": "step",
        "linear": "lerp",
        "catmullrom": "cubic-spline"
    },

    rotation: {
        "step": "step",
        "linear": "slerp",
        "catmullrom": "squad"
    },

    scale: {
        "step": "step",
        "linear": "lerp",
        "catmullrom": "cubic-spline"
    }
}

function exportBody(options) {
    let skeletonBones = { }
    let builder = [ ]

    for(const animation of Project.animations) {
        const looped = animation.loop === "loop"
        let duration = animation.length

        /*
        [
            {
                "time": 0.5,
                "bones": {
                    "spine": {
                        "position": {
                            "value": [
                                0, // x
                                0, // y
                                0  // z
                            ],

                            "outInterpolationType": "catmullrom"
                        }
                    }
                }
            }
        ]
         */
        let lfaKeyframes = [ ]

        for(const animatorKey in animation.animators) {
            const animator = animation.animators[animatorKey]

            if(animator instanceof BoneAnimator) {
                const group = animator.getGroup()
                const boneName = group.name

                skeletonBones[boneName] = {
                    position: avec3.div_scalar(group.origin, 16),
                    rotation: group.rotation,
                    scale: [ 1, 1, 1 ]
                }

                let minKfTime = undefined
                let prevMaxKfTime = 0
                let maxKfTime = 0

                let firstKf = null
                let lastKf = null

                for(const keyframe of animator.keyframes) {
                    if(keyframe.interpolation === "bezier") {
                        console.error("plugin doesn't support export of bezier keyframes")
                        continue
                    }

                    const kfTime = keyframe.time

                    let lfaKeyframe = lfaKeyframes.find(x => x.time === kfTime)

                    if(lfaKeyframe == null) {
                        lfaKeyframe = { time: kfTime, bones: { } }
                        lfaKeyframes.push(lfaKeyframe)
                    }

                    if(kfTime > maxKfTime) {
                        prevMaxKfTime = maxKfTime
                        maxKfTime = kfTime

                        lastKf = lfaKeyframe
                    }

                    if(minKfTime == null || kfTime < minKfTime) {
                        minKfTime = kfTime

                        firstKf = lfaKeyframe
                    }

                    let lfaBoneObject = lfaKeyframe.bones[boneName]

                    if(lfaBoneObject == null) {
                        lfaBoneObject = lfaKeyframe.bones[boneName] = { }
                    }

                    let { x, y, z } = keyframe.data_points[0]

                    // converting blockbench pixels to meters

                    if(keyframe.channel === "position") {
                        x /= 16
                        y /= 16
                        z /= 16
                    }

                    lfaBoneObject[keyframe.channel] = {
                        value: [ x, y, z ],
                        outInterpolationType: keyframe.interpolation
                    }
                }

                if(looped && options.removeLastKeysIfLooped && lastKf != null) {
                    for(const boneName of Object.keys(lastKf.bones)) {
                        if(firstKf.bones[boneName] != null) {
                            const firstKfBone = firstKf.bones[boneName]
                            const lastKfBone = lastKf.bones[boneName]

                            const channelsToRemove = []

                            for(const channelName in lastKfBone) {
                                if(firstKfBone[channelName] != null) {
                                    if(
                                        avec3.equals(
                                            firstKfBone[channelName].value,
                                            lastKfBone[channelName].value
                                        )
                                    ) channelsToRemove.push(channelName)
                                }
                            }

                            for(const channelName of channelsToRemove) {
                                delete lastKfBone[channelName]
                            }
                        }
                    }
                }
            } else {
                console.error(
                    `failed to export animator "${animatorKey}" in animation "${animation.name}" because it have unsupported type`
                )
            }
        }

        lfaKeyframes.sort((a, b) => a.time - b.time)

        builder.push('@clip name "')
        builder.push(animation.name)
        builder.push('" duration ')
        builder.push(duration)
        builder.push(' loop ')
        builder.push(looped)

        builder.push(' {')

        for(const lfaKeyframe of lfaKeyframes) {
            const kfTime = lfaKeyframe.time
            const kfBones = lfaKeyframe.bones

            let atLeastOneBonePushed = false
            let bonesBuilder = [ ]

            for(const kfBoneName in kfBones) {
                const kfBone = kfBones[kfBoneName]

                if(Object.keys(kfBone).length === 0)
                    continue

                atLeastOneBonePushed = true

                bonesBuilder.push(`\n\t\t@bone name "${kfBoneName}" {\n`)

                for(const channelName in kfBone) {
                    const channelData = kfBone[channelName]

                    bonesBuilder.push(`\t\t\t@${channelName} out-`)

                    if(channelName === "rotation")
                        bonesBuilder.push("rotation-interp")
                    else
                        bonesBuilder.push("interp")

                    bonesBuilder.push(' "' + BlockbenchInterpToLFA[channelName][channelData.outInterpolationType])

                    bonesBuilder.push(`" value (${channelData.value.join(', ')})\n`)
                }

                bonesBuilder.push("\t\t}\n")
            }

            if(atLeastOneBonePushed) {
                builder.push(`\n\t@keyframe time ${kfTime} {`)

                builder.push(...bonesBuilder)

                builder.push('\t}\n')
            }
        }

        builder.push("}")
    }

    return [ builder, skeletonBones ]
}

export default function doExport(options) {
    const relativizeTransforms = options.relativizeTransforms

    let [ bodyBuilder, skeletonBones ] = exportBody(options)

    let builder = [ ]

    builder.push('@metadata version 1.0 ')

    if(!relativizeTransforms) {
        builder.push('relativize-transforms ')
        builder.push(relativizeTransforms)
    }

    builder.push('\n\n@skeleton {')

    for(const boneName in skeletonBones) {
        const boneBindPose = skeletonBones[boneName]

        builder.push('\n\t@bone name "')
        builder.push(boneName)
        builder.push('"')

        if(!avec3.equals(boneBindPose.position, [ 0, 0, 0 ])) {
            builder.push(' position (')
            builder.push(boneBindPose.position.join(', '))
            builder.push(')')
        }

        if(!avec3.equals(boneBindPose.rotation, [ 0, 0, 0 ])) {
            builder.push(' rotation (')
            builder.push(boneBindPose.rotation.join(', '))
            builder.push(')')
        }

        if(!avec3.equals(boneBindPose.scale, [ 1, 1, 1 ])) {
            builder.push(' scale (')
            builder.push(boneBindPose.scale.join(', '))
            builder.push(')')
        }
    }

    builder.push('\n}\n\n')

    builder.push(...bodyBuilder)

    return builder.join('')
}