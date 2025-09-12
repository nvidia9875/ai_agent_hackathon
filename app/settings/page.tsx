'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import Sidebar from '@/components/Sidebar';

interface UserSettings {
  name: string;
  email: string;
  phone: string;
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    name: 'Sophia Clark',
    email: 'sophia.clark@example.com',
    phone: '',
    language: 'English',
    timezone: 'Pacific Standard Time',
    emailNotifications: true,
    pushNotifications: false
  });

  const handleInputChange = (field: keyof UserSettings) => (
    event: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>
  ) => {
    setSettings(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSwitchChange = (field: keyof UserSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSettings(prev => ({
      ...prev,
      [field]: event.target.checked
    }));
  };

  const handleSave = () => {
    console.log('Settings saved:', settings);
    // Here you would typically save to API
  };

  const handleCancel = () => {
    // Reset to original values or navigate away
    console.log('Changes cancelled');
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
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Account Settings
          </Typography>

          <Box sx={{ mt: 4, space: 6 }}>
            {/* Personal Information Section */}
            <Paper elevation={0} sx={{ p: 4, mb: 4, backgroundColor: 'white' }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Personal Information
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Update your personal details here.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={settings.name}
                    onChange={handleInputChange('name')}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white'
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={settings.email}
                    onChange={handleInputChange('email')}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white'
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    type="tel"
                    value={settings.phone}
                    onChange={handleInputChange('phone')}
                    placeholder="+1 (555) 123-4567"
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white'
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Divider sx={{ my: 4 }} />

            {/* Preferences Section */}
            <Paper elevation={0} sx={{ p: 4, mb: 4, backgroundColor: 'white' }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Preferences
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Customize your experience.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Preferred Language</InputLabel>
                    <Select
                      value={settings.language}
                      onChange={handleInputChange('language')}
                      label="Preferred Language"
                      sx={{ backgroundColor: 'white' }}
                    >
                      <MenuItem value="English">English</MenuItem>
                      <MenuItem value="Spanish">Spanish</MenuItem>
                      <MenuItem value="French">French</MenuItem>
                      <MenuItem value="Japanese">Japanese</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Time Zone</InputLabel>
                    <Select
                      value={settings.timezone}
                      onChange={handleInputChange('timezone')}
                      label="Time Zone"
                      sx={{ backgroundColor: 'white' }}
                    >
                      <MenuItem value="Pacific Standard Time">Pacific Standard Time</MenuItem>
                      <MenuItem value="Mountain Standard Time">Mountain Standard Time</MenuItem>
                      <MenuItem value="Central Standard Time">Central Standard Time</MenuItem>
                      <MenuItem value="Eastern Standard Time">Eastern Standard Time</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            <Divider sx={{ my: 4 }} />

            {/* Notifications Section */}
            <Paper elevation={0} sx={{ p: 4, mb: 4, backgroundColor: 'white' }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Notifications
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manage how you receive alerts.
              </Typography>

              <Box sx={{ space: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  py: 2
                }}>
                  <Box>
                    <Typography variant="body1" fontWeight="500">
                      Email Notifications
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receive email notifications for new pet matches.
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.emailNotifications}
                        onChange={handleSwitchChange('emailNotifications')}
                        color="primary"
                      />
                    }
                    label=""
                  />
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  py: 2
                }}>
                  <Box>
                    <Typography variant="body1" fontWeight="500">
                      Push Notifications
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receive push notifications on your mobile device.
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.pushNotifications}
                        onChange={handleSwitchChange('pushNotifications')}
                        color="primary"
                      />
                    }
                    label=""
                  />
                </Box>
              </Box>
            </Paper>

            {/* Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: 2,
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'divider'
            }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{ px: 4, py: 1.5 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                sx={{ px: 4, py: 1.5 }}
              >
                Save Changes
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}