// IMPORTANT: DO NOT DELETE OR EDIT THIS COMPONENT 
import React, { useState, useEffect } from 'react'
import {
  Modal,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { LoginScreen } from './LoginScreen'
import { HomeScreen } from './HomeScreen'
import { ChatScreen } from './ChatScreen'
import { generateAPIUrl, authenticatedFetch } from '@/features/floating-chat/lib/api'
import { SafeAreaView } from 'react-native'

interface NavigationModalProps {
  visible: boolean
  onClose: () => void
}

type Screen = 'login' | 'home' | 'chat'

interface Project {
  id: string
  title: string
  template: string
  status: string
  createdAt: string
  updatedAt: string
  ngrokUrl?: string // Added after resume
}

export function NavigationModal({ visible, onClose }: NavigationModalProps) {
  const { user, isLoading } = useAuth()
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const [hasLoadedProject, setHasLoadedProject] = useState(false)

  // Load project from environment variable only once when modal opens
  useEffect(() => {
    const loadProjectFromUrl = async () => {
      // Get project ID from environment variable
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID

      // Don't load if we don't have the necessary data, or if we've already loaded
      // Also need modal to be visible to trigger the load
      if (!projectId || !user || !visible || hasLoadedProject) {
        return
      }

      console.log('[NavigationModal] Loading project from environment:', projectId)
      setIsLoadingProject(true)

      try {
        // Fetch project details
        const url = generateAPIUrl(`/api/projects/${projectId}?userID=${user.id}`)
        const response = await authenticatedFetch(url)
        const data = await response.json()

        if (data.project) {
          console.log('[NavigationModal] Project loaded:', data.project)

          // Check if project already has ngrokUrl
          if (data.project.ngrokUrl) {
            console.log('[NavigationModal] Project already has ngrokUrl:', data.project.ngrokUrl)
            setSelectedProject(data.project)
            setCurrentScreen('chat')
            setHasLoadedProject(true)
          } else {
            // Resume the container to get the ngrokUrl
            console.log('[NavigationModal] Resuming container to get ngrokUrl...')
            const resumeUrl = generateAPIUrl('/api/resume-container')
            const resumeResponse = await authenticatedFetch(resumeUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                projectId: data.project.id,
                userID: user.id,
              }),
            })

            console.log('[NavigationModal] Resume response status:', resumeResponse.status)

            if (!resumeResponse.ok) {
              const errorText = await resumeResponse.text()
              console.error('[NavigationModal] Resume failed:', errorText)
              console.error('[NavigationModal] Using project without ngrokUrl')
              // Use project as-is even without ngrokUrl
              setSelectedProject(data.project)
              setCurrentScreen('chat')
              setHasLoadedProject(true)
              return
            }

            const resumeResult = await resumeResponse.json()
            console.log('[NavigationModal] Resume result:', resumeResult)

            if (resumeResult.success && resumeResult.ngrokUrl) {
              const projectWithUrl = {
                ...data.project,
                ngrokUrl: resumeResult.ngrokUrl,
              }

              setSelectedProject(projectWithUrl)
              setCurrentScreen('chat')
              setHasLoadedProject(true)
            } else {
              console.error('[NavigationModal] Failed to resume container:', resumeResult.error)
              // Use project as-is even without ngrokUrl
              setSelectedProject(data.project)
              setCurrentScreen('chat')
              setHasLoadedProject(true)
            }
          }
        }
      } catch (error) {
        console.error('[NavigationModal] Error loading project:', error)
      } finally {
        setIsLoadingProject(false)
      }
    }

    loadProjectFromUrl()
  }, [user, visible, hasLoadedProject]) // Only load when modal becomes visible and we haven't loaded yet

  // Determine which screen to show based on auth state
  const getActiveScreen = (): Screen => {
    if (isLoading || isLoadingProject) {
      return 'home' // Will show loading state
    }
    if (!user) {
      return 'login'
    }
    return currentScreen
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
    setCurrentScreen('chat')
  }

  const handleNavigateHome = () => {
    setCurrentScreen('home')
    // Don't clear selectedProject - keep it so we can navigate back
  }

  const handleNavigateToChat = () => {
    if (selectedProject) {
      setCurrentScreen('chat')
    }
  }

  const handleClose = () => {
    // Reset to home when closing
    setCurrentScreen('home')
    setSelectedProject(null)
    setHasLoadedProject(false) // Reset so project can be loaded again next time
    onClose()
  }

  const activeScreen = getActiveScreen()

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Screen content */}
        <View style={styles.content}>
          {isLoading || isLoadingProject ? (
            <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="black" />
              <Text style={styles.loadingText}>
                {isLoadingProject ? 'Loading project...' : 'Loading...'}
              </Text>
            </View>
          ) : activeScreen === 'login' ? (
            <LoginScreen onClose={handleClose} />
          ) : activeScreen === 'home' ? (
            <HomeScreen
              onSelectProject={handleSelectProject}
              currentProject={selectedProject}
              onNavigateToChat={handleNavigateToChat}
              onClose={handleClose}
            />
          ) : (
            <ChatScreen
              onNavigateHome={handleNavigateHome}
              onClose={handleClose}
              selectedProject={selectedProject}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
})
