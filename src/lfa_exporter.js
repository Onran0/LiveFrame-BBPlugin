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
import { prettify, prettyJoin } from "./util/floats_prettifier"

function getSamplesInterval() {
    return 1 / Math.clamp(settings.animation_sample_rate.value, 0.1, 144)
}

function isEqualsByEpsilon(a, b, epsilon) {
    return Math.abs(a - b) < epsilon
}

function bakeSegment(animator, channel, timeFrom, timeTo) {
    const interval = getSamplesInterval()

    let values = [ ]

    const prevTimelineTime = Timeline.time

    for (let time = timeFrom; time < timeTo; time += interval) {
        Timeline.setTime(time)

        values.push({
            time: time,
            value: animator.interpolate(channel, false)
        })
    }

    Timeline.setTime(prevTimelineTime)

    return values
}

function splitRotationKeyframe(animator, keyframes, keyIndex) {
    let finalKeyframes = [ ]

    const keyframe = keyframes[keyIndex]

    if(keyframe.interpolation === "step" || keyIndex === keyframes.length - 1) {
        finalKeyframes.push(
            {
                time: keyframe.time,
                value: avec3.from_object(keyframe.data_points[0]),
                interp: "step"
            }
        )
    } else {
        let bakedKeyframes = bakeSegment(
            animator, "rotation",
            keyframe.time, keyframes[keyIndex + 1].time
        )

        bakedKeyframes.forEach(
            keyframe => {
                keyframe.interp = "nlerp"
                return keyframe
            }
        )

        finalKeyframes.push(...bakedKeyframes)
    }

    return finalKeyframes
}

function splitPositionOrScaleKeyframe(animator, keyframes, keyIndex, channel) {
    let finalKeyframes = [ ]

    const keyframe = keyframes[keyIndex]

    if(
        keyframe.interpolation === "step" ||
        keyframe.interpolation === "linear" ||
        keyIndex === keyframes.length - 1
    ) {
        let value = avec3.from_object(keyframe.data_points[0])
        let interp = keyframe.interpolation === "step" ? "step" : "lerp"

        if(channel === "position")
            value = avec3.div_scalar(value, 16)

        if(keyIndex === keyframes.length - 1)
            interp = "step"

        finalKeyframes.push(
            {
                time: keyframe.time,
                value: value,
                interp: interp
            }
        )
    } else {
        let bakedKeyframes = bakeSegment(
            animator, channel,
            keyframe.time, keyframes[keyIndex + 1].time
        )

        bakedKeyframes.forEach(
            keyframe => {
                keyframe.interp = "lerp"

                // converting blockbench pixels to meters
                if (channel === "position")
                    keyframe.value = avec3.div_scalar(keyframe.value, 16)

                return keyframe
            }
        )

        finalKeyframes.push(...bakedKeyframes)
    }

    return finalKeyframes
}

