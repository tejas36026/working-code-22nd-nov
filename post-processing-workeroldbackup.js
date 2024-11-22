self.onmessage = function(e) {
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
        rotationAngles,
        offsets = {
            global: { x: 0, y: 0 }
        }
    } = e.data;

    function rotatePoint(point, center, angle) {
        // Use precise math calculations
        const radians = (angle * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        
        // Don't round the results to maintain precision
        return {
            x: center.x + (dx * cos - dy * sin),
            y: center.y + (dx * sin + dy * cos)
        };
    }

    function rotateSegment(segmentData, width, height, angle, center, color, offset = { x: 0, y: 0 }) {
        return new Promise((resolve) => {
            const radians = (angle * Math.PI) / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);
            const rotatedData = new Uint8ClampedArray(width * height * 4);
        
            // Add 1 pixel padding to avoid gaps
            for (let y = -1; y < height + 1; y++) {
                for (let x = -1; x < width + 1; x++) {

                    const offsetX = x + offset.x;
                    const offsetY = y + offset.y;
                    
                    const dx = offsetX - center.x;
                    const dy = offsetY - center.y;
                    

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


    async function processVariation(upperArmAngle, lowerArmAngle, variationOffset) {
        // First calculate all rotated points
        const rotatedPoints = {};
        const upperArmRotationCenter = averages.left_upper_arm.top;
        
        // Calculate upper arm points
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

        // Calculate rotated upper arm bottom point for lower arm calculations
        const rotatedUpperArmBottom = rotatePoint(
            extremePoints.leftUpperArmFront.bottom,
            upperArmRotationCenter,
            upperArmAngle
        );

        // Calculate lower arm points
        const lowerArmRotationCenter = {
            x: averages.left_lower_arm.top.x + (rotatedUpperArmBottom.x - extremePoints.leftLowerArmFront.top.x),
            y: averages.left_lower_arm.top.y + (rotatedUpperArmBottom.y - extremePoints.leftLowerArmFront.top.y)
        };

        if (extremePoints.leftLowerArmBack) {
            const offsetX = rotatedUpperArmBottom.x - extremePoints.leftLowerArmBack.top.x;
            const offsetY = rotatedUpperArmBottom.y - extremePoints.leftLowerArmBack.top.y;

            rotatedPoints.leftLowerArmBack = {
                top: rotatePoint(
                    { 
                        x: extremePoints.leftLowerArmBack.top.x ,
                        y: extremePoints.leftLowerArmBack.top.y  
                    },
                    lowerArmRotationCenter,
                    lowerArmAngle
                ),
                bottom: rotatePoint(
                    {
                        x: extremePoints.leftLowerArmBack.bottom.x,
                        y: extremePoints.leftLowerArmBack.bottom.y
                    },
                    lowerArmRotationCenter,
                    lowerArmAngle
                )
            };
        }

        if (extremePoints.leftLowerArmFront) {
            const offsetX = rotatedUpperArmBottom.x - extremePoints.leftLowerArmFront.top.x;
            const offsetY = rotatedUpperArmBottom.y - extremePoints.leftLowerArmFront.top.y;

            console.log('extremePoints.leftLowerArmFront.top.x :>> ', extremePoints.leftLowerArmFront.top.x);
            console.log('rotatedUpperArmBottom.x  :>> ', rotatedUpperArmBottom.x );
            console.log('offsetX :>> ', offsetX);
            console.log('offsetY :>> ', offsetY);

            rotatedPoints.leftLowerArmFront = {
                top: rotatePoint(
                    {
                        x: extremePoints.leftLowerArmFront.top.x + offsetX,
                        y: extremePoints.leftLowerArmFront.top.y + offsetY
                    },
                    lowerArmRotationCenter,
                    lowerArmAngle
                ),
                bottom: rotatePoint(
                    {
                        x: extremePoints.leftLowerArmFront.bottom.x + offsetX,
                        y: extremePoints.leftLowerArmFront.bottom.y + offsetY
                    },
                    lowerArmRotationCenter,
                    lowerArmAngle
                )
            };
        }

        // Calculate hand points
        if (extremePoints.leftHand) {
            const handOffsetX = rotatedPoints.leftLowerArmFront.bottom.x - extremePoints.leftHand.top.x;
            const handOffsetY = rotatedPoints.leftLowerArmFront.bottom.y - extremePoints.leftHand.top.y;

            rotatedPoints.leftHand = {
                top: rotatePoint(
                    {
                        x: extremePoints.leftHand.top.x,
                        y: extremePoints.leftHand.top.y 
                    },
                    rotatedPoints.leftLowerArmFront.bottom,
                    lowerArmAngle
                ),
                bottom: rotatePoint(
                    {
                        x: extremePoints.leftHand.bottom.x ,
                        y: extremePoints.leftHand.bottom.y 
                    },
                    rotatedPoints.leftLowerArmFront.bottom,
                    lowerArmAngle
                )
            };
        }

        // Now rotate all image segments in parallel
        const rotationPromises = [];

        // Define colors for each segment
        const colors = [
            { r: 255, g: 0, b: 0 }, // Red for upper arm back
            { r: 255, g: 0, b: 0 }, // Green for upper arm front
            { r: 255, g: 255, b: 0 }, // Yellow for lower arm front
            { r: 255, g: 255, b: 0 }, // Yellow for lower arm front
            { r: 255, g: 0, b: 255 } // Magenta for hand
        ];

        // Upper arm rotations
        if (bodyPartImages?.left_upper_arm_back?.[0]) {
            rotationPromises.push(
                rotateSegment(
                    bodyPartImages.left_upper_arm_back[0].imageData,
                    width,
                    height,
                    upperArmAngle,
                    upperArmRotationCenter,
                    colors[0]
                ).then(data => ({ type: 'upperArmBack', data }))
            );
        }

        if (bodyPartImages?.left_upper_arm_front?.[0]) {
            rotationPromises.push(
                rotateSegment(
                    bodyPartImages.left_upper_arm_front[0].imageData,
                    width,
                    height,
                    upperArmAngle,
                    upperArmRotationCenter,
                    colors[1]
                ).then(data => ({ type: 'upperArmFront', data }))
            );
        }

        // Lower arm rotations
        if (bodyPartImages?.left_lower_arm_back?.[0]) {
            const offsetX = rotatedUpperArmBottom.x - extremePoints.leftLowerArmBack.top.x;
            const offsetY = rotatedUpperArmBottom.y - extremePoints.leftLowerArmBack.top.y;

            rotationPromises.push(
                rotateSegment(
                    bodyPartImages.left_lower_arm_back[0].imageData,
                    width,
                    height,
                    lowerArmAngle,
                    lowerArmRotationCenter,
                    colors[2]
                ).then(data => ({ type: 'lowerArmBack', data, offset: { x: offsetX, y: offsetY } }))
            );
        }

        if (bodyPartImages?.left_lower_arm_front?.[0]) {
            const offsetX = rotatedUpperArmBottom.x - extremePoints.leftLowerArmFront.top.x;
            const offsetY = rotatedUpperArmBottom.y - extremePoints.leftLowerArmFront.top.y;

            rotationPromises.push(
                rotateSegment(
                    bodyPartImages.left_lower_arm_front[0].imageData,
                    width,
                    height,
                    lowerArmAngle,
                    lowerArmRotationCenter,
                    colors[3]
                ).then(data => ({ type: 'lowerArmFront', data, offset: { x: offsetX, y: offsetY } }))
            );
        }


if (bodyPartImages?.left_hand?.[0]) {
console.log('rotatedPoints :>> ', rotatedPoints);
    const handRotationCenter = rotatedPoints.leftLowerArmFront.bottom;

    const handOffsetX = extremePoints.leftHand.top.x - extremePoints.leftLowerArmFront.bottom.x;
    const handOffsetY = extremePoints.leftHand.top.y - extremePoints.leftLowerArmFront.bottom.y;

    rotatedPoints.leftHand = {
        top: rotatePoint(
            {
                x: handRotationCenter.x + handOffsetX,
                y: handRotationCenter.y + handOffsetY
            },
            handRotationCenter,
            lowerArmAngle
        ),
        bottom: rotatePoint(
            {
                x: handRotationCenter.x + handOffsetX + (extremePoints.leftHand.bottom.x - extremePoints.leftHand.top.x),
                y: handRotationCenter.y + handOffsetY + (extremePoints.leftHand.bottom.y - extremePoints.leftHand.top.y)
            },
            handRotationCenter,
            lowerArmAngle
        )
    };

    rotationPromises.push(
        rotateSegment(
            bodyPartImages.left_hand[0].imageData,
            width,
            height,
            lowerArmAngle,
            handRotationCenter,
            colors[4]
        ).then(data => ({ 
            type: 'hand', 
            data, 
            offset: { 
                x: handOffsetX, 
                y: handOffsetY 
            } 
        }))
    );
}

        // Wait for all rotations to complete
        const rotatedSegments = await Promise.all(rotationPromises);

        // Combine all rotated segments
        const finalImageData = new Uint8ClampedArray(imageData.data);
        
        // Apply rotated segments in the correct order
        rotatedSegments.forEach(({ type, data, offset }) => {
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) {
                    finalImageData[i] = data[i];
                    finalImageData[i + 1] = data[i + 1];
                    finalImageData[i + 2] = data[i + 2];
                    finalImageData[i + 3] = data[i + 3];
                }
            }
            const preservedRotatedPoints = preserveArmSegmentPositions(extremePoints, rotatedPoints);
            return {
                imageData: finalImageData,
                rotatedPoints: preservedRotatedPoints,
                upperArmRotationCenter,
                lowerArmRotationCenter,
                rotatedUpperArmBottom
            };
        
        function preserveArmSegmentPositions(extremePoints, rotatedPoints) {
                // Calculate original distances between arm segments
                const originalUpperArmDistance = Math.sqrt(
                    Math.pow(extremePoints.leftUpperArmFront.bottom.x - extremePoints.leftUpperArmBack.bottom.x, 2) +
                    Math.pow(extremePoints.leftUpperArmFront.bottom.y - extremePoints.leftUpperArmBack.bottom.y, 2)
                );
            
                const originalLowerArmDistance = Math.sqrt(
                    Math.pow(extremePoints.leftLowerArmFront.bottom.x - extremePoints.leftLowerArmBack.bottom.x, 2) +
                    Math.pow(extremePoints.leftLowerArmFront.bottom.y - extremePoints.leftLowerArmBack.bottom.y, 2)
                );
            
                // Adjust rotated points to maintain original segment distances
                function alignSegments(frontSegment, backSegment, originalDistance) {
                    const midpoint = {
                        x: (frontSegment.bottom.x + backSegment.bottom.x) / 2,
                        y: (frontSegment.bottom.y + backSegment.bottom.y) / 2
                    };
            
                    const currentVector = {
                        x: frontSegment.bottom.x - backSegment.bottom.x,
                        y: frontSegment.bottom.y - backSegment.bottom.y
                    };
            
                    const currentDistance = Math.sqrt(
                        Math.pow(currentVector.x, 2) + 
                        Math.pow(currentVector.y, 2)
                    );
            
                    const scaleFactor = originalDistance / currentDistance;
            
                    backSegment.bottom = {
                        x: midpoint.x - (currentVector.x / 2 * scaleFactor),
                        y: midpoint.y - (currentVector.y / 2 * scaleFactor)
                    };
            
                    frontSegment.bottom = {
                        x: midpoint.x + (currentVector.x / 2 * scaleFactor),
                        y: midpoint.y + (currentVector.y / 2 * scaleFactor)
                    };
                }
            
                // Apply alignment for upper and lower arm segments
                if (rotatedPoints.leftUpperArmFront && rotatedPoints.leftUpperArmBack) {
                    alignSegments(
                        rotatedPoints.leftUpperArmFront, 
                        rotatedPoints.leftUpperArmBack, 
                        originalUpperArmDistance
                    );
                }
            
                if (rotatedPoints.leftLowerArmFront && rotatedPoints.leftLowerArmBack) {
                    alignSegments(
                        rotatedPoints.leftLowerArmFront, 
                        rotatedPoints.leftLowerArmBack, 
                        originalLowerArmDistance
                    );
                }
            
                return rotatedPoints;
            }
            

            return {
                ...existingReturnObject,
                rotatedPoints: preservedRotatedPoints
            };        
        });

        return {
            imageData: finalImageData,
            rotatedPoints,
            upperArmRotationCenter,
            lowerArmRotationCenter,
            rotatedUpperArmBottom
        };
    }

    if (type === 'combinedResults') {
        const upperArmAngles = rotationAngles.length > 0 ? rotationAngles : 
            Array.from({length: 3}, (_, i) => -30 + i * 30);
        const lowerArmAngles = [-45, 90, 45];
        const baseOffset = offsets?.global || { x: 0, y: 0 };

        const generateVariationOffsets = (index, totalVariations) => ({
            x: baseOffset.x + (index - Math.floor(totalVariations / 2)) * 50,
            y: baseOffset.y + (index - Math.floor(totalVariations / 2)) * 30
        });

        // Process all variations in parallel
        Promise.all(
            upperArmAngles.flatMap((upperArmAngle, index) =>
                lowerArmAngles.map(lowerArmAngle => {
                    const variationOffset = generateVariationOffsets(index, upperArmAngles.length);
                    return processVariation(upperArmAngle, lowerArmAngle, variationOffset)
                        .then(result => ({
                            ...result,
                            shift: variationOffset,
                            upperArmRotation: upperArmAngle,
                            lowerArmRotation: lowerArmAngle
                        }));
                })
            )
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
                        left_upper_arm: {
                            top: {
                                x: variation.upperArmRotationCenter.x + variation.shift.x,
                                y: variation.upperArmRotationCenter.y + variation.shift.y
                            },
                            bottom: {
                                x: variation.rotatedUpperArmBottom.x + variation.shift.x,
                                y: variation.rotatedUpperArmBottom.y + variation.shift.y
                            }
                        },
                        left_lower_arm: {
                            top: {
                                x: variation.rotatedUpperArmBottom.x + variation.shift.x,
                                y: variation.rotatedUpperArmBottom.y + variation.shift.y
                            },
                            bottom: {
                                x: variation.rotatedPoints.leftLowerArmFront.bottom.x + variation.shift.x,
                                y: variation.rotatedPoints.leftLowerArmFront.bottom.y + variation.shift.y
                            }
                        }
                    },
                    shift: variation.shift,
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