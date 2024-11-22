self.onmessage = function(e) {
    const { imageData, width, height, extremePoints, averages, timestamp, partNames } = e.data;
    
    const variations = [];
    const rotationAngles = [-45, 0, 45];
    
    // Get rotation centers
    const upperArmRotationCenter = averages?.left_upper_arm?.top || null;
    const lowerArmRotationCenter = averages?.left_lower_arm?.top || null;
    
    if (!upperArmRotationCenter || !lowerArmRotationCenter) {
        console.error('Required rotation centers not found');
        return;
    }
    
    // Function to rotate point around center
    const rotatePoint = (point, center, angle) => {
        const rad = (angle * Math.PI) / 180;
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        return {
            x: center.x + (dx * Math.cos(rad) - dy * Math.sin(rad)),
            y: center.y + (dx * Math.sin(rad) + dy * Math.cos(rad))
        };
    };
    
    for (let upperArmAngle of rotationAngles) {
        for (let lowerArmAngle of rotationAngles) {
            const shiftedImageData = new Uint8ClampedArray(width * height * 4);
            const tempBuffer = new Uint8ClampedArray(width * height * 4);
            
            // Calculate upper arm's bottom point after rotation
            const rotatedUpperArmBottom = rotatePoint(
                extremePoints.leftUpperArmFront.bottom,
                upperArmRotationCenter,
                upperArmAngle
            );
            
            for (let py = 0; py < height; py++) {
                for (let px = 0; px < width; px++) {
                    const sourceIdx = (py * width + px) * 4;
                    let newX = px;
                    let newY = py;
                    
                    // Handle upper arm rotation
                    if (extremePoints?.leftUpperArmFront) {
                        const armRegionPadding = 30;
                        const isInUpperArmRegion = 
                            px >= Math.min(extremePoints.leftUpperArmFront.top.x, extremePoints.leftUpperArmFront.bottom.x) - armRegionPadding &&
                            px <= Math.max(extremePoints.leftUpperArmFront.top.x, extremePoints.leftUpperArmFront.bottom.x) + armRegionPadding &&
                            py >= Math.min(extremePoints.leftUpperArmFront.top.y, extremePoints.leftUpperArmFront.bottom.y) - armRegionPadding &&
                            py <= Math.max(extremePoints.leftUpperArmFront.top.y, extremePoints.leftUpperArmFront.bottom.y) + armRegionPadding;
                        
                        if (isInUpperArmRegion) {
                            const rotated = rotatePoint(
                                { x: px, y: py },
                                upperArmRotationCenter,
                                upperArmAngle
                            );
                            newX = rotated.x;
                            newY = rotated.y;
                        }
                    }
                    
                    // Handle lower arm rotation
                    if (extremePoints?.leftLowerArmFront) {
                        const armRegionPadding = 30;
                        const isInLowerArmRegion = 
                            px >= Math.min(extremePoints.leftLowerArmFront.top.x, extremePoints.leftLowerArmFront.bottom.x) - armRegionPadding &&
                            px <= Math.max(extremePoints.leftLowerArmFront.top.x, extremePoints.leftLowerArmFront.bottom.x) + armRegionPadding &&
                            py >= Math.min(extremePoints.leftLowerArmFront.top.y, extremePoints.leftLowerArmFront.bottom.y) - armRegionPadding &&
                            py <= Math.max(extremePoints.leftLowerArmFront.top.y, extremePoints.leftLowerArmFront.bottom.y) + armRegionPadding;
                        
                        if (isInLowerArmRegion) {
                            // Adjust position based on upper arm rotation
                            const offsetX = rotatedUpperArmBottom.x - extremePoints.leftLowerArmFront.top.x;
                            const offsetY = rotatedUpperArmBottom.y - extremePoints.leftLowerArmFront.top.y;
                            
                            newX += offsetX;
                            newY += offsetY;
                            
                            // Apply lower arm rotation
                            const newLowerArmRotationCenter = {
                                x: lowerArmRotationCenter.x + offsetX,
                                y: lowerArmRotationCenter.y + offsetY
                            };
                            
                            const rotated = rotatePoint(
                                { x: newX, y: newY },
                                newLowerArmRotationCenter,
                                lowerArmAngle
                            );
                            newX = rotated.x;
                            newY = rotated.y;
                        }
                    }
                    
                    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                        const targetIdx = (Math.round(newY) * width + Math.round(newX)) * 4;
                        if (imageData.data[sourceIdx + 3] > 0) {
                            tempBuffer[targetIdx] = imageData.data[sourceIdx];
                            tempBuffer[targetIdx + 1] = imageData.data[sourceIdx + 1];
                            tempBuffer[targetIdx + 2] = imageData.data[sourceIdx + 2];
                            tempBuffer[targetIdx + 3] = imageData.data[sourceIdx + 3];
                        }
                    }
                }
            }
            
            shiftedImageData.set(tempBuffer);
            
            variations.push({
                imageData: shiftedImageData,
                width,
                height,
                upperArmRotation: upperArmAngle,
                lowerArmRotation: lowerArmAngle,
                upperArmRotationCenter,
                lowerArmRotationCenter: {
                    x: lowerArmRotationCenter.x + (rotatedUpperArmBottom.x - extremePoints.leftLowerArmFront.top.x),
                    y: lowerArmRotationCenter.y + (rotatedUpperArmBottom.y - extremePoints.leftLowerArmFront.top.y)
                },
                partNames
            });
        }
    }
    
    self.postMessage({
        type: 'rotationVariations',
        variations,
        timestamp,
        partNames
    });
};