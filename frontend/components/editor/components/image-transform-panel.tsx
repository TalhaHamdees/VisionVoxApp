// Handler functions to update keyframes in the overlay
const handlePositionKeyframeChange = (keyframes: PositionKeyframe[]) => {
  const updatedOverlay = {
    ...localOverlay,
    positionKeyframes: keyframes
  }
  
  // Update the overlay directly to ensure immediate effect
  handleOverlayChange(updatedOverlay)
  
  // Call the parent handler
  if (onKeyframeChange.position) {
    onKeyframeChange.position(keyframes)
  }
}

const handleRotationKeyframeChange = (keyframes: RotationKeyframe[]) => {
  const updatedOverlay = {
    ...localOverlay,
    rotationKeyframes: keyframes
  }
  
  // Update the overlay directly to ensure immediate effect
  handleOverlayChange(updatedOverlay)
  
  // Call the parent handler
  if (onKeyframeChange.rotation) {
    onKeyframeChange.rotation(keyframes)
  }
}

const handleOpacityKeyframeChange = (keyframes: OpacityKeyframe[]) => {
  const updatedOverlay = {
    ...localOverlay,
    opacityKeyframes: keyframes
  }
  
  // Update the overlay directly to ensure immediate effect
  handleOverlayChange(updatedOverlay)
  
  // Call the parent handler
  if (onKeyframeChange.opacity) {
    onKeyframeChange.opacity(keyframes)
  }
}

const handleScaleKeyframeChange = (keyframes: SimpleScaleKeyframe[]) => {
  const complexKeyframes = convertSimpleToComplexScaleKeyframes(keyframes)
  const updatedOverlay = {
    ...localOverlay,
    scaleKeyframes: complexKeyframes
  }
  
  // Update the overlay directly to ensure immediate effect
  handleOverlayChange(updatedOverlay)
  
  // Call the parent handler
  if (onKeyframeChange.scale) {
    onKeyframeChange.scale(keyframes as any) // Type assertion to handle the mismatch
  }
} 