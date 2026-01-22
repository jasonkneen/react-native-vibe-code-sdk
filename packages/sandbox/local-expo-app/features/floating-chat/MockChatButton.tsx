/**
 * Mock Chat Button for Development
 *
 * This button only appears in __DEV__ mode and opens the mock chat
 * interface for testing streaming without authentication.
 */

import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import { type FC, useCallback, useMemo } from 'react'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import { Zap } from 'lucide-react-native'
import type { WithSpringConfig } from 'react-native-reanimated'

type MockChatButtonProps = {
  onPress: () => void
  buttonSize?: number
  springConfig?: WithSpringConfig
}

export const MockChatButton: FC<MockChatButtonProps> = ({
  onPress,
  buttonSize = 50,
  springConfig = {
    damping: 25,
    stiffness: 250,
    mass: 1,
  },
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()

  // Position in top-right corner with some padding
  const initialX = screenWidth - buttonSize - 20
  const initialY = 100

  const translateX = useSharedValue(initialX)
  const translateY = useSharedValue(initialY)
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)
  const hasMoved = useSharedValue(false)

  const handlePress = useCallback(() => {
    'worklet'
    runOnJS(onPress)()
  }, [onPress])

  // Simple snap to nearest edge
  const snapToEdge = (x: number, y: number) => {
    'worklet'
    const midX = screenWidth / 2
    const padding = 20

    // Clamp Y position
    const clampedY = Math.max(padding, Math.min(screenHeight - buttonSize - padding, y))

    // Snap to left or right edge
    const snappedX = x < midX ? padding : screenWidth - buttonSize - padding

    return { x: snappedX, y: clampedY }
  }

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .minDistance(5)
      .onBegin(() => {
        hasMoved.set(false)
        startX.set(translateX.get())
        startY.set(translateY.get())
      })
      .onChange(event => {
        hasMoved.set(true)
        translateX.set(startX.get() + event.translationX)
        translateY.set(startY.get() + event.translationY)
      })
      .onEnd(event => {
        const snapPosition = snapToEdge(translateX.get(), translateY.get())

        translateX.set(
          withSpring(snapPosition.x, {
            ...springConfig,
            velocity: event.velocityX,
          }),
        )
        translateY.set(
          withSpring(snapPosition.y, {
            ...springConfig,
            velocity: event.velocityY,
          }),
        )
      })
  }, [
    hasMoved,
    startX,
    translateX,
    startY,
    translateY,
    buttonSize,
    screenWidth,
    screenHeight,
    springConfig,
  ])

  const tapGesture = useMemo(() => {
    return Gesture.Tap().onEnd(() => {
      handlePress()
    })
  }, [handlePress])

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture)

  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.get() },
        { translateY: translateY.get() },
      ],
    }
  })

  // Only render in dev mode and not on web
  if (!__DEV__ || Platform.OS === 'web') return null

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.floatingButton, buttonStyle]}>
        <View
          style={[
            styles.circle,
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
            },
          ]}
        >
          <Zap size={buttonSize - 20} color="#fff" fill="#fff" />
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    zIndex: 998, // One less than main button
  },
  circle: {
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
})
