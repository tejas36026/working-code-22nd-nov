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
            global: { x: 180, y: 190 }
        }
    } = e.data;

    // Rotation helper functions
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

    function rotateSegment(segmentData, width, height, angle, center) {
        const rotatedImageData = new Uint8ClampedArray(segmentData.length);
        const centerX = center.x;
        const centerY = center.y;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const alpha = segmentData[index + 3];
                if (alpha > 0) {
                    const rotatedPoint = rotatePoint({ x, y }, { x: centerX, y: centerY }, angle);
                    const rotatedIndex = (Math.round(rotatedPoint.y) * width + Math.round(rotatedPoint.x)) * 4;
                    rotatedImageData[rotatedIndex] = segmentData[index];
                    rotatedImageData[rotatedIndex + 1] = segmentData[index + 1];
                    rotatedImageData[rotatedIndex + 2] = segmentData[index + 2];
                    rotatedImageData[rotatedIndex + 3] = alpha;
                }
            }
        }

        return rotatedImageData;
    }

    function applyGlobalOffset(imageData, width, height, offsetX, offsetY) {
        const offsettedImageData = new Uint8ClampedArray(imageData.length);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const newX = x + offsetX;
                const newY = y + offsetY;
                if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                    const newIndex = (newY * width + newX) * 4;
                    offsettedImageData[newIndex] = imageData[index];
                    offsettedImageData[newIndex + 1] = imageData[index + 1];
                    offsettedImageData[newIndex + 2] = imageData[index + 2];
                    offsettedImageData[newIndex + 3] = imageData[index + 3];
                }
            }
        }
        return offsettedImageData;
    }

    if (type === 'combinedResults') {
        const variations = [];
        const baseOffset = offsets?.global || { x: 0, y: 0 };

        // Generate different offsets for each variation
        const generateVariationOffsets = (index, totalVariations) => {
            const offsetX = baseOffset.x + (index * 10);
            const offsetY = baseOffset.y + (index * 10);
            return { x: offsetX, y: offsetY };
        };

        const angles = rotationAngles.length > 0 ? rotationAngles : 
            Array.from({length: 5}, (_, i) => -30 + i * 15); // Generates [-30, -15, 0, 15, 30]

        // Process each variation with different rotation and offset
        angles.forEach((angle, index) => {
            const variationOffset = generateVariationOffsets(index, angles.length);
            const rotatedImageData = new Uint8ClampedArray(imageData.data);
            const rotatedPoints = { ...extremePoints };
            let updatedAverages = { ...averages };

            // Process front segment
            if (bodyPartImages?.left_upper_arm_front?.[0] && extremePoints.leftUpperArmFront) {
                const frontPoints = extremePoints.leftUpperArmFront;
                const frontRotationCenter = {
                    x: updatedAverages.left_upper_arm.top.x,
                    y: updatedAverages.left_upper_arm.top.y
                };
                const frontSegmentData = bodyPartImages.left_upper_arm_front[0].imageData;

                const rotatedFrontSegment = rotateSegment(
                    frontSegmentData,
                    width,
                    height,
                    angle,
                    frontRotationCenter
                );

                // Blend the rotated front segment
                for (let i = 0; i < rotatedFrontSegment.length; i += 4) {
                    if (rotatedFrontSegment[i + 3] > 0) {
                        rotatedImageData[i] = rotatedFrontSegment[i];
                        rotatedImageData[i + 1] = rotatedFrontSegment[i + 1];
                        rotatedImageData[i + 2] = rotatedFrontSegment[i + 2];
                        rotatedImageData[i + 3] = rotatedFrontSegment[i + 3];
                    }
                }

                rotatedPoints.leftUpperArmFront = {
                    top: rotatePoint(frontPoints.top, frontRotationCenter, angle),
                    bottom: rotatePoint(frontPoints.bottom, frontRotationCenter, angle)
                };
            }

            // Process back segment
            if (bodyPartImages?.left_upper_arm_back?.[0] && extremePoints.leftUpperArmBack) {
                const backPoints = extremePoints.leftUpperArmBack;
                const backRotationCenter = {
                    x: updatedAverages.left_upper_arm.top.x,
                    y: updatedAverages.left_upper_arm.top.y
                };
                const backSegmentData = bodyPartImages.left_upper_arm_back[0].imageData;

                const rotatedBackSegment = rotateSegment(
                    backSegmentData,
                    width,
                    height,
                    angle,
                    backRotationCenter
                );

                // Blend the rotated back segment
                for (let i = 0; i < rotatedBackSegment.length; i += 4) {
                    if (rotatedBackSegment[i + 3] > 0) {
                        rotatedImageData[i] = rotatedBackSegment[i];
                        rotatedImageData[i + 1] = rotatedBackSegment[i + 1];
                        rotatedImageData[i + 2] = rotatedBackSegment[i + 2];
                        rotatedImageData[i + 3] = rotatedBackSegment[i + 3];
                    }
                }

                rotatedPoints.leftUpperArmBack = {
                    top: rotatePoint(backPoints.top, backRotationCenter, angle),
                    bottom: rotatePoint(backPoints.bottom, backRotationCenter, angle)
                };
            }

            // Process left lower arm front segment
            if (bodyPartImages?.left_lower_arm_front?.[0] && extremePoints.leftLowerArmFront) {
                const frontPoints = extremePoints.leftLowerArmFront;
                const frontRotationCenter = {
                    x: updatedAverages.left_upper_arm.bottom.x + variationOffset.x,
                    y: updatedAverages.left_upper_arm.bottom.y + variationOffset.y
                };
                const frontSegmentData = bodyPartImages.left_lower_arm_front[0].imageData;

                const rotatedFrontSegment = rotateSegment(
                    frontSegmentData,
                    width,
                    height,
                    angle,
                    frontRotationCenter
                );

                // Blend the rotated front segment
                for (let i = 0; i < rotatedFrontSegment.length; i += 4) {
                    if (rotatedFrontSegment[i + 3] > 0) {
                        rotatedImageData[i] = rotatedFrontSegment[i];
                        rotatedImageData[i + 1] = rotatedFrontSegment[i + 1];
                        rotatedImageData[i + 2] = rotatedFrontSegment[i + 2];
                        rotatedImageData[i + 3] = rotatedFrontSegment[i + 3];
                    }
                }

                rotatedPoints.leftLowerArmFront = {
                    top: rotatePoint(frontPoints.top, frontRotationCenter, angle),
                    bottom: rotatePoint(frontPoints.bottom, frontRotationCenter, angle)
                };
            }

            // Process left lower arm back segment
            if (bodyPartImages?.left_lower_arm_back?.[0] && extremePoints.leftLowerArmBack) {
                const backPoints = extremePoints.leftLowerArmBack;
                const backRotationCenter = {
                    x: updatedAverages.left_upper_arm.bottom.x + variationOffset.x,
                    y: updatedAverages.left_upper_arm.bottom.y + variationOffset.y
                };
                const backSegmentData = bodyPartImages.left_lower_arm_back[0].imageData;

                const rotatedBackSegment = rotateSegment(
                    backSegmentData,
                    width,
                    height,
                    angle,
                    backRotationCenter
                );

                // Blend the rotated back segment
                for (let i = 0; i < rotatedBackSegment.length; i += 4) {
                    if (rotatedBackSegment[i + 3] > 0) {
                        rotatedImageData[i] = rotatedBackSegment[i];
                        rotatedImageData[i + 1] = rotatedBackSegment[i + 1];
                        rotatedImageData[i + 2] = rotatedBackSegment[i + 2];
                        rotatedImageData[i + 3] = rotatedBackSegment[i + 3];
                    }
                }

                rotatedPoints.leftLowerArmBack = {
                    top: rotatePoint(backPoints.top, backRotationCenter, angle),
                    bottom: rotatePoint(backPoints.bottom, backRotationCenter, angle)
                };
            }

            // Apply unique offset for this variation
            const offsettedImageData = applyGlobalOffset(
                rotatedImageData, 
                width, 
                height, 
                variationOffset.x, 
                variationOffset.y
            );

            // Update points with variation-specific offset
            const offsettedPoints = {};
            for (let key in rotatedPoints) {
                if (rotatedPoints[key] && rotatedPoints[key].top) {
                    offsettedPoints[key] = {
                        top: {
                            x: rotatedPoints[key].top.x + variationOffset.x,
                            y: rotatedPoints[key].top.y + variationOffset.y
                        },
                        bottom: {
                            x: rotatedPoints[key].bottom.x + variationOffset.x,
                            y: rotatedPoints[key].bottom.y + variationOffset.y
                        }
                    };
                }
            }

            variations.push({
                imageData: offsettedImageData,
                width,
                height,
                extremePoints: offsettedPoints,
                averages: {
                    ...updatedAverages,
                    left_upper_arm: {
                        top: {
                            x: updatedAverages.left_upper_arm.top.x + variationOffset.x,
                            y: updatedAverages.left_upper_arm.top.y + variationOffset.y
                        },
                        bottom: {
                            x: updatedAverages.left_upper_arm.bottom.x + variationOffset.x,
                            y: updatedAverages.left_upper_arm.bottom.y + variationOffset.y
                        }
                    },
                    left_lower_arm: {
                        top: {
                            x: updatedAverages.left_lower_arm.top.x + variationOffset.x,
                            y: updatedAverages.left_lower_arm.top.y + variationOffset.y
                        },
                        bottom: {
                            x: updatedAverages.left_lower_arm.bottom.x + variationOffset.x,
                            y: updatedAverages.left_lower_arm.bottom.y + variationOffset.y
                        }
                    }
                },
                shift: variationOffset,
                rotation: angle,
                rotationCenter: {
                    x: updatedAverages.left_upper_arm.bottom.x + variationOffset.x,
                    y: updatedAverages.left_upper_arm.bottom.y + variationOffset.y
                },
                partName: partNames
            });
        });

        self.postMessage({
            type: 'processedVariations',
            variations,
            timestamp,
            partNames
        });
    }
};
