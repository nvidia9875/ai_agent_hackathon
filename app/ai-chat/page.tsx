'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Avatar,
  Button,
  InputAdornment
} from '@mui/material';
import {
  Send as SendIcon,
  Image as ImageIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';

interface Message {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: Date;
  sender: string;
}

function AiChatContent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "Hello! How can I assist you today?",
      isUser: false,
      timestamp: new Date(),
      sender: "AI Assistant"
    },
    {
      id: 2,
      content: "Hi, I'm looking for a lost dog in the downtown area. Can you help?",
      isUser: true,
      timestamp: new Date(),
      sender: "You"
    },
    {
      id: 3,
      content: "Yes, I can help. Please provide the dog's breed, color, and any distinguishing features, as well as the location where the dog was last seen.",
      isUser: false,
      timestamp: new Date(),
      sender: "AI Assistant"
    },
    {
      id: 4,
      content: "It's a golden retriever, light brown, with a red collar. Last seen near the park on Elm Street.",
      isUser: true,
      timestamp: new Date(),
      sender: "You"
    },
    {
      id: 5,
      content: "Thank you for the information. I'm scanning the area now. I'll send you updates as soon as I have any information.",
      isUser: false,
      timestamp: new Date(),
      sender: "AI Assistant"
    }
  ]);

  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: messages.length + 1,
        content: newMessage,
        isUser: true,
        timestamp: new Date(),
        sender: "You"
      };
      setMessages([...messages, message]);
      setNewMessage('');

      // Simulate AI response after a delay
      setTimeout(() => {
        const aiResponse: Message = {
          id: messages.length + 2,
          content: "I'm processing your message. Let me help you with that.",
          isUser: false,
          timestamp: new Date(),
          sender: "AI Assistant"
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEndConversation = () => {
    // Clear messages or navigate away
    setMessages([]);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      
      <Box sx={{ 
        flex: 1, 
        backgroundColor: 'grey.50', 
        p: 4,
        overflow: 'auto'
      }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          {/* Page Header */}
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            AI Chat
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Get assistance and updates about your missing pet search
          </Typography>

          {/* Chat Container */}
          <Paper elevation={0} sx={{ backgroundColor: 'white', height: 600, display: 'flex', flexDirection: 'column' }}>
            {/* Messages Area */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                    mb: 3
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'end', gap: 1, maxWidth: '70%' }}>
                    {!message.isUser && (
                      <Avatar sx={{ width: 40, height: 40, bgcolor: 'grey.400' }}>
                        🤖
                      </Avatar>
                    )}
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        {message.sender}
                      </Typography>
                      <Paper
                        elevation={1}
                        sx={{
                          p: 2,
                          backgroundColor: message.isUser ? 'primary.main' : 'grey.100',
                          color: message.isUser ? 'white' : 'text.primary',
                          borderRadius: 2,
                          borderBottomLeftRadius: message.isUser ? 2 : 0,
                          borderBottomRightRadius: message.isUser ? 0 : 2,
                        }}
                      >
                        <Typography variant="body1">
                          {message.content}
                        </Typography>
                      </Paper>
                    </Box>

                    {message.isUser && (
                      <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                        U
                      </Avatar>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Input Area */}
            <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'grey.50',
                    borderRadius: 2,
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton>
                        <ImageIcon />
                      </IconButton>
                      <Button
                        variant="contained"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        sx={{ ml: 1, borderRadius: 2 }}
                      >
                        <SendIcon />
                      </Button>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          </Paper>

          {/* Chat Details Section */}
          <Box sx={{ mt: 4, display: 'flex', gap: 4 }}>
            <Paper elevation={0} sx={{ p: 3, backgroundColor: 'white', flex: 1 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Conversation Details
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: 'grey.400' }}>
                    🤖
                  </Avatar>
                  <Box>
                    <Typography fontWeight="600">
                      AI Assistant
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      Online
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                    U
                  </Avatar>
                  <Box>
                    <Typography fontWeight="600">
                      You
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active now
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, backgroundColor: 'white', flex: 1 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Actions
              </Typography>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={handleEndConversation}
                sx={{
                  mt: 2,
                  color: 'error.main',
                  borderColor: 'error.main',
                  '&:hover': {
                    backgroundColor: 'error.main',
                    color: 'white'
                  }
                }}
              >
                Clear Conversation
              </Button>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function AiChatPage() {
  return (
    <ProtectedRoute>
      <AiChatContent />
    </ProtectedRoute>
  );
}