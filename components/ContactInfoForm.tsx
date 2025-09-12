'use client';

import { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Paper,
  Grid,
  Switch,
  FormControlLabel
} from '@mui/material';

export default function ContactInfoForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    allowUpdates: true
  });

  const handleChange = (field: string) => (event: any) => {
    const value = field === 'allowUpdates' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Paper elevation={0} sx={{ p: 4, backgroundColor: 'white', border: '1px solid', borderColor: 'grey.200' }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Contact Information
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        How can we reach you with updates about your pet?
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Full Name"
            value={formData.name}
            onChange={handleChange('name')}
            variant="outlined"
            placeholder="Enter your full name"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'grey.50'
              }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            variant="outlined"
            placeholder="your.email@example.com"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'grey.50'
              }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={handleChange('phone')}
            variant="outlined"
            placeholder="+1 (555) 123-4567"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'grey.50'
              }
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.allowUpdates}
                onChange={handleChange('allowUpdates')}
                color="primary"
              />
            }
            label="Allow AI agents to send me real-time search updates"
            sx={{ mt: 1 }}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, p: 2, backgroundColor: 'primary.50', borderRadius: 2 }}>
        <Typography variant="body2" color="primary.main" fontWeight="500">
          💡 Pro tip: We'll only contact you with important updates about your pet search. 
          Your information is kept secure and never shared with third parties.
        </Typography>
      </Box>
    </Paper>
  );
}