function exportBody(options) {
    const floatTimeEpsilon = 1/1200

    let skeletonBones = { }
    let customInterpsBuilder = [ ]
    let builder = [ ]

    let customInterpsCount = 0

    for(const animation of Animator.animations) {
        const looped = animation.loop === "loop"
        const duration = animation.length

        /*
        [
            {
                "time": 0.5,
                "events": [
                    {
                        "name": string
                    },
                    {
                        "name": string,
                        "rawValue": "(0, 1, 2)"
                    }
                ],
                "bones": {
                    "spine": {
                        "position|scale": {
                            "value": [
                                0, // x
                                0, // y
                                0  // z
                            ],

                            "extra": {
                                "in-tangent": [ 0, 0, 0 ],
                                "out-tangent": [ 0, 0, 0 ]
                            },

                            "interp": "step|lerp|cubic-spline"
                        },

                        "rotation": {
                            "value": [
                                0, // x
                                0, // y
                                0, // z
                            ],

                            "interp": "step|nlerp"
                        }
                    }
                }
            }
        ]
         */
        let keyframes = [ ]

        for(const animatorKey of Object.keys(animation.animators)) {
            const animator = animation.animators[animatorKey]

            let handled = true

            if(['bone', 'armature_bone'].includes(animator.type) && animator.getGroup()) {
                const group = animator.getGroup()
                const boneName = group.name

                skeletonBones[boneName] = {
                    position: avec3.div_scalar(group.origin, 16),
                    rotation: group.rotation,
                    scale: [ 1, 1, 1 ]
                }

                let channelKeyframes = {
                    "position": [ ],
                    "rotation": [ ],
                    "scale": [ ]
                }

                for(const channel of Object.keys(channelKeyframes)) {
                    let keyframes = structuredClone(animator[channel])

                    keyframes.sort((a, b) => a.time - b.time)

                    for(let i = 0; i < keyframes.length; i++) {
                        let splitKeyframes

                        if(channel === "rotation")
                            splitKeyframes = splitRotationKeyframe(animator, keyframes, i)
                        else
                            splitKeyframes = splitPositionOrScaleKeyframe(animator, keyframes, i, channel)

                        channelKeyframes[channel].push(...splitKeyframes)
                    }
                }

                let boneKeyframes = [ ]

                for(const channel of Object.keys(channelKeyframes)) {
                    for(const keyframe of Object.values(channelKeyframes[channel])) {
                        let destBoneKeyframeIndex

                        for(let i = 0;i < boneKeyframes.length;i++) {
                            if(isEqualsByEpsilon(boneKeyframes[i].time, keyframe.time, floatTimeEpsilon)) {
                                destBoneKeyframeIndex = i
                                break
                            }
                        }

                        const generalChannelKeyframe = {
                            value: keyframe.value,
                            interp: keyframe.interp,
                            extra: keyframe.extra
                        }

                        if(destBoneKeyframeIndex) {
                            boneKeyframes[destBoneKeyframeIndex][channel] = generalChannelKeyframe
                        } else {
                            boneKeyframes.push({
                                time: keyframe.time,
                                [channel]: generalChannelKeyframe
                            })
                        }
                    }
                }

                for(const boneKeyframe of Object.values(boneKeyframes)) {
                    const boneKeyframeTime = boneKeyframe.time

                    delete boneKeyframe.time

                    let destGeneralKeyframeIndex

                    for(let i = 0;i < keyframes.length;i++) {
                        if(isEqualsByEpsilon(keyframes[i].time, boneKeyframeTime, floatTimeEpsilon)) {
                            destGeneralKeyframeIndex = i
                            break
                        }
                    }

                    if(destGeneralKeyframeIndex != null) {
                        keyframes[destGeneralKeyframeIndex].bones[boneName] = boneKeyframe
                    } else {
                        keyframes.push({
                            time: boneKeyframeTime,
                            events: [ ],
                            bones: {
                                [boneName]: boneKeyframe
                            }
                        })
                    }
                }
            } else if(animator instanceof EffectAnimator) {
                for(const keyframe of animator.keyframes) {
                    const script = keyframe.data_points[0].script

                    if(script != null) {
                        const time = keyframe.time

                        const separatorIndex = script.indexOf('=')

                        let event

                        if(separatorIndex === -1) {
                            event = {
                                name: script
                            }
                        } else {
                            event = {
                                name: script.substring(0, separatorIndex),
                                rawValue: script.substring(separatorIndex + 1)
                            }
                        }

                        let destKeyframeIndex

                        for(let i = 0;i < keyframes.length;i++) {
                            if(isEqualsByEpsilon(keyframes[i].time, time, floatTimeEpsilon)) {
                                destKeyframeIndex = i
                                break
                            }
                        }

                        if(destKeyframeIndex != null) {
                            keyframes[destKeyframeIndex].events.push(event)
                        } else {
                            keyframes.push({
                                time: time,
                                events: [ event ],
                                bones: [ ]
                            })
                        }
                    } else handled = false
                }
            } else handled = false

            if(!handled) {
                console.error(
                    `failed to export animator "${animatorKey}" (of type ${animator.type}) in animation "${animation.name}" because it have unsupported type or parameters`
                )
            }
        }

        keyframes.sort((a, b) => a.time - b.time)

        builder.push('@clip name "')
        builder.push(animation.name)
        builder.push('" duration ')
        builder.push(duration)
        builder.push(' loop ')
        builder.push(looped)

        builder.push(' {')

        for(const keyframe of keyframes) {
            const kfTime = keyframe.time
            const kfBones = keyframe.bones

            let atLeastOneElementPushed = false
            let kfBodyBuilder = [ ]

            for(const event of keyframe.events) {
                atLeastOneElementPushed = true

                kfBodyBuilder.push(`\n\t\t@event name "${event.name}"`)

                if(event.rawValue)
                    kfBodyBuilder.push(` value ${event.rawValue}`)

                kfBodyBuilder.push('\n')
            }

            for(const kfBoneName of Object.keys(kfBones)) {
                const kfBone = kfBones[kfBoneName]

                atLeastOneElementPushed = true

                kfBodyBuilder.push(`\n\t\t@bone name "${kfBoneName}" {\n`)

                for(const channelName of Object.keys(kfBone)) {
                    const channelData = kfBone[channelName]

                    kfBodyBuilder.push(`\t\t\t@${channelName} `)

                    kfBodyBuilder.push("interp")

                    kfBodyBuilder.push(' "')

                    if(channelData.interp !== "cubic-spline")
                        kfBodyBuilder.push(channelData.interp)
                    else {
                        const extra = channelData.extra

                        customInterpsBuilder.push(`@interp id "${customInterpsCount}" type "cubic-spline" {\n`)

                        customInterpsBuilder.push(`\t@field name "in-tangent" value (${
                            prettyJoin(extra["in-tangent"], ', ')
                        })`)

                        customInterpsBuilder.push(`\n\t@field name "out-tangent" value (${
                            prettyJoin(extra["out-tangent"], ', ')
                        })`)

                        customInterpsBuilder.push("\n}\n\n")

                        kfBodyBuilder.push(customInterpsCount++)
                    }

                    kfBodyBuilder.push(`" value (${prettyJoin(channelData.value, ', ')})\n`)
                }

                kfBodyBuilder.push("\t\t}\n")
            }

            if(atLeastOneElementPushed) {
                builder.push(`\n\t@keyframe time ${prettify(kfTime)} {`)

                builder.push(...kfBodyBuilder)

                builder.push('\t}\n')
            }
        }

        builder.push("}")
    }

    return [ [ ...customInterpsBuilder, ...builder ], skeletonBones ]
}

