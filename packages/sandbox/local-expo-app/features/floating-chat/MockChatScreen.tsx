/**
 * Mock Chat Screen for Development Testing
 *
 * This component provides a chat interface that uses the Next.js mock API
 * endpoint to test streaming functionality without authentication.
 *
 * Only rendered in __DEV__ mode.
 */

import React, { useRef, useCallback, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  InteractionManager,
} from 'react-native'
import { useChat } from '@ai-sdk/react'
import { X, Zap } from 'lucide-react-native'
import { fetch as baseFetch } from 'expo/fetch'

interface MockChatScreenProps {
  onClose: () => void
}

export function MockChatScreen({ onClose }: MockChatScreenProps) {
  const flatListRef = useRef<FlatList>(null)
  const shouldAutoScrollRef = useRef(true)
  const pendingScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPendingScroll = useCallback(() => {
    if (pendingScrollTimeoutRef.current) {
      clearTimeout(pendingScrollTimeoutRef.current)
      pendingScrollTimeoutRef.current = null
    }
  }, [])

  const scrollToBottom = useCallback(
    ({ animated = false, delay = 0 }: { animated?: boolean; delay?: number } = {}) => {
      if (!flatListRef.current) {
        return
      }

      clearPendingScroll()

      const runScroll = () => {
        InteractionManager.runAfterInteractions(() => {
          flatListRef.current?.scrollToEnd({ animated })
        })
      }

      if (delay > 0) {
        pendingScrollTimeoutRef.current = setTimeout(runScroll, delay)
      } else {
        runScroll()
      }
    },
    [clearPendingScroll],
  )

  // Use AI SDK's useChat hook with mock endpoint via ngrok
  const {
    messages,
    error,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    api: 'https://4343.sa.ngrok.io/api/chat-mock',
    fetch: baseFetch as any,
    onError: error => {
      console.error('[MockChatScreen] Error:', error)
    },
    onResponse: response => {
      console.log('[MockChatScreen] Response received:', response.status)
    },
    onFinish: message => {
      console.log('[MockChatScreen] Stream finished:', message.id)
    },
  })

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0 && shouldAutoScrollRef.current) {
      scrollToBottom({ animated: false, delay: 100 })
    }
  }, [messages, scrollToBottom])

  useEffect(() => {
    return () => {
      clearPendingScroll()
    }
  }, [clearPendingScroll])

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) {
      return
    }

    console.log('[MockChatScreen] Sending message:', input.trim())
    shouldAutoScrollRef.current = true

    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent

    handleSubmit(syntheticEvent)
  }, [input, isLoading, handleSubmit])

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user'
    const content = item.content || ''

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText,
          ]}
        >
          {content}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Zap size={20} color="#10b981" fill="#10b981" />
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Mock Chat</Text>
            <Text style={styles.headerSubtitle}>Dev Testing Mode</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          activeOpacity={0.7}
        >
          <X size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Dev banner */}
      <View style={styles.devBanner}>
        <Text style={styles.devBannerText}>
          🧪 Mock streaming test via ngrok - No auth required
        </Text>
      </View>

      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      {/* Chat messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (shouldAutoScrollRef.current) {
            scrollToBottom({ animated: false })
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Zap size={48} color="#10b981" fill="#10b981" />
            <Text style={styles.emptyStateText}>
              Test Streaming Chat
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Send a message to test the streaming functionality
            </Text>
          </View>
        }
      />

      {/* Input area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={(text) => {
              const event = {
                target: { value: text },
              } as React.ChangeEvent<HTMLInputElement>
              handleInputChange(event)
            }}
            placeholder="Type a test message..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            editable={!isLoading}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendButton,
              (!input.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            disabled={!input.trim() || isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitleContainer: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  devBanner: {
    backgroundColor: '#d1fae5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#10b981',
  },
  devBannerText: {
    fontSize: 13,
    color: '#065f46',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#10b981',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#000',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    fontSize: 15,
    color: '#000',
  },
  sendButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 70,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
})
