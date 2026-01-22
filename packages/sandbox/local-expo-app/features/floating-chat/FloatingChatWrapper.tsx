// IMPORTANT: DO NOT DELETE OR EDIT THIS FILE
import React, { useState } from 'react'
import { Modal, Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { NavigationModal } from './NavigationModal'
import { DraggableFloatingButton } from './DraggableFloatingButton'
import { MockChatButton } from './MockChatButton'
import { MockChatScreen } from './MockChatScreen'

export function FloatingChatWrapper({ children }: { children: React.ReactNode }) {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isMockChatVisible, setIsMockChatVisible] = useState(false)


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {children}

      {/* Draggable floating chat button */}
      <DraggableFloatingButton onPress={() => setIsModalVisible(true)} />

      {/* Mock chat button (dev only) */}
      {/* <MockChatButton onPress={() => setIsMockChatVisible(true)} /> */}

      {/* Navigation modal with auth and screens */}
      <NavigationModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />

      {/* Mock chat modal (dev only) */}
      {/* {__DEV__ && (
        <Modal
          visible={isMockChatVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsMockChatVisible(false)}
        >
          <MockChatScreen onClose={() => setIsMockChatVisible(false)} />
        </Modal>
      )} */}
    </GestureHandlerRootView>
  )
}
