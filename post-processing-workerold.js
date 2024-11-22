self.onmessage = function(e) {
    // ... (keep existing parameter destructuring and helper functions)

    const { 
        type, 
        imageData, 
        width, 
        height, 
        bodyPartImages, 
        extremePoints, 
        averages, 
        timestamp, 
        partNames, 
        rotationAngles
    } = e.data;
    function rotatePoint(point, center, angle) {
        const radians = (angle * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        const dx = point.x - center.x;
        const dy = point.y - center.y;

        return {
            x: center.x + (dx * cos - dy * sin),
            y: center.y + (dx * sin + dy * cos)
        };
    }

    function calculateRotatedPoints(upperArmAngle, lowerArmAngle, upperArmRotationCenter, lowerArmRotationCenter) {
        return new Promise((resolve) => {
            const rotatedPoints = {};

            // Upper arm rotation calculations (same as before)
            if (extremePoints.leftUpperArmBack) {
                rotatedPoints.leftUpperArmBack = {
                    top: rotatePoint(extremePoints.leftUpperArmBack.top, upperArmRotationCenter, upperArmAngle),
                    bottom: rotatePoint(extremePoints.leftUpperArmBack.bottom, upperArmRotationCenter, upperArmAngle)
                };
            }

            if (extremePoints.leftUpperArmFront) {
                rotatedPoints.leftUpperArmFront = {
                    top: rotatePoint(extremePoints.leftUpperArmFront.top, upperArmRotationCenter, upperArmAngle),
                    bottom: rotatePoint(extremePoints.leftUpperArmFront.bottom, upperArmRotationCenter, upperArmAngle)
                };
            }

            // Calculate upper arm averages
            if (rotatedPoints.leftUpperArmBack && rotatedPoints.leftUpperArmFront) {
                rotatedPoints.leftUpperArmAverage = {
                    front: {
                        top: rotatedPoints.leftUpperArmFront.top,
                        bottom: rotatedPoints.leftUpperArmFront.bottom
                    },
                    back: {
                        top: rotatedPoints.leftUpperArmBack.top,
                        bottom: rotatedPoints.leftUpperArmBack.bottom
                    },
                    center: {
                        top: {
                            x: (rotatedPoints.leftUpperArmFront.top.x + rotatedPoints.leftUpperArmBack.top.x) / 2,
                            y: (rotatedPoints.leftUpperArmFront.top.y + rotatedPoints.leftUpperArmBack.top.y) / 2
                        },
                        bottom: {
                            x: (rotatedPoints.leftUpperArmFront.bottom.x + rotatedPoints.leftUpperArmBack.bottom.x) / 2,
                            y: (rotatedPoints.leftUpperArmFront.bottom.y + rotatedPoints.leftUpperArmBack.bottom.y) / 2
                        }
                    }
                };
            }

            // Lower arm rotation calculations (same as before)
            let lowerArmBackRotated = null;
            let lowerArmFrontRotated = null;

            if (extremePoints.leftLowerArmBack) {
                lowerArmBackRotated = {
                    top: rotatePoint(extremePoints.leftLowerArmBack.top, upperArmRotationCenter, upperArmAngle),
                    bottom: rotatePoint(extremePoints.leftLowerArmBack.bottom, upperArmRotationCenter, upperArmAngle)
                };
            }

            if (extremePoints.leftLowerArmFront) {
                lowerArmFrontRotated = {
                    top: rotatePoint(extremePoints.leftLowerArmFront.top, upperArmRotationCenter, upperArmAngle),
                    bottom: rotatePoint(extremePoints.leftLowerArmFront.bottom, upperArmRotationCenter, upperArmAngle)
                };
            }

            // Second rotation for lower arm
            if (lowerArmBackRotated) {
                rotatedPoints.leftLowerArmBack = {
                    top: rotatePoint(lowerArmBackRotated.top, lowerArmRotationCenter, lowerArmAngle),
                    bottom: rotatePoint(lowerArmBackRotated.bottom, lowerArmRotationCenter, lowerArmAngle)
                };
            }

            if (lowerArmFrontRotated) {
                rotatedPoints.leftLowerArmFront = {
                    top: rotatePoint(lowerArmFrontRotated.top, lowerArmRotationCenter, lowerArmAngle),
                    bottom: rotatePoint(lowerArmFrontRotated.bottom, lowerArmRotationCenter, lowerArmAngle)
                };
            }

            // Calculate lower arm averages
            if (rotatedPoints.leftLowerArmBack && rotatedPoints.leftLowerArmFront) {
                rotatedPoints.leftLowerArmAverage = {
                    front: {
                        top: rotatedPoints.leftLowerArmFront.top,
                        bottom: rotatedPoints.leftLowerArmFront.bottom
                    },
                    back: {
                        top: rotatedPoints.leftLowerArmBack.top,
                        bottom: rotatedPoints.leftLowerArmBack.bottom
                    },
                    center: {
                        top: {
                            x: (rotatedPoints.leftLowerArmFront.top.x + rotatedPoints.leftLowerArmBack.top.x) / 2,
                            y: (rotatedPoints.leftLowerArmFront.top.y + rotatedPoints.leftLowerArmBack.top.y) / 2
                        },
                        bottom: {
                            x: (rotatedPoints.leftLowerArmFront.bottom.x + rotatedPoints.leftLowerArmBack.bottom.x) / 2,
                            y: (rotatedPoints.leftLowerArmFront.bottom.y + rotatedPoints.leftLowerArmBack.bottom.y) / 2
                        }
                    }
                };
            }

            // Add hand rotation
            if (extremePoints.leftHand) {
                // Rotate hand first by upper arm angle
                const handFirstRotation = {
                    top: rotatePoint(extremePoints.leftHand.top, upperArmRotationCenter, upperArmAngle),
                    bottom: rotatePoint(extremePoints.leftHand.bottom, upperArmRotationCenter, upperArmAngle)
                };

                // Then rotate by lower arm angle
                rotatedPoints.leftHand = {
                    top: rotatePoint(handFirstRotation.top, lowerArmRotationCenter, lowerArmAngle),
                    bottom: rotatePoint(handFirstRotation.bottom, lowerArmRotationCenter, lowerArmAngle)
                };

                // Calculate hand rotation center (bottom of lower arm average)
                const handRotationCenter = rotatedPoints.leftLowerArmAverage?.center?.bottom || lowerArmRotationCenter;
                
                // Add combined angle for hand (can be adjusted based on need)
                const handAngle = upperArmAngle + lowerArmAngle;
                
                // Final hand rotation
                rotatedPoints.leftHand = {
                    top: rotatePoint(rotatedPoints.leftHand.top, handRotationCenter, handAngle),
                    bottom: rotatePoint(rotatedPoints.leftHand.bottom, handRotationCenter, handAngle),
                    rotationCenter: handRotationCenter
                };
            }

            resolve(rotatedPoints);
        });
    }

    function rotateSegment(segmentData, width, height, angle, center, color) {
        return new Promise((resolve) => {
            const radians = (angle * Math.PI) / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);
            const rotatedData = new Uint8ClampedArray(width * height * 4);

            for (let y = -1; y < height + 1; y++) {
                for (let x = -1; x < width + 1; x++) {
                    const dx = x - center.x;
                    const dy = y - center.y;

                    const srcX = center.x + (dx * cos + dy * sin);
                    const srcY = center.y + (-dx * sin + dy * cos);

                    const x0 = Math.floor(srcX);
                    const x1 = Math.ceil(srcX);
                    const y0 = Math.floor(srcY);
                    const y1 = Math.ceil(srcY);

                    const wx1 = srcX - x0;
                    const wx0 = 1 - wx1;
                    const wy1 = srcY - y0;
                    const wy0 = 1 - wy1;

                    if (x >= 0 && x < width && y >= 0 && y < height) {
                        const targetIdx = (y * width + x) * 4;

                        let alpha = 0;
                        if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
                            const idx00 = (y0 * width + x0) * 4;
                            alpha += segmentData[idx00 + 3] * wx0 * wy0;
                        }
                        if (x1 >= 0 && x1 < width && y0 >= 0 && y0 < height) {
                            const idx10 = (y0 * width + x1) * 4;
                            alpha += segmentData[idx10 + 3] * wx1 * wy0;
                        }
                        if (x0 >= 0 && x0 < width && y1 >= 0 && y1 < height) {
                            const idx01 = (y1 * width + x0) * 4;
                            alpha += segmentData[idx01 + 3] * wx0 * wy1;
                        }
                        if (x1 >= 0 && x1 < width && y1 >= 0 && y1 < height) {
                            const idx11 = (y1 * width + x1) * 4;
                            alpha += segmentData[idx11 + 3] * wx1 * wy1;
                        }

                        if (alpha > 0) {
                            rotatedData[targetIdx] = color.r;
                            rotatedData[targetIdx + 1] = color.g;
                            rotatedData[targetIdx + 2] = color.b;
                            rotatedData[targetIdx + 3] = Math.min(255, alpha);
                        }
                    }
                }
            }
            resolve(rotatedData);
        });
    }

    async function processVariation(upperArmAngle, lowerArmAngle) {
        const upperArmRotationCenter = averages.left_upper_arm.top;
        const tempRotatedUpperArm = rotatePoint(
            averages.left_upper_arm.bottom,
            upperArmRotationCenter,
            upperArmAngle
        );
        const lowerArmRotationCenter = tempRotatedUpperArm;

        const colors = [
            { r: 255, g: 0, b: 0 },   // upper arm back
            { r: 255, g: 0, b: 0 },   // upper arm front
            { r: 0, g: 0, b: 255 },   // lower arm back
            { r: 0, g: 0, b: 255 },   // lower arm front
            { r: 0, g: 255, b: 0 }    // hand
        ];

        // Process hand separately with corrected rotation sequence
        async function processHand() {
            if (!bodyPartImages?.left_hand?.[0]) return null;

            // 1. First rotate around upper arm center
            const afterUpperArmRotation = await rotateSegment(
                bodyPartImages.left_hand[0].imageData,
                width,
                height,
                upperArmAngle,
                upperArmRotationCenter,
                colors[4]
            );

            // 2. Then rotate around lower arm center
            const afterLowerArmRotation = await rotateSegment(
                afterUpperArmRotation,
                width,
                height,
                lowerArmAngle,
                lowerArmRotationCenter,
                colors[4]
            );

            // Calculate final hand rotation center
            const handRotationCenter = {
                x: lowerArmRotationCenter.x + 
                   (Math.cos((upperArmAngle + lowerArmAngle) * Math.PI / 180) * 20),
                y: lowerArmRotationCenter.y + 
                   (Math.sin((upperArmAngle + lowerArmAngle) * Math.PI / 180) * 20)
            };

            // 3. Apply final hand-specific rotation
            const handAngle = 0; // Adjust this if you need additional hand rotation
            return rotateSegment(
                afterLowerArmRotation,
                width,
                height,
                handAngle,
                handRotationCenter,
                colors[4]
            );
        }

        const promises = [
            calculateRotatedPoints(upperArmAngle, lowerArmAngle, upperArmRotationCenter, lowerArmRotationCenter),
            // Process upper arm segments
            ...(bodyPartImages?.left_upper_arm_back?.[0] ? [
                rotateSegment(
                    bodyPartImages.left_upper_arm_back[0].imageData,
                    width,
                    height,
                    upperArmAngle,
                    upperArmRotationCenter,
                    colors[0]
                )
            ] : []),
            ...(bodyPartImages?.left_upper_arm_front?.[0] ? [
                rotateSegment(
                    bodyPartImages.left_upper_arm_front[0].imageData,
                    width,
                    height,
                    upperArmAngle,
                    upperArmRotationCenter,
                    colors[1]
                )
            ] : []),
            // Process lower arm segments with sequential rotations
            ...(bodyPartImages?.left_lower_arm_back?.[0] ? [
                (async () => {
                    const upperRotated = await rotateSegment(
                        bodyPartImages.left_lower_arm_back[0].imageData,
                        width,
                        height,
                        upperArmAngle,
                        upperArmRotationCenter,
                        colors[2]
                    );
                    return rotateSegment(
                        upperRotated,
                        width,
                        height,
                        lowerArmAngle,
                        lowerArmRotationCenter,
                        colors[2]
                    );
                })()
            ] : []),
            ...(bodyPartImages?.left_lower_arm_front?.[0] ? [
                (async () => {
                    const upperRotated = await rotateSegment(
                        bodyPartImages.left_lower_arm_front[0].imageData,
                        width,
                        height,
                        upperArmAngle,
                        upperArmRotationCenter,
                        colors[3]
                    );
                    return rotateSegment(
                        upperRotated,
                        width,
                        height,
                        lowerArmAngle,
                        lowerArmRotationCenter,
                        colors[3]
                    );
                })()
            ] : []),
            // Add the corrected hand processing
            processHand()
        ];

        // Wait for all operations to complete
        const [rotatedPoints, ...rotatedSegments] = await Promise.all(promises);

        // Filter out null results from rotatedSegments
        const validRotatedSegments = rotatedSegments.filter(segment => segment !== null);

        // Combine the rotated segments into final image data
        const finalImageData = new Uint8ClampedArray(imageData.data);
        validRotatedSegments.forEach((segmentData) => {
            for (let i = 0; i < segmentData.length; i += 4) {
                if (segmentData[i + 3] > 0) {
                    finalImageData[i] = segmentData[i];
                    finalImageData[i + 1] = segmentData[i + 1];
                    finalImageData[i + 2] = segmentData[i + 2];
                    finalImageData[i + 3] = segmentData[i + 3];
                }
            }
        });

        return {
            imageData: finalImageData,
            rotatedPoints,
            upperArmRotationCenter,
            lowerArmRotationCenter,
            upperArmRotation: upperArmAngle,
            lowerArmRotation: lowerArmAngle
        };
    }
    if (type === 'combinedResults') {
        const upperArmAngles = rotationAngles.upperArm?.length > 0 ? 
            rotationAngles.upperArm : Array.from({length: 3}, (_, i) => -30 + i * 30);
        const lowerArmAngles = rotationAngles.lowerArm?.length > 0 ? 
            rotationAngles.lowerArm : Array.from({length: 3}, (_, i) => -20 + i * 20);

        const allVariations = [];
        
        // Generate all combinations of upper and lower arm angles
        for (const upperArmAngle of upperArmAngles) {
            for (const lowerArmAngle of lowerArmAngles) {
                allVariations.push({ upperArmAngle, lowerArmAngle });
            }
        }

        Promise.all(
            allVariations.map(({ upperArmAngle, lowerArmAngle }) => {
                return processVariation(upperArmAngle, lowerArmAngle);
            })
        ).then(variations => {
            self.postMessage({
                type: 'processedVariations',
                variations: variations.map(variation => ({
                    imageData: variation.imageData,
                    width,
                    height,
                    extremePoints: variation.rotatedPoints,
                    averages: {
                        ...averages,
                        left_upper_arm: variation.rotatedPoints.leftUpperArmAverage,
                        left_lower_arm: variation.rotatedPoints.leftLowerArmAverage
                    },
                    upperArmRotation: variation.upperArmRotation,
                    lowerArmRotation: variation.lowerArmRotation,
                    partName: partNames
                })),
                timestamp,
                partNames
            });
        });
    }
};