export default function doExport(options) {
    const relativizeTransforms = options.relativizeTransforms

    let [ bodyBuilder, skeletonBones ] = exportBody(options)

    let builder = [ ]

    builder.push('@metadata version 1.0 ')

    if(!relativizeTransforms)
        builder.push('relativize-transforms false')

    builder.push('\n\n@skeleton {')

    for(const boneName of Object.keys(skeletonBones)) {
        const boneBindPose = skeletonBones[boneName]

        builder.push('\n\t@bone name "')
        builder.push(boneName)
        builder.push('"')

        if(!avec3.equals(boneBindPose.position, [ 0, 0, 0 ])) {
            builder.push(' position (')
            builder.push(prettyJoin(boneBindPose.position, ', '))
            builder.push(')')
        }

        if(!avec3.equals(boneBindPose.rotation, [ 0, 0, 0 ])) {
            builder.push(' rotation (')
            builder.push(prettyJoin(boneBindPose.rotation, ', '))
            builder.push(')')
        }

        if(!avec3.equals(boneBindPose.scale, [ 1, 1, 1 ])) {
            builder.push(' scale (')
            builder.push(prettyJoin(boneBindPose.scale, ', '))
            builder.push(')')
        }
    }

    builder.push('\n}\n\n')

    builder.push(...bodyBuilder)

    return builder.join('')
}